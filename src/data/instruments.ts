import { Candle, InstrumentMeta, Timeframe } from '../types/terminal';

export const INSTRUMENTS: InstrumentMeta[] = [
  // US Equities (10)
  {
    symbol: 'NVDA',
    name: 'NVIDIA Corp.',
    assetClass: 'Equities',
    sector: 'Semiconductors',
    exchange: 'NASDAQ',
    basePrice: 142.85,
    precision: 2,
    tickSize: 0.01,
    spreadBps: 1.5,
    volatility: 0.0028,
    baseVolume24h: 48_920_000,
    marketCapWeight: 3510,
    badgeColor: '#089981',
    unitLabel: 'Shares',
    qtyStep: 1,
  },
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    assetClass: 'Equities',
    sector: 'Big Tech',
    exchange: 'NASDAQ',
    basePrice: 234.60,
    precision: 2,
    tickSize: 0.01,
    spreadBps: 1.0,
    volatility: 0.0014,
    baseVolume24h: 39_410_000,
    marketCapWeight: 3560,
    badgeColor: '#6B7280',
    unitLabel: 'Shares',
    qtyStep: 1,
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft Corp.',
    assetClass: 'Equities',
    sector: 'Big Tech',
    exchange: 'NASDAQ',
    basePrice: 428.40,
    precision: 2,
    tickSize: 0.01,
    spreadBps: 1.0,
    volatility: 0.0015,
    baseVolume24h: 21_150_000,
    marketCapWeight: 3180,
    badgeColor: '#2962FF',
    unitLabel: 'Shares',
    qtyStep: 1,
  },
  {
    symbol: 'AMZN',
    name: 'Amazon.com Inc.',
    assetClass: 'Equities',
    sector: 'Big Tech',
    exchange: 'NASDAQ',
    basePrice: 212.30,
    precision: 2,
    tickSize: 0.01,
    spreadBps: 1.2,
    volatility: 0.0019,
    baseVolume24h: 34_800_000,
    marketCapWeight: 2230,
    badgeColor: '#D97706',
    unitLabel: 'Shares',
    qtyStep: 1,
  },
  {
    symbol: 'META',
    name: 'Meta Platforms',
    assetClass: 'Equities',
    sector: 'Big Tech',
    exchange: 'NASDAQ',
    basePrice: 594.20,
    precision: 2,
    tickSize: 0.01,
    spreadBps: 1.4,
    volatility: 0.0022,
    baseVolume24h: 14_230_000,
    marketCapWeight: 1500,
    badgeColor: '#2563EB',
    unitLabel: 'Shares',
    qtyStep: 1,
  },
  {
    symbol: 'TSLA',
    name: 'Tesla Inc.',
    assetClass: 'Equities',
    sector: 'Auto & Energy',
    exchange: 'NASDAQ',
    basePrice: 346.90,
    precision: 2,
    tickSize: 0.01,
    spreadBps: 1.8,
    volatility: 0.0036,
    baseVolume24h: 72_600_000,
    marketCapWeight: 1110,
    badgeColor: '#F23645',
    unitLabel: 'Shares',
    qtyStep: 1,
  },
  {
    symbol: 'AMD',
    name: 'Advanced Micro Devices',
    assetClass: 'Equities',
    sector: 'Semiconductors',
    exchange: 'NASDAQ',
    basePrice: 158.15,
    precision: 2,
    tickSize: 0.01,
    spreadBps: 1.6,
    volatility: 0.0030,
    baseVolume24h: 41_300_000,
    marketCapWeight: 256,
    badgeColor: '#059669',
    unitLabel: 'Shares',
    qtyStep: 1,
  },
  {
    symbol: 'JPM',
    name: 'JPMorgan Chase',
    assetClass: 'Equities',
    sector: 'Financials',
    exchange: 'NYSE',
    basePrice: 244.75,
    precision: 2,
    tickSize: 0.01,
    spreadBps: 1.2,
    volatility: 0.0014,
    baseVolume24h: 9_840_000,
    marketCapWeight: 690,
    badgeColor: '#3B82F6',
    unitLabel: 'Shares',
    qtyStep: 1,
  },
  {
    symbol: 'PLTR',
    name: 'Palantir Technologies',
    assetClass: 'Equities',
    sector: 'Software & AI',
    exchange: 'NASDAQ',
    basePrice: 64.40,
    precision: 2,
    tickSize: 0.01,
    spreadBps: 2.0,
    volatility: 0.0041,
    baseVolume24h: 58_100_000,
    marketCapWeight: 146,
    badgeColor: '#6366F1',
    unitLabel: 'Shares',
    qtyStep: 1,
  },
  {
    symbol: 'SPY',
    name: 'SPDR S&P 500 ETF',
    assetClass: 'Equities',
    sector: 'Index ETFs',
    exchange: 'ARCA',
    basePrice: 601.50,
    precision: 2,
    tickSize: 0.01,
    spreadBps: 0.5,
    volatility: 0.0009,
    baseVolume24h: 52_400_000,
    marketCapWeight: 630,
    badgeColor: '#0EA5E9',
    unitLabel: 'Shares',
    qtyStep: 1,
  },

  // Crypto (5)
  {
    symbol: 'BTCUSD',
    name: 'Bitcoin / US Dollar',
    assetClass: 'Crypto',
    sector: 'Layer 1',
    exchange: 'SPOT',
    basePrice: 96_420.50,
    precision: 2,
    tickSize: 0.5,
    spreadBps: 1.8,
    volatility: 0.0032,
    baseVolume24h: 31_400_000,
    marketCapWeight: 1910,
    badgeColor: '#F59E0B',
    unitLabel: 'BTC',
    qtyStep: 0.01,
  },
  {
    symbol: 'ETHUSD',
    name: 'Ethereum / US Dollar',
    assetClass: 'Crypto',
    sector: 'Layer 1',
    exchange: 'SPOT',
    basePrice: 3_412.80,
    precision: 2,
    tickSize: 0.1,
    spreadBps: 2.2,
    volatility: 0.0038,
    baseVolume24h: 18_950_000,
    marketCapWeight: 412,
    badgeColor: '#818CF8',
    unitLabel: 'ETH',
    qtyStep: 0.1,
  },
  {
    symbol: 'SOLUSD',
    name: 'Solana / US Dollar',
    assetClass: 'Crypto',
    sector: 'Layer 1',
    exchange: 'SPOT',
    basePrice: 238.45,
    precision: 2,
    tickSize: 0.05,
    spreadBps: 2.8,
    volatility: 0.0048,
    baseVolume24h: 12_600_000,
    marketCapWeight: 114,
    badgeColor: '#14B8A6',
    unitLabel: 'SOL',
    qtyStep: 1,
  },
  {
    symbol: 'AVAXUSD',
    name: 'Avalanche / US Dollar',
    assetClass: 'Crypto',
    sector: 'Layer 1',
    exchange: 'SPOT',
    basePrice: 44.18,
    precision: 2,
    tickSize: 0.01,
    spreadBps: 3.5,
    volatility: 0.0052,
    baseVolume24h: 4_850_000,
    marketCapWeight: 18,
    badgeColor: '#EF4444',
    unitLabel: 'AVAX',
    qtyStep: 1,
  },
  {
    symbol: 'LINKUSD',
    name: 'Chainlink / US Dollar',
    assetClass: 'Crypto',
    sector: 'DeFi & Oracle',
    exchange: 'SPOT',
    basePrice: 18.74,
    precision: 3,
    tickSize: 0.005,
    spreadBps: 3.2,
    volatility: 0.0044,
    baseVolume24h: 6_120_000,
    marketCapWeight: 12,
    badgeColor: '#2962FF',
    unitLabel: 'LINK',
    qtyStep: 1,
  },

  // FX & Metals (5)
  {
    symbol: 'EURUSD',
    name: 'Euro / US Dollar',
    assetClass: 'FX',
    sector: 'G10 Majors',
    exchange: 'FXCM',
    basePrice: 1.05420,
    precision: 5,
    tickSize: 0.00005,
    spreadBps: 0.8,
    volatility: 0.00055,
    baseVolume24h: 89_500_000,
    marketCapWeight: 950,
    badgeColor: '#3B82F6',
    unitLabel: 'Units',
    qtyStep: 1000,
  },
  {
    symbol: 'GBPUSD',
    name: 'British Pound / USD',
    assetClass: 'FX',
    sector: 'G10 Majors',
    exchange: 'FXCM',
    basePrice: 1.26380,
    precision: 5,
    tickSize: 0.00005,
    spreadBps: 1.1,
    volatility: 0.00068,
    baseVolume24h: 47_200_000,
    marketCapWeight: 540,
    badgeColor: '#8B5CF6',
    unitLabel: 'Units',
    qtyStep: 1000,
  },
  {
    symbol: 'USDJPY',
    name: 'US Dollar / Japanese Yen',
    assetClass: 'FX',
    sector: 'G10 Majors',
    exchange: 'FXCM',
    basePrice: 153.420,
    precision: 3,
    tickSize: 0.005,
    spreadBps: 0.9,
    volatility: 0.00072,
    baseVolume24h: 64_100_000,
    marketCapWeight: 720,
    badgeColor: '#F43F5E',
    unitLabel: 'Units',
    qtyStep: 1000,
  },
  {
    symbol: 'AUDUSD',
    name: 'Australian Dollar / USD',
    assetClass: 'FX',
    sector: 'G10 Majors',
    exchange: 'FXCM',
    basePrice: 0.65190,
    precision: 5,
    tickSize: 0.00005,
    spreadBps: 1.2,
    volatility: 0.00075,
    baseVolume24h: 28_400_000,
    marketCapWeight: 310,
    badgeColor: '#10B981',
    unitLabel: 'Units',
    qtyStep: 1000,
  },
  {
    symbol: 'XAUUSD',
    name: 'Gold Spot / US Dollar',
    assetClass: 'FX',
    sector: 'Precious Metals',
    exchange: 'COMEX',
    basePrice: 2_648.30,
    precision: 2,
    tickSize: 0.1,
    spreadBps: 1.4,
    volatility: 0.0012,
    baseVolume24h: 38_700_000,
    marketCapWeight: 820,
    badgeColor: '#EAB308',
    unitLabel: 'oz',
    qtyStep: 1,
  },
];

