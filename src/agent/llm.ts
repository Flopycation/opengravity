import Groq from "groq-sdk";
import OpenAI from "openai";
import { ENV } from "../env.js";
import { getAllTools } from "./tools/index.js";

const groq = ENV.GROQ_API_KEY ? new Groq({ apiKey: ENV.GROQ_API_KEY, timeout: 30000, maxRetries: 0 }) : null;
const openrouter = ENV.OPENROUTER_API_KEY ? new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: ENV.OPENROUTER_API_KEY,
  timeout: 30000,
  maxRetries: 0,
  defaultHeaders: {
    "HTTP-Referer": "https://github.com/flopy/opengravity", 
    "X-Title": "OpenGravity",
  }
}) : null;

export async function invokeLLM(messages: any[], useTools: boolean = true) {
  const toolsInfo = useTools ? getAllTools() : undefined;
  
  // Detectar si el array de messages contiene algún objeto de tipo image_url en el content 
  // (porque Groq Llama3 puro texto explota si le pasas blobs de visión en algunos endpoints)
  const isMultimodal = messages.some(msg => 
    Array.isArray(msg.content) && msg.content.some((c: any) => c.type === "image_url")
  );
  
  try {
    // Si es multimodal, o no hay groq, FORZAMOS openrouter
    if ((isMultimodal || !groq) && openrouter) {
      return await openrouter.chat.completions.create({
        model: ENV.OPENROUTER_MODEL, // Para visión se espera que OPENROUTER_MODEL apunte a google/gemini-2.5-flash-free u otro modelo multimodal!
        messages,
        ...(toolsInfo?.length ? { tools: toolsInfo as any, tool_choice: "auto" as const } : {}),
        max_tokens: 1024,
        temperature: 0.7,
      });
    } else if (groq && !isMultimodal) {
      return await groq.chat.completions.create({
        model: ENV.GROQ_MODEL,
        messages,
        ...(toolsInfo?.length ? { tools: toolsInfo as any, tool_choice: "auto" as const } : {}),
        max_tokens: 1024,
        temperature: 0.7,
      });
    } else if (openrouter) {
      return await openrouter.chat.completions.create({
        model: ENV.OPENROUTER_MODEL,
        messages,
        ...(toolsInfo?.length ? { tools: toolsInfo as any, tool_choice: "auto" as const } : {}),
        max_tokens: 1024,
        temperature: 0.7,
      });
    } else {
        throw new Error("No hay API keys configuradas (ni GROQ ni OPENROUTER)");
    }
  } catch (err) {
      console.error("Error invocando el proveedor de lenguaje.");
      throw err;
  }
}
