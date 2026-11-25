export const getCurrentTimeDefinition = {
  type: "function" as const,
  function: {
    name: "get_current_time",
    description: "Obtiene la fecha y hora actual en la ubicación del bot (y de usuario si asumes huso horario de España). Úsalo si te preguntan la hora actual.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
};

export function executeGetCurrentTime(): string {
  const date = new Date();
  return date.toISOString();
}
