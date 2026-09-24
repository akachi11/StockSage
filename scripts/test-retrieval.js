const { retrieveRelevantChunks } = require("../src/lib/retrieval");

async function run() {
  const question = process.argv.slice(2).join(" ");
  if (!question) {
    console.error('Usage: npm run retrieve -- "your question here"');
    process.exit(1);
  }

  console.log(`Question: ${question}\n`);
  const results = await retrieveRelevantChunks(question);

  results.forEach((row, i) => {
    console.log(`${i + 1}. [${row.ticker}] similarity=${row.similarity.toFixed(3)}`);
    console.log(`   ${row.content}\n`);
  });
}

run().catch((error) => {
  console.error("Retrieval failed:", error.message || error);
  process.exit(1);
});
