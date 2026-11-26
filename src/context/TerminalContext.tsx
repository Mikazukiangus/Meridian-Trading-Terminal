import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  INSTRUMENTS,
  INSTRUMENT_MAP,
  TIMEFRAME_MS,
  calcEMA,
  calcRSI,
  calcSMA,
  formatPrice,
  generateCandleHistory,
  roundToPrecision,
} from '../data/instruments';
import {
  AccountState,
  Candle,
  ChartDrawing,
  ChartStyle,
  DrawingTool,
  Execution,
  IndicatorConfig,
  InstrumentQuote,
  Order,
  OrderSide,
  OrderType,
  Position,
  Timeframe,
  ToastMessage,
  WorkspaceScreen,
} from '../types/terminal';

const STORAGE_ACCOUNT_KEY = 'meridian_terminal_account_v1';
const STORAGE_FAVORITES_KEY = 'meridian_terminal_favorites_v1';
const STORAGE_INDICATORS_KEY = 'meridian_terminal_indicators_v1';
const STARTING_BALANCE = 100_000;
const FEE_RATE = 0.0005; // 5 bps simulated commission

interface PlaceOrderInput {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  qty: number;
  price?: number;
  takeProfit?: number;
  stopLoss?: number;
}

interface PlaceOrderResult {
  ok: boolean;
  error?: string;
}

interface TerminalContextValue {
  activeScreen: WorkspaceScreen;
  setActiveScreen: (screen: WorkspaceScreen) => void;
  activeSymbol: string;
  selectSymbol: (symbol: string, switchToTerminal?: boolean) => void;
  timeframe: Timeframe;
  setTimeframe: (tf: Timeframe) => void;
  chartStyle: ChartStyle;
  setChartStyle: (style: ChartStyle) => void;
  indicators: IndicatorConfig;
  toggleIndicator: (key: keyof IndicatorConfig) => void;
  drawingTool: DrawingTool;
  setDrawingTool: (tool: DrawingTool) => void;
  drawingsBySymbol: Record<string, ChartDrawing[]>;
  addDrawing: (symbol: string, drawing: ChartDrawing) => void;
  undoDrawing: (symbol: string) => void;
  clearDrawings: (symbol: string) => void;

  quotes: Record<string, InstrumentQuote>;
  activeCandles: Candle[];
  favorites: string[];
  toggleFavorite: (symbol: string) => void;

  isLive: boolean;
  setIsLive: (live: boolean) => void;
  simSpeed: 1 | 3;
  setSimSpeed: (speed: 1 | 3) => void;

  account: AccountState;
  totalEquity: number;
  unrealizedPnl: number;
  usedMargin: number;
  buyingPower: number;
  placeOrder: (input: PlaceOrderInput) => PlaceOrderResult;
  cancelOrder: (orderId: string) => void;
  closePosition: (symbol: string) => void;
  reversePosition: (symbol: string) => void;
  resetAccount: () => void;

  commandOpen: boolean;
  setCommandOpen: (open: boolean) => void;
  toasts: ToastMessage[];
  dismissToast: (id: string) => void;
}

const TerminalContext = createContext<TerminalContextValue | null>(null);

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function buildInitialMarketState(): {
  quotes: Record<string, InstrumentQuote>;
  baseCandles: Record<string, Candle[]>;
} {
  const quotes: Record<string, InstrumentQuote> = {};
  const baseCandles: Record<string, Candle[]> = {};

  for (const meta of INSTRUMENTS) {
    const candles = generateCandleHistory(meta, '15m', 140);
    baseCandles[meta.symbol] = candles;

    const latest = candles[candles.length - 1];
    const open24hIdx = Math.max(0, candles.length - 48);
    const prevClose = candles[open24hIdx].open;

    let high24h = latest.high;
    let low24h = latest.low;
    for (let i = open24hIdx; i < candles.length; i++) {
      if (candles[i].high > high24h) high24h = candles[i].high;
      if (candles[i].low < low24h) low24h = candles[i].low;
    }

    const halfSpread = latest.close * (meta.spreadBps / 20_000);
    const bid = roundToPrecision(latest.close - halfSpread, meta.precision);
    const ask = roundToPrecision(latest.close + halfSpread, meta.precision);
    const change = latest.close - prevClose;
    const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

    const smaArr = calcSMA(candles, 20);
    const emaArr = calcEMA(candles, 50);
    const rsiArr = calcRSI(candles, 14);

    quotes[meta.symbol] = {
      symbol: meta.symbol,
      last: latest.close,
      bid,
      ask,
      prevClose,
      change,
      changePercent,
      high24h,
      low24h,
      volume24h: meta.baseVolume24h,
      sparkline: candles.slice(-24).map((c) => c.close),
      tickDirection: 'flat',
      tickSeq: 0,
      sma20: smaArr[smaArr.length - 1] ?? latest.close,
      ema50: emaArr[emaArr.length - 1] ?? latest.close,
      rsi14: rsiArr[rsiArr.length - 1] ?? 50,
      volatility24h: ((high24h - low24h) / Math.max(meta.tickSize, prevClose)) * 100,
    };
  }

  return { quotes, baseCandles };
}