export const INSTRUMENT_MAP: Record<string, InstrumentMeta> = Object.fromEntries(
  INSTRUMENTS.map((inst) => [inst.symbol, inst])
);

export const TIMEFRAME_MS: Record<Timeframe, number> = {
  '1m': 60_000,
  '5m': 300_000,
  '15m': 900_000,
  '1H': 3_600_000,
  '4H': 14_400_000,
  '1D': 86_400_000,
};

// Deterministic Mulberry32 PRNG for reproducible yet lifelike initial histories
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function roundToPrecision(value: number, precision: number): number {
  const factor = Math.pow(10, precision);
  return Math.round(value * factor) / factor;
}

/**
 * Generates realistic OHLCV candlestick history for an instrument and timeframe.
 * Ends cleanly near the instrument's current price if targetClose is provided.
 */
export function generateCandleHistory(
  meta: InstrumentMeta,
  timeframe: Timeframe,
  count = 160,
  targetClose?: number
): Candle[] {
  const rng = mulberry32(hashString(`${meta.symbol}-${timeframe}-2026`));
  const stepMs = TIMEFRAME_MS[timeframe];
  const now = Date.now();
  const alignedEnd = Math.floor(now / stepMs) * stepMs;

  // Scale volatility by sqrt of timeframe ratio
  const tfMultiplier: Record<Timeframe, number> = {
    '1m': 0.85,
    '5m': 1.5,
    '15m': 2.2,
    '1H': 3.4,
    '4H': 5.2,
    '1D': 8.0,
  };

  const vol = meta.volatility * tfMultiplier[timeframe];
  const rawCloses: number[] = [];

  // Create regime-switching drift so charts show realistic swings & trends
  let price = meta.basePrice * (0.94 + rng() * 0.12);
  let regimeDrift = (rng() - 0.48) * vol * 0.45;

  for (let i = 0; i < count; i++) {
    if (i % 24 === 0) {
      regimeDrift = (rng() - 0.48) * vol * 0.55;
    }
    // Box-Muller approximate normal
    const u1 = Math.max(1e-6, rng());
    const u2 = rng();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const pctChange = regimeDrift + z * vol;
    price = Math.max(meta.tickSize * 10, price * (1 + pctChange));
    rawCloses.push(price);
  }

  // Anchor final bar close to targetClose if specified so all timeframes agree seamlessly
  const anchor = targetClose ?? rawCloses[rawCloses.length - 1];
  const scale = anchor / rawCloses[rawCloses.length - 1];

  const candles: Candle[] = [];
  let prevClose = rawCloses[0] * scale;

  for (let i = 0; i < count; i++) {
    const close = roundToPrecision(rawCloses[i] * scale, meta.precision);
    const open = i === 0 ? roundToPrecision(close * (1 + (rng() - 0.5) * vol), meta.precision) : prevClose;

    const bodyMax = Math.max(open, close);
    const bodyMin = Math.min(open, close);
    const wickSpread = Math.abs(close - open) + close * vol * 0.55;

    const high = roundToPrecision(bodyMax + rng() * wickSpread * 0.9, meta.precision);
    const low = roundToPrecision(Math.max(meta.tickSize, bodyMin - rng() * wickSpread * 0.9), meta.precision);

    const barMoveRatio = Math.abs(close - open) / Math.max(meta.tickSize, close * vol);
    const baseBarVol = (meta.baseVolume24h / 240) * (stepMs / 300_000);
    const volume = Math.max(
      10,
      Math.round(baseBarVol * (0.55 + rng() * 0.95 + barMoveRatio * 0.5))
    );

    candles.push({
      time: alignedEnd - (count - 1 - i) * stepMs,
      open,
      high: Math.max(high, bodyMax),
      low: Math.min(low, bodyMin),
      close,
      volume,
    });

    prevClose = close;
  }

  return candles;
}

