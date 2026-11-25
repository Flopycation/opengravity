import assert from "node:assert/strict";
process.env.TELEGRAM_BOT_TOKEN = "test-only";
process.env.TELEGRAM_ALLOWED_USER_IDS = "1,2";
process.env.GROQ_API_KEY = "test-only";
process.env.OPENROUTER_API_KEY = "";
process.env.GOOGLE_APPLICATION_CREDENTIALS = "";
process.env.DB_PATH = ":memory:";
const { Memory, initMemory, closeMemory } = await import("../src/agent/memory.js");
try {
  await initMemory();
  await Memory.addMessage(1, "user", "uno");
  await Memory.addMessage(2, "user", "privado");
  await Memory.addMessage(1, "assistant", "dos");
  assert.deepEqual(await Memory.getHistory(1), [
    { role: "user", content: "uno" }, { role: "assistant", content: "dos" }
  ]);
  assert.deepEqual(await Memory.getHistory(1, 1), [{ role: "assistant", content: "dos" }]);
  await Memory.clearHistory(1);
  assert.deepEqual(await Memory.getHistory(1), []);
  assert.deepEqual(await Memory.getHistory(2), [{ role: "user", content: "privado" }]);
  console.log("SQLite: escritura, orden, límite, aislamiento y borrado correctos.");
} finally {
  await closeMemory();
}