function buildSeededAccount(quotes: Record<string, InstrumentQuote>): AccountState {
  const nvdaPrice = quotes.NVDA?.last ?? 142.85;
  const btcPrice = quotes.BTCUSD?.last ?? 96_420.5;
  const aaplPrice = quotes.AAPL?.last ?? 234.6;

  const nvdaEntry = roundToPrecision(nvdaPrice * 0.986, 2);
  const btcEntry = roundToPrecision(btcPrice * 0.992, 2);
  const aaplLimit = roundToPrecision(aaplPrice * 0.985, 2);

  const nvdaCost = nvdaEntry * 80;
  const btcCost = btcEntry * 0.15;
  const fees = (nvdaCost + btcCost) * FEE_RATE;
  const now = Date.now();

  return {
    startingBalance: STARTING_BALANCE,
    cashBalance: roundToPrecision(STARTING_BALANCE - nvdaCost - btcCost - fees, 2),
    realizedPnl: 0,
    positions: [
      {
        symbol: 'NVDA',
        side: 'LONG',
        qty: 80,
        avgEntry: nvdaEntry,
        openedAt: now - 3_600_000 * 3,
        takeProfit: roundToPrecision(nvdaPrice * 1.045, 2),
        stopLoss: roundToPrecision(nvdaPrice * 0.96, 2),
      },
      {
        symbol: 'BTCUSD',
        side: 'LONG',
        qty: 0.15,
        avgEntry: btcEntry,
        openedAt: now - 3_600_000 * 2,
      },
    ],
    orders: [
      {
        id: 'ORD-INIT-1',
        symbol: 'AAPL',
        side: 'BUY',
        type: 'LIMIT',
        qty: 40,
        price: aaplLimit,
        status: 'WORKING',
        createdAt: now - 1_800_000,
        updatedAt: now - 1_800_000,
        note: 'Working Limit',
      },
      {
        id: 'ORD-INIT-2',
        symbol: 'NVDA',
        side: 'BUY',
        type: 'MARKET',
        qty: 80,
        filledPrice: nvdaEntry,
        takeProfit: roundToPrecision(nvdaPrice * 1.045, 2),
        stopLoss: roundToPrecision(nvdaPrice * 0.96, 2),
        status: 'FILLED',
        createdAt: now - 3_600_000 * 3,
        updatedAt: now - 3_600_000 * 3,
      },
      {
        id: 'ORD-INIT-3',
        symbol: 'BTCUSD',
        side: 'BUY',
        type: 'MARKET',
        qty: 0.15,
        filledPrice: btcEntry,
        status: 'FILLED',
        createdAt: now - 3_600_000 * 2,
        updatedAt: now - 3_600_000 * 2,
      },
    ],
    executions: [
      {
        id: 'EXE-INIT-2',
        orderId: 'ORD-INIT-3',
        symbol: 'BTCUSD',
        side: 'BUY',
        qty: 0.15,
        price: btcEntry,
        fee: roundToPrecision(btcCost * FEE_RATE, 2),
        timestamp: now - 3_600_000 * 2,
        reason: 'Market Fill',
      },
      {
        id: 'EXE-INIT-1',
        orderId: 'ORD-INIT-2',
        symbol: 'NVDA',
        side: 'BUY',
        qty: 80,
        price: nvdaEntry,
        fee: roundToPrecision(nvdaCost * FEE_RATE, 2),
        timestamp: now - 3_600_000 * 3,
        reason: 'Market Fill',
      },
    ],
  };
}

function loadStoredAccount(quotes: Record<string, InstrumentQuote>): AccountState {
  try {
    const raw = localStorage.getItem(STORAGE_ACCOUNT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AccountState;
      if (parsed && typeof parsed.cashBalance === 'number' && Array.isArray(parsed.positions)) {
        return parsed;
      }
    }
  } catch {
    // Fall through to default
  }
  return buildSeededAccount(quotes);
}

