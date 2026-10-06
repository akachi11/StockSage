const { FINNHUB_API_KEY } = require("../config/env");

const BASE_URL = "https://finnhub.io/api/v1";

async function finnhubGet(path, params) {
  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set("token", FINNHUB_API_KEY);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Finnhub request failed (${response.status}) for ${path}`);
  }
  return response.json();
}

async function getStockFacts(ticker) {
  const symbol = ticker.toUpperCase();

  const [profile, quote] = await Promise.all([
    finnhubGet("/stock/profile2", { symbol }),
    finnhubGet("/quote", { symbol }),
  ]);

  if (!profile || !profile.name) {
    throw new Error(`No company profile found for ticker "${symbol}" — it may not be a valid stock symbol.`);
  }

  return {
    ticker: symbol,
    name: profile.name,
    exchange: profile.exchange,
    industry: profile.finnhubIndustry,
    ipoDate: profile.ipo,
    marketCapitalization: profile.marketCapitalization,
    currentPrice: quote.c,
    dayChange: quote.d,
    dayChangePercent: quote.dp,
    previousClose: quote.pc,
  };
}

module.exports = { getStockFacts };
