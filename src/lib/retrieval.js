const { supabase } = require("./supabaseClient");
const { embedText, TaskType } = require("./gemini");

async function retrieveRelevantChunks(question, { matchCount = 5, ticker = null } = {}) {
  const queryEmbedding = await embedText(question, TaskType.RETRIEVAL_QUERY);

  const { data, error } = await supabase.rpc("match_asset_chunks", {
    query_embedding: queryEmbedding,
    match_count: matchCount,
    filter_ticker: ticker ? ticker.toUpperCase() : null,
  });

  if (error) throw error;
  return data;
}

module.exports = { retrieveRelevantChunks };
