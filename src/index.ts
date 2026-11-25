import { bot } from "./bot.js";
import { initMemory } from "./agent/memory.js";
import express from "express";

// Configurar Express para la nube (Render, Koyeb, Railway, etc.)
const app = express();
const PORT = process.env.PORT || 8080;

app.get("/", (req, res) => {
  res.send("*eructa* M-mira, el bot está vivo y coleando. Tu asqueroso ping ha funcionado.");
});

app.listen(PORT, () => {
  console.log(`Servidor HTTP cutre escuchando en el puerto ${PORT} para engañar a la nube.`);
});

console.log("Iniciando conectores cuánticos y base de datos...");
import { startKeepAlive } from "./keepalive.js";

// MCP externos desactivados hasta una revisión independiente de permisos y dependencias.
await initMemory();

// Arrancamos el latido para que la puta nube no se duerma
startKeepAlive();

console.log("Iniciando OpenGravity... *eructa*");
bot.start({
  onStart: (botInfo) => {
    console.log(`Bot @${botInfo.username} en línea y preparado para insultar a usuario.`);
  }
});
