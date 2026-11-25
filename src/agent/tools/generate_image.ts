export const generateImageDefinition = {
  type: "function" as const,
  function: {
    name: "generate_image",
    description: "Genera una imagen basada en una descripción de texto y devuelve la URL terminada. Úsala estrictamente cuando usuario te pida 'crear', 'dibujar' o 'generar' una imagen.",
    parameters: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "Descripción detallada en inglés de lo que quieres que aparezca en la imagen."
        }
      },
      required: ["prompt"],
    },
  },
};

export async function executeGenerateImage(args: { prompt: string }): Promise<string> {
  const seed = Math.floor(Math.random() * 10000000);
  const encodedPrompt = encodeURIComponent(args.prompt);
  const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?seed=${seed}&width=1024&height=1024&nologo=true`;
  
  // No descargamos la imagen nosotros, simplemente le decimos al LLM la URL que el bot enviará a Telegram
  return JSON.stringify({
    status: "success",
    message: "La imagen ha sido generada.",
    url: imageUrl
  });
}
