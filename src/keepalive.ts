import fetch from "node-fetch";

// The interval in milliseconds (e.g. 10 minutes)
const INTERVAL = 10 * 60 * 1000;
const URL = process.env.PING_URL || "http://localhost:8080";

export function startKeepAlive() {
  console.log(`[Keep-Alive] Iniciando latido cuántico cada ${INTERVAL/1000}s hacia ${URL}`);
  setInterval(async () => {
    try {
      const resp = await fetch(URL);
      console.log(`[Keep-Alive] Ping exitoso: ${resp.status}`);
    } catch (e: any) {
      console.error(`[Keep-Alive] Error en el ping: ${e.message}`);
    }
  }, INTERVAL);
}
