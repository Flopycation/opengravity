# OpenGravity

Prototipo de agente personal de Telegram en TypeScript, recuperado del ZIP original. Se han retirado credenciales incrustadas, restringido los usuarios autorizados y desactivado la inicialización automática de servidores MCP externos. El ZIP anterior permanece en el historial: revocar y regenerar las antiguas credenciales de Telegram, Groq y OpenRouter antes de usar el proyecto.

## Uso local

- Node.js 24 LTS. Revisar primero las dependencias y ejecutar `npm ci`.
- Copiar `.env.example` a `.env` y completar el token, los IDs autorizados y el proveedor de lenguaje. Configurar el modelo según el proveedor. Firebase y ElevenLabs son opcionales.
- `npm start` ejecuta el bot con long polling. No ejecutar más de una instancia con el mismo token. La API puede tener costes. Los mensajes y archivos pueden enviarse a proveedores externos según las funciones usadas; SQLite guarda historial local y Firebase puede sincronizarlo si se configura.
- Docker: configuración de referencia no probada. El long polling no es adecuado para funciones serverless como Vercel; no se ha validado su despliegue.

## Estado

Código recuperado y corregido estáticamente; no se han instalado dependencias ni ejecutado pruebas reales de Telegram, IA, audio, PDF, Firebase o Docker. Los conectores MCP históricos se conservan como referencia, pero no se arrancan por defecto. No habilitarlos hasta revisar permisos, dependencias y aislamiento. No publicar datos personales, bases de datos ni secretos.
