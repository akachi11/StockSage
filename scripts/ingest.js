const fs = require("fs");
const path = require("path");
const { supabase } = require("../src/lib/supabaseClient");
const { embedText, TaskType } = require("../src/lib/gemini");
const { chunkText } = require("../src/lib/chunker");

const SEED_PATH = path.join(__dirname, "..", "data", "assets.seed.json");
const EMBED_DELAY_MS = 150;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildDocuments(asset) {
  const overview = `${asset.name} (${asset.ticker}) is a ${asset.asset_type} in the ${asset.sector} sector. ${asset.description}`;
  const stats = `${asset.name} (${asset.ticker}) currently trades at $${asset.current_price}, with year-to-date performance of ${asset.performance_ytd}% and a risk level of ${asset.risk_level}.`;
  return [overview, stats];
}

async function upsertAsset(asset) {
  const { data: existing, error: findError } = await supabase
    .from("assets")
    .select("id")
    .eq("ticker", asset.ticker)
    .maybeSingle();
  if (findError) throw findError;

  const payload = {
    name: asset.name,
    ticker: asset.ticker,
    sector: asset.sector,
    description: asset.description,
    asset_type: asset.asset_type,
    current_price: asset.current_price,
    performance_ytd: asset.performance_ytd,
    risk_level: asset.risk_level,
  };

  if (existing) {
    const { error: updateError } = await supabase
      .from("assets")
      .update(payload)
      .eq("id", existing.id);
    if (updateError) throw updateError;
    return existing.id;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("assets")
    .insert(payload)
    .select("id")
    .single();
  if (insertError) throw insertError;
  return inserted.id;
}

async function replaceChunks(assetId, chunks) {
  const { error: deleteError } = await supabase
    .from("asset_chunks")
    .delete()
    .eq("asset_id", assetId);
  if (deleteError) throw deleteError;

  for (const content of chunks) {
    const embedding = await embedText(content, TaskType.RETRIEVAL_DOCUMENT);
    const { error: insertError } = await supabase
      .from("asset_chunks")
      .insert({ asset_id: assetId, content, embedding });
    if (insertError) throw insertError;
    await sleep(EMBED_DELAY_MS);
  }
}

async function run() {
  const assets = JSON.parse(fs.readFileSync(SEED_PATH, "utf-8"));
  console.log(`Loaded ${assets.length} asset(s) from seed file.`);

  for (const asset of assets) {
    console.log(`\nProcessing ${asset.ticker} - ${asset.name}`);
    const assetId = await upsertAsset(asset);

    const chunks = buildDocuments(asset).flatMap((doc) => chunkText(doc));
    await replaceChunks(assetId, chunks);

    console.log(`  -> ${chunks.length} chunk(s) embedded and stored.`);
  }

  console.log("\nIngestion complete.");
}

run().catch((error) => {
  console.error("Ingestion failed:", error.message || error);
  process.exit(1);
});
