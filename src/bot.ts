import { Bot } from "grammy";
import { hydrateFiles, FileApiFlavor, FileFlavor } from "@grammyjs/files";
import { ENV } from "./env.js";
import { runAgentLoop } from "./agent/loop.js";
import { Memory } from "./agent/memory.js";
import { transcribeAudio } from "./agent/audio.js";
import fs from "fs";
import os from "os";
import path from "path";
import { PDFParse } from "pdf-parse";
import { consumeGeneratedAudio } from "./agent/tools/speak_audio.js";

export type BotContext = FileFlavor<any>;
export const bot = new Bot<BotContext, FileApiFlavor<any>>(ENV.TELEGRAM_BOT_TOKEN);
bot.api.config.use(hydrateFiles(bot.token));

bot.use(async (ctx, next) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  
  if (!ENV.TELEGRAM_ALLOWED_USER_IDS.includes(userId)) {
    console.log("[Auth] Acceso no autorizado bloqueado.");
    return;
  }
  
  await next();
});

bot.command("start", async (ctx) => {
  await ctx.reply("*eructa* E-escucha, usuario. Ya estoy aquí. No sé qué basura $N$-dimensional quieres, pero habla de una vez. Y que sea rápido.", { parse_mode: "Markdown" });
});

bot.command("clear", async (ctx) => {
  if (ctx.from?.id) {
    await Memory.clearHistory(ctx.from.id);
    await ctx.reply("He borrado tu miserable historial, usuario. Menos entropía de la que preocuparme.");
  }
});

bot.on("message:text", async (ctx) => {
  const userId = ctx.from.id;
  await ctx.replyWithChatAction("typing");
  
  try {
    const replyText = await runAgentLoop(userId, ctx.message.text);
    
    // Si la respuesta es una URL directa (Pollinations genera una URL), enviarla como foto
    if (replyText.startsWith("https://image.pollinations.ai/")) {
      await ctx.replyWithPhoto(replyText, { caption: "Toma tu asquerosa foto generada, parásito." });
      return;
    }

    // Si es un audio devuelto por elevenlabs
    if (replyText.startsWith("FILE_RESPONSE:AUDIO:")) {
      const audioPath = replyText.replace("FILE_RESPONSE:AUDIO:", "");
      if (consumeGeneratedAudio(audioPath) && fs.existsSync(audioPath)) {
          const { InputFile } = await import("grammy");
          try { await ctx.replyWithVoice(new InputFile(audioPath)); }
          finally { fs.rmSync(path.dirname(audioPath), { recursive: true, force: true }); }
          return;
      }
    }

    try {
        await ctx.reply(replyText.slice(0, 4000), { parse_mode: "Markdown" });
    } catch {
        await ctx.reply(replyText.slice(0, 4000));
    }
  } catch (error: any) {
    console.error("Error procesando mensaje.");
    await ctx.reply("No se pudo procesar el mensaje.");
  }
});

