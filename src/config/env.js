require("dotenv").config();

const REQUIRED_VARS = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "GEMINI_API_KEY"];
const PLACEHOLDER_PATTERN = /^your_/i;

for (const key of REQUIRED_VARS) {
  const value = process.env[key];
  if (!value || PLACEHOLDER_PATTERN.test(value)) {
    throw new Error(`Missing or placeholder value for ${key} in .env`);
  }
}

module.exports = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  PORT: process.env.PORT || 3000,
};