function applyTradeFill(
  prev: AccountState,
  symbol: string,
  side: OrderSide,
  qty: number,
  fillPrice: number,
  orderId: string,
  reason: string,
  takeProfit?: number,
  stopLoss?: number
): { nextAccount: AccountState; realizedPnl: number | undefined } {
  const notional = qty * fillPrice;
  const fee = roundToPrecision(notional * FEE_RATE, 2);
  let cash = prev.cashBalance - fee;
  let realizedDelta = 0;
  let tradeRealizedPnl: number | undefined = undefined;

  const positions = [...prev.positions];
  const existingIdx = positions.findIndex((p) => p.symbol === symbol);
  const incomingSide = side === 'BUY' ? 'LONG' : 'SHORT';

  if (existingIdx === -1) {
    // Opening new position: deduct notional for LONG or reserve margin/credit for SHORT
    // Using clean margin accounting: opening deducts cash equal to notional (1x collateral),
    // closing returns original collateral + realized P&L.
    cash -= notional;
    positions.push({
      symbol,
      side: incomingSide,
      qty,
      avgEntry: fillPrice,
      openedAt: Date.now(),
      takeProfit,
      stopLoss,
    });
  } else {
    const pos = positions[existingIdx];
    if (pos.side === incomingSide) {
      // Adding to existing position
      const totalQty = pos.qty + qty;
      const newAvg = (pos.avgEntry * pos.qty + fillPrice * qty) / totalQty;
      cash -= notional;
      positions[existingIdx] = {
        ...pos,
        qty: totalQty,
        avgEntry: newAvg,
        takeProfit: takeProfit ?? pos.takeProfit,
        stopLoss: stopLoss ?? pos.stopLoss,
      };
    } else {
      // Reducing, closing, or reversing position
      const closeQty = Math.min(pos.qty, qty);
      const pnlPerUnit =
        pos.side === 'LONG' ? fillPrice - pos.avgEntry : pos.avgEntry - fillPrice;
      const closedPnl = pnlPerUnit * closeQty;
      realizedDelta += closedPnl;
      tradeRealizedPnl = roundToPrecision(closedPnl, 2);

      // Return collateral for closed portion + realized P&L
      cash += pos.avgEntry * closeQty + closedPnl;

      const remainingQty = qty - closeQty;
      if (pos.qty - closeQty > 1e-8) {
        positions[existingIdx] = {
          ...pos,
          qty: Number((pos.qty - closeQty).toFixed(6)),
        };
      } else if (remainingQty > 1e-8) {
        // Reversed into opposite direction
        cash -= remainingQty * fillPrice;
        positions[existingIdx] = {
          symbol,
          side: incomingSide,
          qty: Number(remainingQty.toFixed(6)),
          avgEntry: fillPrice,
          openedAt: Date.now(),
          takeProfit,
          stopLoss,
        };
      } else {
        positions.splice(existingIdx, 1);
      }
    }
  }

  const execution: Execution = {
    id: makeId('EXE'),
    orderId,
    symbol,
    side,
    qty,
    price: fillPrice,
    fee,
    realizedPnl: tradeRealizedPnl,
    timestamp: Date.now(),
    reason,
  };

  return {
    nextAccount: {
      ...prev,
      cashBalance: roundToPrecision(cash, 2),
      realizedPnl: roundToPrecision(prev.realizedPnl + realizedDelta - fee, 2),
      positions,
      executions: [execution, ...prev.executions].slice(0, 120),
    },
    realizedPnl: tradeRealizedPnl,
  };
}

