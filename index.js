const app = require("./src/app");
const { PORT } = require("./src/config/env");
const { resetDatabase } = require("./src/lib/resetDatabase");

async function start() {
  console.log("Resetting asset data for a fresh session...");
  await resetDatabase();
  console.log("Asset data cleared.");

  app.listen(PORT, () => {
    console.log(`AskLedger backend listening on port ${PORT}`);
  });
}

start().catch((error) => {
  console.error("Failed to start server:", error.message || error);
  process.exit(1);
});
