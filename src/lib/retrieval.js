const { supabase } = require("./supabaseClient");
const { embedText, TaskType } = require("./gemini");

async function retrieveRelevantChunks(question, matchCount = 5) {
  const queryEmbedding = await embedText(question, TaskType.RETRIEVAL_QUERY);

  const { data, error } = await supabase.rpc("match_asset_chunks", {
    query_embedding: queryEmbedding,
    match_count: matchCount,
  });

  if (error) throw error;
  return data;
}

module.exports = { retrieveRelevantChunks };