export function TerminalProvider({ children }: { children: React.ReactNode }) {
  const initialMarket = useMemo(() => buildInitialMarketState(), []);

  const [activeScreen, setActiveScreen] = useState<WorkspaceScreen>('terminal');
  const [activeSymbol, setActiveSymbol] = useState<string>('NVDA');
  const [timeframe, setTimeframe] = useState<Timeframe>('15m');
  const [chartStyle, setChartStyle] = useState<ChartStyle>('candles');
  const [drawingTool, setDrawingTool] = useState<DrawingTool>('crosshair');
  const [drawingsBySymbol, setDrawingsBySymbol] = useState<Record<string, ChartDrawing[]>>({});
  const [commandOpen, setCommandOpen] = useState<boolean>(false);

  const [indicators, setIndicators] = useState<IndicatorConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_INDICATORS_KEY);
      if (saved) return JSON.parse(saved) as IndicatorConfig;
    } catch {
      // ignore
    }
    return {
      sma20: true,
      ema50: true,
      bollinger: false,
      volume: true,
      rsi: true,
    };
  });

  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_FAVORITES_KEY);
      if (saved) return JSON.parse(saved) as string[];
    } catch {
      // ignore
    }
    return ['NVDA', 'AAPL', 'TSLA', 'BTCUSD', 'ETHUSD', 'EURUSD', 'XAUUSD'];
  });

  const [quotes, setQuotes] = useState<Record<string, InstrumentQuote>>(initialMarket.quotes);
  const candlesCacheRef = useRef<Record<string, Record<Timeframe, Candle[]>>>({});
  const [activeCandles, setActiveCandles] = useState<Candle[]>(
    () => initialMarket.baseCandles.NVDA
  );

  // Seed initial 15m cache for all instruments
  useEffect(() => {
    for (const sym of Object.keys(initialMarket.baseCandles)) {
      if (!candlesCacheRef.current[sym]) {
        candlesCacheRef.current[sym] = {} as Record<Timeframe, Candle[]>;
      }
      candlesCacheRef.current[sym]['15m'] = initialMarket.baseCandles[sym];
    }
  }, [initialMarket]);

  const [account, setAccount] = useState<AccountState>(() =>
    loadStoredAccount(initialMarket.quotes)
  );
  const [isLive, setIsLive] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<1 | 3>(1);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const pushToast = useCallback(
    (title: string, description: string, variant: 'up' | 'down' | 'info' = 'info') => {
      const id = makeId('TST');
      setToasts((prev) => [{ id, title, description, variant }, ...prev].slice(0, 4));
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4200);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Persist account, favorites, and indicator settings
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_ACCOUNT_KEY, JSON.stringify(account));
    } catch {
      // ignore storage quota errors
    }
  }, [account]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_FAVORITES_KEY, JSON.stringify(favorites));
    } catch {
      // ignore
    }
  }, [favorites]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_INDICATORS_KEY, JSON.stringify(indicators));
    } catch {
      // ignore
    }
  }, [indicators]);

  // Helper to get or lazily generate timeframe candles anchored to live quote
  const getOrCreateCandles = useCallback(
    (symbol: string, tf: Timeframe, currentPrice?: number): Candle[] => {
      if (!candlesCacheRef.current[symbol]) {
        candlesCacheRef.current[symbol] = {} as Record<Timeframe, Candle[]>;
      }
      if (!candlesCacheRef.current[symbol][tf]) {
        const meta = INSTRUMENT_MAP[symbol];
        candlesCacheRef.current[symbol][tf] = generateCandleHistory(
          meta,
          tf,
          150,
          currentPrice
        );
      }
      return candlesCacheRef.current[symbol][tf];
    },
    []
  );

  // Sync activeCandles when activeSymbol or timeframe changes
  const quotesRef = useRef(quotes);
  quotesRef.current = quotes;

  useEffect(() => {
    const currentPrice = quotesRef.current[activeSymbol]?.last;
    const series = getOrCreateCandles(activeSymbol, timeframe, currentPrice);
    setActiveCandles([...series]);
  }, [activeSymbol, timeframe, getOrCreateCandles]);

  // Global keyboard shortcut for Ctrl+K / Cmd+K
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Live Simulated Tick Engine + Resting Order & Bracket Matching
  const activeSymbolRef = useRef(activeSymbol);
  activeSymbolRef.current = activeSymbol;
  const timeframeRef = useRef(timeframe);
  timeframeRef.current = timeframe;

  useEffect(() => {
    if (!isLive) return;

    const intervalMs = simSpeed === 3 ? 260 : 750;
    const timer = window.setInterval(() => {
      const now = Date.now();
      const updatedQuotes: Record<string, InstrumentQuote> = {};
      const macroImpulse = (Math.random() - 0.5) * 0.00055; // subtle shared market drift

      for (const meta of INSTRUMENTS) {
        const prev = quotesRef.current[meta.symbol];
        if (!prev) continue;

        // Tick most symbols on each pulse, with active symbol always ticking
        const shouldTick = meta.symbol === activeSymbolRef.current || Math.random() < 0.72;
        if (!shouldTick) {
          updatedQuotes[meta.symbol] = prev;
          continue;
        }

        const rand = (Math.random() + Math.random() - 1) * 1.15; // triangular-ish centered noise
        const drift = meta.assetClass === 'FX' ? macroImpulse * 0.25 : macroImpulse;
        const pctDelta = drift + rand * meta.volatility * 0.48;
        const rawNext = Math.max(meta.tickSize * 10, prev.last * (1 + pctDelta));
        const nextLast = roundToPrecision(rawNext, meta.precision);

        const halfSpread = nextLast * (meta.spreadBps / 20_000);
        const bid = roundToPrecision(nextLast - halfSpread, meta.precision);
        const ask = roundToPrecision(nextLast + halfSpread, meta.precision);
        const change = nextLast - prev.prevClose;
        const changePercent = prev.prevClose > 0 ? (change / prev.prevClose) * 100 : 0;
        const high24h = Math.max(prev.high24h, nextLast);
        const low24h = Math.min(prev.low24h, nextLast);
        const volAdd = Math.round((meta.baseVolume24h / 90_000) * (0.4 + Math.random() * 1.6));
        const volume24h = prev.volume24h + volAdd;

        // Update cached candle series for this symbol
        const symCache = candlesCacheRef.current[meta.symbol];
        if (symCache) {
          (Object.keys(symCache) as Timeframe[]).forEach((tf) => {
            const arr = symCache[tf];
            if (!arr || arr.length === 0) return;
            const step = TIMEFRAME_MS[tf];
            const lastBar = arr[arr.length - 1];
            const currentBucket = Math.floor(now / step) * step;

            if (currentBucket > lastBar.time) {
              arr.push({
                time: currentBucket,
                open: lastBar.close,
                high: Math.max(lastBar.close, nextLast),
                low: Math.min(lastBar.close, nextLast),
                close: nextLast,
                volume: Math.max(10, volAdd),
              });
              if (arr.length > 220) arr.shift();
            } else {
              lastBar.close = nextLast;
              if (nextLast > lastBar.high) lastBar.high = nextLast;
              if (nextLast < lastBar.low) lastBar.low = nextLast;
              lastBar.volume += Math.max(1, Math.round(volAdd * 0.5));
            }
          });
        }

        // Recompute quick technicals from 15m series
        const base15 = symCache?.['15m'];
        let sma20 = prev.sma20;
        let ema50 = prev.ema50;
        let rsi14 = prev.rsi14;
        let sparkline = prev.sparkline;
        if (base15 && base15.length >= 20) {
          const tail = base15.slice(-20);
          sma20 = tail.reduce((s, c) => s + c.close, 0) / tail.length;
          const k50 = 2 / 51;
          ema50 = nextLast * k50 + prev.ema50 * (1 - k50);
          const rsiArr = calcRSI(base15.slice(-30), 14);
          rsi14 = rsiArr[rsiArr.length - 1] ?? prev.rsi14;
          sparkline = base15.slice(-24).map((c) => c.close);
        }

        const tickDirection =
          nextLast > prev.last ? 'up' : nextLast < prev.last ? 'down' : 'flat';

        updatedQuotes[meta.symbol] = {
          ...prev,
          last: nextLast,
          bid,
          ask,
          change,
          changePercent,
          high24h,
          low24h,
          volume24h,
          sparkline,
          tickDirection,
          tickSeq: tickDirection === 'flat' ? prev.tickSeq : prev.tickSeq + 1,
          sma20,
          ema50,
          rsi14,
          volatility24h: ((high24h - low24h) / Math.max(meta.tickSize, prev.prevClose)) * 100,
        };
      }

      quotesRef.current = updatedQuotes;
      setQuotes(updatedQuotes);

      // Refresh active chart candle array
      const activeSeries =
        candlesCacheRef.current[activeSymbolRef.current]?.[timeframeRef.current];
      if (activeSeries) {
        setActiveCandles([...activeSeries]);
      }

      // Check working LIMIT / STOP orders and Position TP/SL triggers
      const triggeredToasts: { title: string; description: string; variant: 'up' | 'down' }[] = [];

      setAccount((prevAcc) => {
        let nextAcc = prevAcc;
        let mutated = false;

        // 1) Evaluate resting WORKING orders
        const nextOrders = prevAcc.orders.map((ord) => {
          if (ord.status !== 'WORKING' || ord.price === undefined) return ord;
          const q = updatedQuotes[ord.symbol];
          if (!q) return ord;

          let triggered = false;
          let fillPrice = ord.price;

          if (ord.type === 'LIMIT') {
            if (ord.side === 'BUY' && q.ask <= ord.price) {
              triggered = true;
              fillPrice = Math.min(ord.price, q.ask);
            } else if (ord.side === 'SELL' && q.bid >= ord.price) {
              triggered = true;
              fillPrice = Math.max(ord.price, q.bid);
            }
          } else if (ord.type === 'STOP') {
            if (ord.side === 'BUY' && q.ask >= ord.price) {
              triggered = true;
              fillPrice = q.ask;
            } else if (ord.side === 'SELL' && q.bid <= ord.price) {
              triggered = true;
              fillPrice = q.bid;
            }
          }

          if (!triggered) return ord;
          mutated = true;

          const res = applyTradeFill(
            nextAcc,
            ord.symbol,
            ord.side,
            ord.qty,
            fillPrice,
            ord.id,
            `${ord.type} Fill`,
            ord.takeProfit,
            ord.stopLoss
          );
          nextAcc = res.nextAccount;

          const meta = INSTRUMENT_MAP[ord.symbol];
          triggeredToasts.push({
            title: `${ord.type} Order Filled`,
            description: `${ord.side} ${ord.qty} ${ord.symbol} @ ${formatPrice(fillPrice, meta?.precision ?? 2)}`,
            variant: ord.side === 'BUY' ? 'up' : 'down',
          });

          return {
            ...ord,
            status: 'FILLED' as const,
            filledPrice: fillPrice,
            updatedAt: now,
          };
        });

        if (mutated) {
          nextAcc = { ...nextAcc, orders: nextOrders };
        }

        // 2) Evaluate Position TP / SL brackets
        for (const pos of [...nextAcc.positions]) {
          const q = updatedQuotes[pos.symbol];
          if (!q) continue;
          const mark = pos.side === 'LONG' ? q.bid : q.ask;

          let hitReason: string | null = null;
          if (pos.takeProfit !== undefined) {
            if (pos.side === 'LONG' && mark >= pos.takeProfit) hitReason = 'Take Profit';
            if (pos.side === 'SHORT' && mark <= pos.takeProfit) hitReason = 'Take Profit';
          }
          if (!hitReason && pos.stopLoss !== undefined) {
            if (pos.side === 'LONG' && mark <= pos.stopLoss) hitReason = 'Stop Loss';
            if (pos.side === 'SHORT' && mark >= pos.stopLoss) hitReason = 'Stop Loss';
          }

          if (hitReason) {
            mutated = true;
            const exitSide: OrderSide = pos.side === 'LONG' ? 'SELL' : 'BUY';
            const ordId = makeId('ORD');
            const res = applyTradeFill(
              nextAcc,
              pos.symbol,
              exitSide,
              pos.qty,
              mark,
              ordId,
              hitReason
            );
            const autoOrder: Order = {
              id: ordId,
              symbol: pos.symbol,
              side: exitSide,
              type: 'MARKET',
              qty: pos.qty,
              filledPrice: mark,
              status: 'FILLED',
              createdAt: now,
              updatedAt: now,
              note: hitReason,
            };
            nextAcc = {
              ...res.nextAccount,
              orders: [autoOrder, ...res.nextAccount.orders].slice(0, 120),
            };

            const meta = INSTRUMENT_MAP[pos.symbol];
            triggeredToasts.push({
              title: `${hitReason} Triggered`,
              description: `Closed ${pos.qty} ${pos.symbol} @ ${formatPrice(mark, meta?.precision ?? 2)}`,
              variant: hitReason === 'Take Profit' ? 'up' : 'down',
            });
          }
        }

        return mutated ? nextAcc : prevAcc;
      });

      if (triggeredToasts.length > 0) {
        triggeredToasts.forEach((t) => pushToast(t.title, t.description, t.variant));
      }
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [isLive, simSpeed, pushToast]);

  // Derived Portfolio Metrics
  const { unrealizedPnl, usedMargin, totalEquity, buyingPower } = useMemo(() => {
    let uPnl = 0;
    let margin = 0;
    for (const pos of account.positions) {
      const q = quotes[pos.symbol];
      const mark = q ? (pos.side === 'LONG' ? q.bid : q.ask) : pos.avgEntry;
      const diff = pos.side === 'LONG' ? mark - pos.avgEntry : pos.avgEntry - mark;
      uPnl += diff * pos.qty;
      margin += pos.avgEntry * pos.qty;
    }

    // Reserve notional of working orders from buying power
    let workingOrderReserve = 0;
    for (const ord of account.orders) {
      if (ord.status === 'WORKING' && ord.price) {
        workingOrderReserve += ord.price * ord.qty;
      }
    }

    const equity = account.cashBalance + margin + uPnl;
    const bp = Math.max(0, account.cashBalance - workingOrderReserve);

    return {
      unrealizedPnl: uPnl,
      usedMargin: margin,
      totalEquity: equity,
      buyingPower: bp,
    };
  }, [account, quotes]);

  const selectSymbol = useCallback((symbol: string, switchToTerminal = false) => {
    if (!INSTRUMENT_MAP[symbol]) return;
    setActiveSymbol(symbol);
    if (switchToTerminal) {
      setActiveScreen('terminal');
    }
  }, []);

  const toggleIndicator = useCallback((key: keyof IndicatorConfig) => {
    setIndicators((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const toggleFavorite = useCallback((symbol: string) => {
    setFavorites((prev) =>
      prev.includes(symbol) ? prev.filter((s) => s !== symbol) : [...prev, symbol]
    );
  }, []);

  const addDrawing = useCallback((symbol: string, drawing: ChartDrawing) => {
    setDrawingsBySymbol((prev) => ({
      ...prev,
      [symbol]: [...(prev[symbol] ?? []), drawing],
    }));
  }, []);

  const undoDrawing = useCallback((symbol: string) => {
    setDrawingsBySymbol((prev) => {
      const arr = prev[symbol] ?? [];
      if (arr.length === 0) return prev;
      return { ...prev, [symbol]: arr.slice(0, -1) };
    });
  }, []);

  const clearDrawings = useCallback((symbol: string) => {
    setDrawingsBySymbol((prev) => ({ ...prev, [symbol]: [] }));
  }, []);

  const placeOrder = useCallback(
    (input: PlaceOrderInput): PlaceOrderResult => {
      const meta = INSTRUMENT_MAP[input.symbol];
      const q = quotesRef.current[input.symbol];
      if (!meta || !q) return { ok: false, error: 'Instrument unavailable.' };
      if (!Number.isFinite(input.qty) || input.qty <= 0) {
        return { ok: false, error: 'Enter a valid quantity greater than zero.' };
      }

      const execPrice =
        input.type === 'MARKET'
          ? input.side === 'BUY'
            ? q.ask
            : q.bid
          : input.price;

      if (!execPrice || !Number.isFinite(execPrice) || execPrice <= 0) {
        return { ok: false, error: 'Enter a valid trigger/limit price.' };
      }

      // Check if reducing an existing opposite position (no extra buying power needed for close portion)
      const existingPos = account.positions.find((p) => p.symbol === input.symbol);
      const isReducing =
        existingPos &&
        ((existingPos.side === 'LONG' && input.side === 'SELL') ||
          (existingPos.side === 'SHORT' && input.side === 'BUY'));

      const netNewQty = isReducing ? Math.max(0, input.qty - existingPos.qty) : input.qty;
      const requiredCash = netNewQty * execPrice * (1 + FEE_RATE);

      if (requiredCash > buyingPower + 0.01) {
        return {
          ok: false,
          error: 'Insufficient buying power for this order size.',
        };
      }

      const now = Date.now();
      const orderId = makeId('ORD');

      if (input.type === 'MARKET') {
        const orderRecord: Order = {
          id: orderId,
          symbol: input.symbol,
          side: input.side,
          type: 'MARKET',
          qty: input.qty,
          filledPrice: execPrice,
          takeProfit: input.takeProfit,
          stopLoss: input.stopLoss,
          status: 'FILLED',
          createdAt: now,
          updatedAt: now,
        };

        setAccount((prev) => {
          const res = applyTradeFill(
            prev,
            input.symbol,
            input.side,
            input.qty,
            execPrice,
            orderId,
            'Market Fill',
            input.takeProfit,
            input.stopLoss
          );
          return {
            ...res.nextAccount,
            orders: [orderRecord, ...res.nextAccount.orders].slice(0, 120),
          };
        });

        pushToast(
          `${input.side === 'BUY' ? 'Bought' : 'Sold'} ${input.symbol}`,
          `${input.qty} ${meta.unitLabel} filled @ ${formatPrice(execPrice, meta.precision)}`,
          input.side === 'BUY' ? 'up' : 'down'
        );
        return { ok: true };
      }

      // Limit or Stop order: check if immediately marketable
      const immediatelyMarketable =
        (input.type === 'LIMIT' &&
          ((input.side === 'BUY' && execPrice >= q.ask) ||
            (input.side === 'SELL' && execPrice <= q.bid))) ||
        (input.type === 'STOP' &&
          ((input.side === 'BUY' && execPrice <= q.ask) ||
            (input.side === 'SELL' && execPrice >= q.bid)));

      if (immediatelyMarketable) {
        const fillPrice = input.side === 'BUY' ? q.ask : q.bid;
        const orderRecord: Order = {
          id: orderId,
          symbol: input.symbol,
          side: input.side,
          type: input.type,
          qty: input.qty,
          price: execPrice,
          filledPrice: fillPrice,
          takeProfit: input.takeProfit,
          stopLoss: input.stopLoss,
          status: 'FILLED',
          createdAt: now,
          updatedAt: now,
          note: 'Immediate Fill',
        };

        setAccount((prev) => {
          const res = applyTradeFill(
            prev,
            input.symbol,
            input.side,
            input.qty,
            fillPrice,
            orderId,
            `${input.type} Immediate`,
            input.takeProfit,
            input.stopLoss
          );
          return {
            ...res.nextAccount,
            orders: [orderRecord, ...res.nextAccount.orders].slice(0, 120),
          };
        });

        pushToast(
          `${input.type} Filled Immediately`,
          `${input.side} ${input.qty} ${input.symbol} @ ${formatPrice(fillPrice, meta.precision)}`,
          input.side === 'BUY' ? 'up' : 'down'
        );
        return { ok: true };
      }

      // Queue working order
      const workingOrder: Order = {
        id: orderId,
        symbol: input.symbol,
        side: input.side,
        type: input.type,
        qty: input.qty,
        price: execPrice,
        takeProfit: input.takeProfit,
        stopLoss: input.stopLoss,
        status: 'WORKING',
        createdAt: now,
        updatedAt: now,
      };

      setAccount((prev) => ({
        ...prev,
        orders: [workingOrder, ...prev.orders].slice(0, 120),
      }));

      pushToast(
        `${input.type} Order Placed`,
        `${input.side} ${input.qty} ${input.symbol} @ ${formatPrice(execPrice, meta.precision)}`,
        'info'
      );
      return { ok: true };
    },
    [account.positions, buyingPower, pushToast]
  );

  const cancelOrder = useCallback(
    (orderId: string) => {
      const target = account.orders.find((o) => o.id === orderId && o.status === 'WORKING');
      if (!target) return;

      setAccount((prev) => ({
        ...prev,
        orders: prev.orders.map((o) =>
          o.id === orderId ? { ...o, status: 'CANCELLED', updatedAt: Date.now() } : o
        ),
      }));

      pushToast(
        'Order Cancelled',
        `${target.side} ${target.qty} ${target.symbol} (${target.type})`,
        'info'
      );
    },
    [account.orders, pushToast]
  );

  const closePosition = useCallback(
    (symbol: string) => {
      const pos = account.positions.find((p) => p.symbol === symbol);
      const q = quotesRef.current[symbol];
      const meta = INSTRUMENT_MAP[symbol];
      if (!pos || !q || !meta) return;

      const exitSide: OrderSide = pos.side === 'LONG' ? 'SELL' : 'BUY';
      const fillPrice = exitSide === 'SELL' ? q.bid : q.ask;
      const now = Date.now();
      const orderId = makeId('ORD');

      const closeOrd: Order = {
        id: orderId,
        symbol,
        side: exitSide,
        type: 'MARKET',
        qty: pos.qty,
        filledPrice: fillPrice,
        status: 'FILLED',
        createdAt: now,
        updatedAt: now,
        note: 'Close Position',
      };

      let realized = 0;
      setAccount((prev) => {
        const res = applyTradeFill(
          prev,
          symbol,
          exitSide,
          pos.qty,
          fillPrice,
          orderId,
          'Close Position'
        );
        realized = res.realizedPnl ?? 0;
        return {
          ...res.nextAccount,
          orders: [closeOrd, ...res.nextAccount.orders].slice(0, 120),
        };
      });

      pushToast(
        `Closed ${symbol} ${pos.side}`,
        `Exited ${pos.qty} @ ${formatPrice(fillPrice, meta.precision)}`,
        realized >= 0 ? 'up' : 'down'
      );
    },
    [account.positions, pushToast]
  );

  const reversePosition = useCallback(
    (symbol: string) => {
      const pos = account.positions.find((p) => p.symbol === symbol);
      const q = quotesRef.current[symbol];
      const meta = INSTRUMENT_MAP[symbol];
      if (!pos || !q || !meta) return;

      const exitSide: OrderSide = pos.side === 'LONG' ? 'SELL' : 'BUY';
      const fillPrice = exitSide === 'SELL' ? q.bid : q.ask;
      const now = Date.now();
      const orderId = makeId('ORD');

      const reverseOrd: Order = {
        id: orderId,
        symbol,
        side: exitSide,
        type: 'MARKET',
        qty: pos.qty * 2,
        filledPrice: fillPrice,
        status: 'FILLED',
        createdAt: now,
        updatedAt: now,
        note: 'Reverse Position',
      };

      setAccount((prev) => {
        const res = applyTradeFill(
          prev,
          symbol,
          exitSide,
          pos.qty * 2,
          fillPrice,
          orderId,
          'Reverse Position'
        );
        return {
          ...res.nextAccount,
          orders: [reverseOrd, ...res.nextAccount.orders].slice(0, 120),
        };
      });

      pushToast(
        `Reversed ${symbol}`,
        `Flipped to ${pos.side === 'LONG' ? 'SHORT' : 'LONG'} ${pos.qty} @ ${formatPrice(fillPrice, meta.precision)}`,
        exitSide === 'BUY' ? 'up' : 'down'
      );
    },
    [account.positions, pushToast]
  );

  const resetAccount = useCallback(() => {
    const fresh: AccountState = {
      startingBalance: STARTING_BALANCE,
      cashBalance: STARTING_BALANCE,
      realizedPnl: 0,
      positions: [],
      orders: [],
      executions: [],
    };
    setAccount(fresh);
    pushToast('Paper Account Reset', 'Account restored to $100,000.00 cash balance.', 'info');
  }, [pushToast]);

  const value: TerminalContextValue = {
    activeScreen,
    setActiveScreen,
    activeSymbol,
    selectSymbol,
    timeframe,
    setTimeframe,
    chartStyle,
    setChartStyle,
    indicators,
    toggleIndicator,
    drawingTool,
    setDrawingTool,
    drawingsBySymbol,
    addDrawing,
    undoDrawing,
    clearDrawings,
    quotes,
    activeCandles,
    favorites,
    toggleFavorite,
    isLive,
    setIsLive,
    simSpeed,
    setSimSpeed,
    account,
    totalEquity,
    unrealizedPnl,
    usedMargin,
    buyingPower,
    placeOrder,
    cancelOrder,
    closePosition,
    reversePosition,
    resetAccount,
    commandOpen,
    setCommandOpen,
    toasts,
    dismissToast,
  };

  return <TerminalContext.Provider value={value}>{children}</TerminalContext.Provider>;
}

export function useTerminal() {
  const ctx = useContext(TerminalContext);
  if (!ctx) throw new Error('useTerminal must be used inside TerminalProvider');
  return ctx;
}
