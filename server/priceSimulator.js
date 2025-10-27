const symbols = ["BTC", "ETH", "SOL", "ADA", "XRP"];

export function generatePrices() {
  return symbols.map((symbol) => {
    const base = baseForSymbol(symbol);
    // random walk small delta
    const delta = (Math.random() - 0.5) * base * 0.002; // ±0.2%
    const price = +(base + delta).toFixed(2);
    const change = ((delta / base) * 100).toFixed(2);
    return { symbol, price, change: `${change}%`, ts: Date.now() };
  });
}

function baseForSymbol(symbol) {
  switch (symbol) {
    case "BTC":
      return 67000;
    case "ETH":
      return 3100;
    case "SOL":
      return 150;
    case "ADA":
      return 0.45;
    case "XRP":
      return 0.55;
    default:
      return 100;
  }
}

