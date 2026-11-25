import { config } from "dotenv";
config();

const allowedIds = (process.env.TELEGRAM_ALLOWED_USER_IDS || "").split(",")
  .map(id => id.trim()).filter(id => /^\d+$/.test(id)).map(Number)
  .filter(id => Number.isSafeInteger(id) && id > 0);

export const ENV = {
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || "",
  TELEGRAM_ALLOWED_USER_IDS: allowedIds,
  GROQ_API_KEY: process.env.GROQ_API_KEY || "",
  GROQ_MODEL: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || "",
  OPENROUTER_MODEL: process.env.OPENROUTER_MODEL || "",
  GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS || "",
  DB_PATH: process.env.DB_PATH || "memory.db",
  ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY || "",
};

if (!ENV.TELEGRAM_BOT_TOKEN || allowedIds.length === 0) {
  throw new Error("Configura el token y al menos un ID autorizado de Telegram.");
}
if (!ENV.GROQ_API_KEY && !ENV.OPENROUTER_API_KEY) {
  throw new Error("Configura un proveedor de lenguaje.");
}
if (ENV.OPENROUTER_API_KEY && !ENV.OPENROUTER_MODEL) {
  throw new Error("Configura OPENROUTER_MODEL.");
}