bot.on(["message:voice", "message:audio"], async (ctx) => {
  const userId = ctx.from.id;
  await ctx.replyWithChatAction("typing");
  
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "opengravity_audio_"));
  try {
    const file = await ctx.getFile();
    if ((file.file_size || 0) > 15 * 1024 * 1024) { await ctx.reply("Audio demasiado grande."); return; }
    const tempFilePath = path.join(dir, "audio.ogg");
    await file.download(tempFilePath);
    
    // Transcribir en Groq
    const transcription = await transcribeAudio(tempFilePath);
    
    // Borrar basura temporal
    fs.unlinkSync(tempFilePath);
    
    if (!transcription || transcription.trim() === "") {
        await ctx.reply("*eructa* M-mira, genio. O tienes el micro roto, o murmuraste como un idiota. No he entendido absolutamente nada de ese puto ruido blanco.");
        return;
    }
    
    // Tratar la transcripción como si fuera un mensaje de texto normal
    const replyText = await runAgentLoop(userId, `(Transcripción de audio): ${transcription}`);
    
    try {
        await ctx.reply(replyText.slice(0, 4000), { parse_mode: "Markdown" });
    } catch {
        await ctx.reply(replyText.slice(0, 4000));
    }
    
  } catch (error: any) {
    console.error("Error procesando audio.");
    await ctx.reply("No se pudo procesar el audio.");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

bot.on("message:photo", async (ctx) => {
  const userId = ctx.from.id;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "opengravity_photo_"));
  try {
    await ctx.replyWithChatAction("typing");
    const file = await ctx.getFile();
    if ((file.file_size || 0) > 10 * 1024 * 1024) {
      await ctx.reply("Imagen demasiado grande.");
      return;
    }
    const local = path.join(dir, "photo.jpg");
    await file.download(local);
    if (fs.statSync(local).size > 10 * 1024 * 1024) {
      await ctx.reply("Imagen demasiado grande.");
      return;
    }
    const caption = ctx.message.caption || "Describe esta imagen.";
    const image = "data:image/jpeg;base64," + fs.readFileSync(local).toString("base64");
    const specialPrompt = JSON.stringify([
      { type: "text", text: caption },
      { type: "image_url", image_url: { url: image } }
    ]);
    const replyText = await runAgentLoop(userId, "(El usuario envió una imagen): " + caption, specialPrompt);
    await ctx.reply(replyText.slice(0, 4000));
  } catch {
    console.error("Error procesando foto.");
    await ctx.reply("No se pudo procesar la imagen.");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

bot.on("message:document", async (ctx) => {
  const userId = ctx.from.id;
  await ctx.replyWithChatAction("typing");
  
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "opengravity_doc_"));
  try {
    const document = ctx.message.document;
    if ((document.file_size || 0) > 15 * 1024 * 1024) { await ctx.reply("Documento demasiado grande."); return; }
    const file = await ctx.getFile();
    const tempFilePath = path.join(dir, "document");
    await file.download(tempFilePath);
    
    let extractedText = "";
    
    // Si es un PDF, usamos pdf-parse
    if (document.mime_type === "application/pdf") {
      const dataBuffer = fs.readFileSync(tempFilePath);
      const parser = new PDFParse({ data: dataBuffer });
      try { extractedText = (await parser.getText()).text; }
      finally { await parser.destroy(); }
    } 
    // Si es un TXT, JSON o Markdown, lo leemos tal cual
    else if (document.mime_type?.startsWith("text/") || document.file_name?.endsWith(".md") || document.file_name?.endsWith(".json")) {
      extractedText = fs.readFileSync(tempFilePath, 'utf8');
    } else {
      fs.unlinkSync(tempFilePath);
      await ctx.reply(`*eructa* Y yo qué cojones hago con un archivo \`${document.mime_type || 'desconocido'}\`. Mándame un PDF o un puto TXT si quieres que lea algo por ti, analfabeto.`);
      return;
    }
    
    fs.unlinkSync(tempFilePath);
    
    if (!extractedText || extractedText.trim() === "") {
        await ctx.reply("*murmura* Este pergamino de mierda está vacío. Igual de vacío que tu cabeza.");
        return;
    }

    const captionContext = ctx.message.caption ? ` Contexto del usuario: "${ctx.message.caption}"` : "";
    const promptLimitado = `(El usuario envió un documento llamado ${document.file_name}.${captionContext} Contenido extraído del documento a continuación):\n\n${extractedText.substring(0, 15000)}`; // limitamos a ~15k caracteres para no petar tokens gratis

    const replyText = await runAgentLoop(userId, promptLimitado);
    
    try {
        await ctx.reply(replyText.slice(0, 4000), { parse_mode: "Markdown" });
    } catch {
        await ctx.reply(replyText.slice(0, 4000));
    }
    
  } catch (error: any) {
    console.error("Error procesando documento.");
    await ctx.reply("No se pudo procesar el documento.");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
