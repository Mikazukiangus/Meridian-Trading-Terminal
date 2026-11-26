export type AssetClass = 'Equities' | 'Crypto' | 'FX';

export type WorkspaceScreen = 'terminal' | 'screener' | 'heatmap';

export type Timeframe = '1m' | '5m' | '15m' | '1H' | '4H' | '1D';

export type ChartStyle = 'candles' | 'hollow' | 'area';

export type DrawingTool = 'crosshair' | 'trendline' | 'hline';

export type OrderSide = 'BUY' | 'SELL';

export type OrderType = 'MARKET' | 'LIMIT' | 'STOP';

export type OrderStatus = 'WORKING' | 'FILLED' | 'CANCELLED';

export interface Candle {
  time: number; // Unix timestamp in ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface InstrumentMeta {
  symbol: string;
  name: string;
  assetClass: AssetClass;
  sector: string;
  exchange: string;
  basePrice: number;
  precision: number;
  tickSize: number;
  spreadBps: number; // Bid/ask spread in basis points
  volatility: number; // Per-tick volatility factor
  baseVolume24h: number;
  marketCapWeight: number; // Relative weight for heatmap sizing (in $B equivalent)
  badgeColor: string; // Muted avatar ring/bg accent
  unitLabel: string; // e.g., "Shares", "BTC", "Lots"
  qtyStep: number;
}

export interface InstrumentQuote {
  symbol: string;
  last: number;
  bid: number;
  ask: number;
  prevClose: number;
  change: number;
  changePercent: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  sparkline: number[];
  tickDirection: 'up' | 'down' | 'flat';
  tickSeq: number;
  sma20: number;
  ema50: number;
  rsi14: number;
  volatility24h: number;
}

export interface ChartDrawing {
  id: string;
  type: 'trendline' | 'hline';
  p1: { index: number; price: number };
  p2?: { index: number; price: number };
}

export interface IndicatorConfig {
  sma20: boolean;
  ema50: boolean;
  bollinger: boolean;
  volume: boolean;
  rsi: boolean;
}

export interface Position {
  symbol: string;
  side: 'LONG' | 'SHORT';
  qty: number;
  avgEntry: number;
  openedAt: number;
  takeProfit?: number;
  stopLoss?: number;
}

export interface Order {
  id: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  qty: number;
  price?: number; // Limit or Stop trigger price
  filledPrice?: number;
  takeProfit?: number;
  stopLoss?: number;
  status: OrderStatus;
  createdAt: number;
  updatedAt: number;
  note?: string;
}

export interface Execution {
  id: string;
  orderId: string;
  symbol: string;
  side: OrderSide;
  qty: number;
  price: number;
  fee: number;
  realizedPnl?: number;
  timestamp: number;
  reason: string;
}

export interface AccountState {
  startingBalance: number;
  cashBalance: number;
  realizedPnl: number;
  positions: Position[];
  orders: Order[];
  executions: Execution[];
}

export interface ToastMessage {
  id: string;
  title: string;
  description: string;
  variant: 'up' | 'down' | 'info';
}