export function calcSMA(candles: Candle[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(candles.length).fill(null);
  let sum = 0;
  for (let i = 0; i < candles.length; i++) {
    sum += candles[i].close;
    if (i >= period) {
      sum -= candles[i - period].close;
    }
    if (i >= period - 1) {
      result[i] = sum / period;
    }
  }
  return result;
}

export function calcEMA(candles: Candle[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(candles.length).fill(null);
  if (candles.length < period) return result;
  const k = 2 / (period + 1);
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += candles[i].close;
  }
  let ema = sum / period;
  result[period - 1] = ema;
  for (let i = period; i < candles.length; i++) {
    ema = candles[i].close * k + ema * (1 - k);
    result[i] = ema;
  }
  return result;
}

export function calcBollingerBands(
  candles: Candle[],
  period = 20,
  stdDevMult = 2
): { upper: (number | null)[]; middle: (number | null)[]; lower: (number | null)[] } {
  const middle = calcSMA(candles, period);
  const upper: (number | null)[] = new Array(candles.length).fill(null);
  const lower: (number | null)[] = new Array(candles.length).fill(null);

  for (let i = period - 1; i < candles.length; i++) {
    const mean = middle[i];
    if (mean === null) continue;
    let variance = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const diff = candles[j].close - mean;
      variance += diff * diff;
    }
    const sd = Math.sqrt(variance / period);
    upper[i] = mean + sd * stdDevMult;
    lower[i] = mean - sd * stdDevMult;
  }

  return { upper, middle, lower };
}

