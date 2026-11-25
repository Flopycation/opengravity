import sqlite3 from 'sqlite3';
import { open, Database as SQLiteDatabase, Statement } from 'sqlite';
import admin from "firebase-admin";
import fs from "fs";
import { ENV } from "../env.js";

let sqlDb: SQLiteDatabase | null = null;
let sqlInsertStmt: Statement | null = null;
let sqlSelectStmt: Statement | null = null;

let fbDb: admin.firestore.Firestore | null = null;

// Initialize both DBs asynchronously
export async function initMemory() {
  // 1. Initialize SQLite (Velocidad local)
  if (!sqlDb) {
    sqlDb = await open({
      filename: ENV.DB_PATH,
      driver: sqlite3.Database
    });

    await sqlDb.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    sqlInsertStmt = await sqlDb.prepare(`INSERT INTO messages (user_id, role, content) VALUES (?, ?, ?)`);
    sqlSelectStmt = await sqlDb.prepare(`
      SELECT role, content FROM (
        SELECT id, role, content FROM messages 
        WHERE user_id = ? 
        ORDER BY id DESC LIMIT ?
      ) ORDER BY id ASC
    `);
  }

  // 2. Initialize Firebase (Persistencia en nube)
  if (!fbDb) {
    if (admin.apps.length > 0) {
      fbDb = admin.firestore();
    } else {
      const credPath = ENV.GOOGLE_APPLICATION_CREDENTIALS;
      if (fs.existsSync(credPath)) {
        admin.initializeApp({
          credential: admin.credential.cert(credPath)
        });
        fbDb = admin.firestore();
        console.log("Conectores cuánticos encriptados hacia Firebase alineados con tu patético SQLite local. *eructa*");
      } else {
        console.warn(`[WARNING] No se encontró credencial en '${credPath}'. El bot funcionará solo con SQLite, pedazo de inútil.`);
      }
    }
  }
}

export const Memory = {
  async addMessage(userId: number, role: "user" | "assistant" | "system", content: string) {
    if (!sqlInsertStmt) await initMemory();
    
    // 1. Guardado ultra-rápido en SQLite local
    const sqlPromise = sqlInsertStmt!.run([userId, role, content]).catch(e => {
        console.error("Error crítico guardando en la basura de SQLite:", e);
    });

    // 2. Sincronización asíncrona a Firebase en segundo plano (fire-and-forget)
    if (fbDb) {
      const fbPromise = fbDb.collection("users").doc(userId.toString())
        .collection("messages")
        .add({
          role,
          content,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        }).catch(e => {
          console.error("Error crítico de red subiendo a Firebase:", e);
        });
        
      // Esperamos a ambas inserciones para evitar inconsistencias gordas en el mismo tick
      await Promise.all([sqlPromise, fbPromise]);
    } else {
      await sqlPromise;
    }
  },
  
  async getHistory(userId: number, limit: number = 20) {
    if (!sqlSelectStmt) await initMemory();
    
    // 3. Lectura ultra-rápida desde SQLite (La caché prevalece por pura termodinámica)
    // No molestamos a Firebase para el puto contexto a menos que SQLite estuviera vacío (aunque no lo programaremos aquí asumiendo que el bot principal graba en ambos a la vez)
    const rows = await sqlSelectStmt!.all([userId, limit]);
    return rows as { role: "user" | "assistant" | "system", content: string }[];
  },
  
  async clearHistory(userId: number) {
    if (!sqlDb) await initMemory();
    
    // 4. Purga mutua
    const sqlPromise = sqlDb!.run(`DELETE FROM messages WHERE user_id = ?`, [userId]);
    
    if (fbDb) {
      const snapshot = await fbDb.collection("users").doc(userId.toString())
        .collection("messages")
        .get();
        
      if (!snapshot.empty) {
        await sqlPromise;
        for (let i = 0; i < snapshot.docs.length; i += 400) {
          const batch = fbDb.batch();
          snapshot.docs.slice(i, i + 400).forEach(doc => batch.delete(doc.ref));
          await batch.commit();
        }
        return;
      }
    }
    
    await sqlPromise;
  }
};

export async function closeMemory() {
  if (sqlInsertStmt) await sqlInsertStmt.finalize();
  if (sqlSelectStmt) await sqlSelectStmt.finalize();
  if (sqlDb) await sqlDb.close();
  sqlInsertStmt = null;
  sqlSelectStmt = null;
  sqlDb = null;
}
