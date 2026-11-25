import { bot } from "./bot.js";
import { initMemory } from "./agent/memory.js";
import express from "express";

const app = express();
const port = Number(process.env.PORT || 8080);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT inválido.");
let ready = false;
app.get("/", (_req, res) => res.status(ready ? 200 : 503).send(ready ? "OpenGravity listo." : "OpenGravity iniciando."));
await initMemory();
const server = app.listen(port);
bot.catch(() => console.error("Error procesando actualización de Telegram."));
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => { ready = false; server.close(); if (bot.isRunning()) void bot.stop(); });
}
try {
  await bot.start({ onStart: () => { ready = true; console.log("Bot listo."); } });
} finally {
  ready = false;
  server.close();
}