export function calcRSI(candles: Candle[], period = 14): (number | null)[] {
  const result: (number | null)[] = new Array(candles.length).fill(null);
  if (candles.length <= period) return result;

  let gainSum = 0;
  let lossSum = 0;
  for (let i = 1; i <= period; i++) {
    const delta = candles[i].close - candles[i - 1].close;
    if (delta >= 0) gainSum += delta;
    else lossSum += Math.abs(delta);
  }

  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;
  result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < candles.length; i++) {
    const delta = candles[i].close - candles[i - 1].close;
    const gain = delta > 0 ? delta : 0;
    const loss = delta < 0 ? Math.abs(delta) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }

  return result;
}

export function formatPrice(value: number, precision: number): string {
  if (!Number.isFinite(value)) return '—';
  return value.toLocaleString('en-US', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
}

export function formatCurrency(value: number, signed = false): string {
  if (!Number.isFinite(value)) return '$0.00';
  const abs = Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (signed) {
    return value > 0 ? `+$${abs}` : value < 0 ? `-$${abs}` : `$${abs}`;
  }
  return value < 0 ? `-$${abs}` : `$${abs}`;
}

export function formatCompactNumber(value: number): string {
  if (!Number.isFinite(value)) return '0';
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(0);
}

export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return '0.00%';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}
