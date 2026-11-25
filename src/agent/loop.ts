import { invokeLLM } from "./llm.js";
import { executeTool } from "./tools/index.js";
import { Memory } from "./memory.js";
import { RICK_SYSTEM_PROMPT } from "./prompt.js";

const MAX_ITERATIONS = 5;

export async function runAgentLoop(userId: number, userMessage: string, rawContentStr?: string): Promise<string> {
  // Store user prompt as text in history
  await Memory.addMessage(userId, "user", userMessage);

  // Get conversation history (optimized window size for context token efficiency)
  const history = await Memory.getHistory(userId, 8);
  
  const messages: any[] = [
    { role: "system", content: RICK_SYSTEM_PROMPT },
    ...history
  ];
  
  // If we have a raw multimodal block for the LATEST message, override the last text message
  if (rawContentStr) {
    try {
      const parsedContent = JSON.parse(rawContentStr);
      // Ensure the LLM understands it's the latest message
      messages[messages.length - 1] = { role: "user", content: parsedContent };
    } catch(e) {
      console.error("No se pudo parsear el rawContentStr", e);
    }
  }

  let iterations = 0;

  while (iterations < MAX_ITERATIONS) {
    iterations++;
    console.log(`[Agente] Iteración ${iterations} para user ${userId}`);

    const response = await invokeLLM(messages);
    const message = response.choices[0]?.message;
    if (!message) throw new Error("Respuesta vacía del proveedor.");
    
    // Si llama herramientas
    if (message.tool_calls && message.tool_calls.length > 0) {
      messages.push(message);
      
      for (const toolCall of message.tool_calls) {
        const fnName = toolCall.function.name;
        
        
        console.log(`[Agente] LLM invocando herramienta: ${fnName}`);
        
        try {
          const fnArgs = toolCall.function.arguments ? JSON.parse(toolCall.function.arguments) : {};
          const toolResult = await executeTool(fnName, fnArgs);
          
          // Magia cuántica: Si la herramienta devuelve una URL o archivo, forzamos un envío directo
          try {
            const parsedResult = JSON.parse(toolResult);
            // Si es imagen generada, retornamos string URL
            if (fnName === "generate_image" && parsedResult.url) {
                await Memory.addMessage(userId, "assistant", `[SISTEMA INTERNO]: Imagen generada exitosamente. Se le mostró al usuario la URL: ${parsedResult.url}`);
                return parsedResult.url; 
            }
            // Si es audio hablado, retornamos path envuelto en token especial
            if (fnName === "speak_audio" && parsedResult.temp_file_path) {
                await Memory.addMessage(userId, "assistant", `[SISTEMA INTERNO]: Envié nota de voz TTS. Transcripción: "${parsedResult.transcript_read}"`);
                return `FILE_RESPONSE:AUDIO:${parsedResult.temp_file_path}`; 
            }
          } catch(e) {}

          messages.push({
            tool_call_id: toolCall.id,
            role: "tool",
            name: fnName,
            content: toolResult
          });
        } catch (e: any) {
          messages.push({
            tool_call_id: toolCall.id,
            role: "tool",
            name: fnName,
            content: `Error ejecutando ${fnName}.`
          });
        }
      }
    } else {
      // Respuesta final lista
      const content = message.content || "";
      await Memory.addMessage(userId, "assistant", content);
      return content;
    }
  }

  const overflowMessage = "*eructa* M-mira, usuario... $P(\\text{bucle infinito}) \\to 1$. Demasiadas llamadas a herramientas. Destruye este paradigma y prueba de nuevo.";
  await Memory.addMessage(userId, "assistant", overflowMessage);
  return overflowMessage;
}
