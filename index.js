const app = require("./src/app");
const { PORT } = require("./src/config/env");

app.listen(PORT, () => {
  console.log(`AskLedger backend listening on port ${PORT}`);
});
