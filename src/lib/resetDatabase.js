const { supabase } = require("./supabaseClient");

const NIL_UUID = "00000000-0000-0000-0000-000000000000";

async function resetDatabase() {
  const { error: chunksError } = await supabase.from("asset_chunks").delete().neq("id", NIL_UUID);
  if (chunksError) throw chunksError;

  const { error: assetsError } = await supabase.from("assets").delete().neq("id", NIL_UUID);
  if (assetsError) throw assetsError;
}

module.exports = { resetDatabase };
