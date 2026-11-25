import { ElevenLabsClient } from "elevenlabs";
import { ENV } from "../../env.js";
import fs from "fs";
import os from "os";
import path from "path";

const generatedAudioFiles = new Set<string>();
export function consumeGeneratedAudio(filePath: string): boolean {
  return generatedAudioFiles.delete(filePath);
}

const elevenlabs = ENV.ELEVENLABS_API_KEY ? new ElevenLabsClient({ apiKey: ENV.ELEVENLABS_API_KEY }) : null;

export const speakAudioDefinition = {
  type: "function" as const,
  function: {
    name: "speak_audio",
    description: "Genera un audio de voz narrando un texto. ÚSALO SIEMPRE cuando el usuario te pida que le 'hables', le mandes un audio de voz, una nota de voz, o contestes hablando. Redacta el guión que vas a narrar. El bot leerá tus palabras en voz alta.",
    parameters: {
      type: "object",
      properties: {
        transcript: {
          type: "string",
          description: "El guión completo o texto que el bot va a leer en voz alta con entonación de Rick C-137. Mantén el guión corto (menos de 3 oraciones largas)."
        }
      },
      required: ["transcript"],
    },
  },
};

export async function executeSpeakAudio(args: { transcript: string }): Promise<string> {
  if (!elevenlabs) {
    return "Error C-137: No hay una API_KEY de ElevenLabs configurada en el entorno. Dile al usuario que meta ELEVENLABS_API_KEY en el .env antes de pedirme que hable.";
  }

  try {
    // Anthony voice ID (classic narrator): TxGEqn5rm44zmApple
    // Other popular Spanish voices:
    // Rachel: 21m00Tcm4TlvDq8ikWAM
    // Domi: AZnzlpCccpbWAsySGIqP
    const audioStream = await elevenlabs.generate({
      voice: "TxGEqn5rm44zmApple", // Voice ID that sounds like a mature narrator
      text: args.transcript,
      model_id: "eleven_multilingual_v2"
    });

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "opengravity_tts_"));
    const tempFilePath = path.join(tempDir, "audio.mp3");
    
    // Escribir el stream al disco local
    const writeStream = fs.createWriteStream(tempFilePath);
    for await (const chunk of audioStream) {
       writeStream.write(chunk);
    }
    writeStream.end();
    
    // Esperar a que se termine de escribir el archivo
    await new Promise((resolve, reject) => {
        writeStream.on('finish', () => resolve(true));
        writeStream.on('error', reject);
    });

    // Retornamos un JSON para que el agente intercepte la ruta del archivo de audio temporal y lo mande al chat
    generatedAudioFiles.add(tempFilePath);
    return JSON.stringify({
        status: "success",
        message: "El archivo de audio ha sido sintetizado localmente.",
        temp_file_path: tempFilePath,
        transcript_read: args.transcript
    });

  } catch (error: any) {
    console.error("Error de síntesis de audio.");
    return `Error C-137: Fallo el motor de habla. Probablemente ElevenLabs está saturado o te has quedado sin saldo gratis. `;
  }
}
