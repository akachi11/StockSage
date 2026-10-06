const { GoogleGenerativeAI, SchemaType } = require("@google/generative-ai");
const { GEMINI_API_KEY } = require("../config/env");
const { supabase } = require("./supabaseClient");
const { embedText, TaskType } = require("./gemini");
const { chunkText } = require("./chunker");
const { getStockFacts } = require("./finnhub");
const { CHAT_MODEL } = require("./chat");

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const TOPIC_KEYS = [
  "business_model",
  "growth_drivers",
  "risks",
  "investor_suitability",
  "portfolio_role",
  "history",
];

const TOPIC_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    risk_level: { type: SchemaType.STRING, format: "enum", enum: ["low", "moderate", "high"] },
    overview: { type: SchemaType.STRING, description: "2-3 sentence factual overview of what the company does." },
    business_model: { type: SchemaType.STRING },
    growth_drivers: { type: SchemaType.STRING },
    risks: { type: SchemaType.STRING },
    investor_suitability: { type: SchemaType.STRING },
    portfolio_role: {
      type: SchemaType.STRING,
      description: "How this type of asset is typically used within a diversified portfolio.",
    },
    history: { type: SchemaType.STRING },
  },
  required: ["risk_level", "overview", ...TOPIC_KEYS],
};

async function synthesizeTopics(facts) {
  const model = genAI.getGenerativeModel({
    model: CHAT_MODEL,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: TOPIC_SCHEMA,
    },
  });

  const prompt = `You are writing structured research content about a publicly traded asset for an investment education tool.
Base every claim only on the real facts below — never invent numbers that aren't given here. Classify its overall risk_level as "low", "moderate", or "high" based on its sector, price volatility, and market cap. Write every other field as 2-4 plain, factual sentences.

Facts:
${JSON.stringify(facts, null, 2)}`;

  const result = await model.generateContent(prompt);
  return JSON.parse(result.response.text());
}

function buildDocuments(facts, topics) {
  const overview = `${facts.name} (${facts.ticker}) — ${topics.overview}`;

  const direction = facts.dayChangePercent >= 0 ? "up" : "down";
  const stats = `${facts.name} (${facts.ticker}) is currently trading at $${facts.currentPrice} on ${facts.exchange}, ${direction} ${Math.abs(
    facts.dayChangePercent
  ).toFixed(2)}% today. It has a market capitalization of approximately $${Math.round(
    facts.marketCapitalization
  )}M and is classified as ${topics.risk_level} risk.`;

  const topicDocs = TOPIC_KEYS.map((key) => `${facts.name} (${facts.ticker}): ${topics[key]}`);

  return [overview, stats, ...topicDocs];
}

async function upsertAsset(facts, riskLevel) {
  const { data: existing, error: findError } = await supabase
    .from("assets")
    .select("id")
    .eq("ticker", facts.ticker)
    .maybeSingle();
  if (findError) throw findError;

  const payload = {
    name: facts.name,
    ticker: facts.ticker,
    sector: facts.industry,
    asset_type: "stock",
    current_price: facts.currentPrice,
    performance_ytd: facts.dayChangePercent,
    risk_level: riskLevel,
  };

  if (existing) {
    const { error: updateError } = await supabase.from("assets").update(payload).eq("id", existing.id);
    if (updateError) throw updateError;
    return existing.id;
  }

  const { data: inserted, error: insertError } = await supabase.from("assets").insert(payload).select("id").single();
  if (insertError) throw insertError;
  return inserted.id;
}

async function replaceChunks(assetId, chunks) {
  const { error: deleteError } = await supabase.from("asset_chunks").delete().eq("asset_id", assetId);
  if (deleteError) throw deleteError;

  for (const content of chunks) {
    const embedding = await embedText(content, TaskType.RETRIEVAL_DOCUMENT);
    const { error: insertError } = await supabase.from("asset_chunks").insert({ asset_id: assetId, content, embedding });
    if (insertError) throw insertError;
  }
}

async function isAlreadySeeded(ticker) {
  const { data, error } = await supabase.from("assets").select("id").eq("ticker", ticker).maybeSingle();
  if (error) throw error;
  if (!data) return false;

  const { count, error: countError } = await supabase
    .from("asset_chunks")
    .select("id", { count: "exact", head: true })
    .eq("asset_id", data.id);
  if (countError) throw countError;

  return (count || 0) > 0;
}

async function seedAsset(ticker) {
  const symbol = ticker.toUpperCase();

  if (await isAlreadySeeded(symbol)) {
    return { ticker: symbol, alreadySeeded: true };
  }

  const facts = await getStockFacts(symbol);
  const topics = await synthesizeTopics(facts);
  const documents = buildDocuments(facts, topics).flatMap((doc) => chunkText(doc));

  const assetId = await upsertAsset(facts, topics.risk_level);
  await replaceChunks(assetId, documents);

  return { ticker: symbol, alreadySeeded: false, chunkCount: documents.length, riskLevel: topics.risk_level };
}

module.exports = { seedAsset };
