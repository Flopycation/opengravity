import { getCurrentTimeDefinition, executeGetCurrentTime } from "./get_current_time.js";
import { generateImageDefinition, executeGenerateImage } from "./generate_image.js";
import { speakAudioDefinition, executeSpeakAudio } from "./speak_audio.js";

import { mcpManager } from "../mcp.js";

export const localToolsDefinitions = [
  getCurrentTimeDefinition,
  generateImageDefinition,
  speakAudioDefinition
];

export const getAllTools = () => {
  return [
    ...localToolsDefinitions,
    ...mcpManager.getTools()
  ];
};

export const executeTool = async (name: string, args: any): Promise<string> => {
  if (name.startsWith("mcp_")) {
    return await mcpManager.executeTool(name, args);
  }

  switch (name) {
    case "get_current_time":
      return executeGetCurrentTime();
    case "generate_image":
      return await executeGenerateImage(args);
    case "speak_audio":
      return await executeSpeakAudio(args);
    default:
      throw new Error(`Tool no especificada: ${name}`);
  }
};
