import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import FormData from "form-data";
import { ENV } from "../env.js";

export async function transcribeAudio(filePath: string): Promise<string> {
  const url = "https://api.groq.com/openai/v1/audio/transcriptions";
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`El archivo de audio no existe en la dimensión local: ${filePath}`);
  }

  const formData = new FormData();
  formData.append("file", fs.createReadStream(filePath));
  formData.append("model", "whisper-large-v3");
  formData.append("response_format", "json");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${ENV.GROQ_API_KEY}`
    },
    body: formData
  });

  if (!response.ok) {
    console.error("[Whisper Error]", response.status);
    throw new Error(`Fallo de transcripción (HTTP ${response.status})`);
  }

  const data = await response.json() as { text: string };
  return data.text;
}
