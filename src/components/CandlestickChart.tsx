import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Crosshair,
  Maximize2,
  Minus,
  RotateCcw,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { useTerminal } from '../context/TerminalContext';
import {
  INSTRUMENT_MAP,
  calcBollingerBands,
  calcEMA,
  calcRSI,
  calcSMA,
  formatCompactNumber,
  formatCurrency,
  formatPercent,
  formatPrice,
} from '../data/instruments';
import { ChartStyle, DrawingTool, IndicatorConfig, Timeframe } from '../types/terminal';

const TIMEFRAMES: Timeframe[] = ['1m', '5m', '15m', '1H', '4H', '1D'];

const CHART_STYLES: { id: ChartStyle; label: string }[] = [
  { id: 'candles', label: 'Candles' },
  { id: 'hollow', label: 'Hollow' },
  { id: 'area', label: 'Area' },
];

const INDICATOR_TOGGLES: { key: keyof IndicatorConfig; label: string; color: string }[] = [
  { key: 'sma20', label: 'SMA 20', color: '#2962FF' },
  { key: 'ema50', label: 'EMA 50', color: '#F59E0B' },
  { key: 'bollinger', label: 'BB', color: '#8d90a2' },
  { key: 'volume', label: 'VOL', color: '#089981' },
  { key: 'rsi', label: 'RSI 14', color: '#b6c4ff' },
];

function formatAxisTime(ts: number, tf: Timeframe): string {
  const d = new Date(ts);
  if (tf === '1D') {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  if (tf === '4H' || tf === '1H') {
    return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${d
      .getHours()
      .toString()
      .padStart(2, '0')}:00`;
  }
  return `${d.getHours().toString().padStart(2, '0')}:${d
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;
}

export const CandlestickChart: React.FC = () => {
  const {
    activeSymbol,
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
    account,
  } = useTerminal();

  const meta = INSTRUMENT_MAP[activeSymbol];
  const quote = quotes[activeSymbol];
  const drawings = drawingsBySymbol[activeSymbol] ?? [];

  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [size, setSize] = useState({ width: 800, height: 460 });
  const [visibleCount, setVisibleCount] = useState<number>(85);
  const [rightOffset, setRightOffset] = useState<number>(6); // empty future bars on right
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [draftTrendStart, setDraftTrendStart] = useState<{ index: number; price: number } | null>(
    null
  );

  const dragRef = useRef<{
    active: boolean;
    startX: number;
    startOffset: number;
  }>({ active: false, startX: 0, startOffset: 6 });

  // Reset pan/zoom slightly when switching symbol or timeframe
  useEffect(() => {
    setVisibleCount(85);
    setRightOffset(6);
    setDraftTrendStart(null);
  }, [activeSymbol, timeframe]);

  // ResizeObserver for crisp high-DPI canvas sizing
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 10 && height > 10) {
          setSize({ width: Math.floor(width), height: Math.floor(height) });
        }
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Precompute technical indicators for current activeCandles
  const computed = useMemo(() => {
    return {
      sma20: calcSMA(activeCandles, 20),
      ema50: calcEMA(activeCandles, 50),
      bb: calcBollingerBands(activeCandles, 20, 2),
      rsi: calcRSI(activeCandles, 14),
    };
  }, [activeCandles]);

  // Active position and working orders for overlay lines
  const activePosition = useMemo(
    () => account.positions.find((p) => p.symbol === activeSymbol),
    [account.positions, activeSymbol]
  );

  const workingOrders = useMemo(
    () => account.orders.filter((o) => o.symbol === activeSymbol && o.status === 'WORKING'),
    [account.orders, activeSymbol]
  );

  // Geometry constants
  const PRICE_AXIS_W = 74;
  const TIME_AXIS_H = 24;
  const plotW = Math.max(100, size.width - PRICE_AXIS_W);
  const totalPlotH = Math.max(120, size.height - TIME_AXIS_H);
  const rsiH = indicators.rsi ? Math.max(72, Math.floor(totalPlotH * 0.22)) : 0;
  const mainH = totalPlotH - rsiH;

  // Compute visible slice indices
  const totalBars = activeCandles.length;
  const endIndexFloat = totalBars - 1 + rightOffset;
  const startIndexFloat = endIndexFloat - visibleCount;
  const startBarIdx = Math.max(0, Math.floor(startIndexFloat));
  const endBarIdx = Math.min(totalBars - 1, Math.ceil(endIndexFloat));

  // Compute price min/max for visible window
  const { minPrice, maxPrice, maxVol } = useMemo(() => {
    let minP = Number.POSITIVE_INFINITY;
    let maxP = Number.NEGATIVE_INFINITY;
    let maxV = 1;

    for (let i = startBarIdx; i <= endBarIdx; i++) {
      const c = activeCandles[i];
      if (!c) continue;
      if (c.low < minP) minP = c.low;
      if (c.high > maxP) maxP = c.high;
      if (c.volume > maxV) maxV = c.volume;

      if (indicators.bollinger) {
        const up = computed.bb.upper[i];
        const lo = computed.bb.lower[i];
        if (up !== null && up > maxP) maxP = up;
        if (lo !== null && lo < minP) minP = lo;
      }
    }

    if (!Number.isFinite(minP) || !Number.isFinite(maxP)) {
      const fallback = quote?.last ?? meta?.basePrice ?? 100;
      minP = fallback * 0.98;
      maxP = fallback * 1.02;
    }

    const pad = (maxP - minP || maxP * 0.01 || 1) * 0.1;
    return {
      minPrice: minP - pad,
      maxPrice: maxP + pad,
      maxVol: maxV,
    };
  }, [activeCandles, startBarIdx, endBarIdx, indicators.bollinger, computed.bb, quote?.last, meta?.basePrice]);

  // Coordinate mappers
  const indexToX = useCallback(
    (idx: number) => ((idx - startIndexFloat) / visibleCount) * plotW,
    [startIndexFloat, visibleCount, plotW]
  );

  const xToIndex = useCallback(
    (x: number) => startIndexFloat + (x / plotW) * visibleCount,
    [startIndexFloat, plotW, visibleCount]
  );

  const priceToY = useCallback(
    (price: number) => {
      const span = maxPrice - minPrice || 1;
      return 12 + ((maxPrice - price) / span) * (mainH - 24);
    },
    [maxPrice, minPrice, mainH]
  );

  const yToPrice = useCallback(
    (y: number) => {
      const span = maxPrice - minPrice || 1;
      return maxPrice - ((y - 12) / (mainH - 24)) * span;
    },
    [maxPrice, minPrice, mainH]
  );

  // Hovered candle for dynamic OHLCV header legend
  const hoveredIndex = useMemo(() => {
    if (!hoverPos || hoverPos.x < 0 || hoverPos.x > plotW) return totalBars - 1;
    const raw = Math.round(xToIndex(hoverPos.x));
    return Math.max(0, Math.min(totalBars - 1, raw));
  }, [hoverPos, plotW, xToIndex, totalBars]);

  const legendCandle = activeCandles[hoveredIndex] ?? activeCandles[totalBars - 1];
  const legendSma = computed.sma20[hoveredIndex];
  const legendEma = computed.ema50[hoveredIndex];
  const legendRsi = computed.rsi[hoveredIndex];

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !meta) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(size.width * dpr);
    canvas.height = Math.floor(size.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // 1. Background fill (#131722 bedrock)
    ctx.fillStyle = '#131722';
    ctx.fillRect(0, 0, size.width, size.height);

    // 2. Gridlines & Price Axis Labels
    const priceLevels = 6;
    ctx.font = '500 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= priceLevels; i++) {
      const frac = i / priceLevels;
      const y = Math.round(12 + frac * (mainH - 24)) + 0.5;
      const priceVal = maxPrice - frac * (maxPrice - minPrice);

      ctx.strokeStyle = '#1E222D';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(plotW, y);
      ctx.stroke();

      ctx.fillStyle = '#787B86';
      ctx.fillText(formatPrice(priceVal, meta.precision), plotW + 8, y);
    }

    // Vertical time gridlines
    const timeTickStep = Math.max(6, Math.round(visibleCount / 7));
    const firstGridIdx = Math.ceil(startBarIdx / timeTickStep) * timeTickStep;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let idx = firstGridIdx; idx <= endBarIdx; idx += timeTickStep) {
      const c = activeCandles[idx];
      if (!c) continue;
      const x = Math.round(indexToX(idx)) + 0.5;
      if (x < 20 || x > plotW - 20) continue;

      ctx.strokeStyle = '#1E222D';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, totalPlotH);
      ctx.stroke();

      ctx.fillStyle = '#787B86';
      ctx.fillText(formatAxisTime(c.time, timeframe), x, totalPlotH + TIME_AXIS_H / 2 + 1);
    }

    // Clip to main price plot area
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, plotW, mainH);
    ctx.clip();

    // 3. Volume Histogram (bottom 18% of main pane)
    const barSpacing = plotW / visibleCount;
    const candleW = Math.max(1.5, Math.min(14, barSpacing * 0.68));

    if (indicators.volume) {
      const volMaxH = mainH * 0.18;
      for (let i = startBarIdx; i <= endBarIdx; i++) {
        const c = activeCandles[i];
        if (!c) continue;
        const x = indexToX(i);
        const h = (c.volume / maxVol) * volMaxH;
        const isUp = c.close >= c.open;
        ctx.fillStyle = isUp ? 'rgba(8, 153, 129, 0.24)' : 'rgba(242, 54, 69, 0.24)';
        ctx.fillRect(x - candleW / 2, mainH - h, candleW, h);
      }
    }

    // 4. Bollinger Bands Channel
    if (indicators.bollinger) {
      ctx.beginPath();
      let started = false;
      for (let i = startBarIdx; i <= endBarIdx; i++) {
        const u = computed.bb.upper[i];
        if (u === null) continue;
        const x = indexToX(i);
        const y = priceToY(u);
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      for (let i = endBarIdx; i >= startBarIdx; i--) {
        const l = computed.bb.lower[i];
        if (l === null) continue;
        ctx.lineTo(indexToX(i), priceToY(l));
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(41, 98, 255, 0.06)';
      ctx.fill();

      const drawBandLine = (arr: (number | null)[], stroke: string, dashed = false) => {
        ctx.beginPath();
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1;
        ctx.setLineDash(dashed ? [3, 3] : []);
        let s = false;
        for (let i = startBarIdx; i <= endBarIdx; i++) {
          const val = arr[i];
          if (val === null) continue;
          const x = indexToX(i);
          const y = priceToY(val);
          if (!s) {
            ctx.moveTo(x, y);
            s = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
        ctx.setLineDash([]);
      };

      drawBandLine(computed.bb.upper, 'rgba(141, 144, 162, 0.55)');
      drawBandLine(computed.bb.lower, 'rgba(141, 144, 162, 0.55)');
      drawBandLine(computed.bb.middle, 'rgba(141, 144, 162, 0.35)', true);
    }

    // 5. Price Series (Candles / Hollow / Area)
    if (chartStyle === 'area') {
      ctx.beginPath();
      let firstX = 0;
      let lastX = 0;
      let started = false;
      for (let i = startBarIdx; i <= endBarIdx; i++) {
        const c = activeCandles[i];
        if (!c) continue;
        const x = indexToX(i);
        const y = priceToY(c.close);
        if (!started) {
          firstX = x;
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
        lastX = x;
      }
      ctx.strokeStyle = '#2962FF';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      if (started) {
        ctx.lineTo(lastX, mainH);
        ctx.lineTo(firstX, mainH);
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, 0, 0, mainH);
        grad.addColorStop(0, 'rgba(41, 98, 255, 0.24)');
        grad.addColorStop(1, 'rgba(41, 98, 255, 0.0)');
        ctx.fillStyle = grad;
        ctx.fill();
      }
    } else {
      for (let i = startBarIdx; i <= endBarIdx; i++) {
        const c = activeCandles[i];
        if (!c) continue;
        const x = Math.round(indexToX(i)) + 0.5;
        const yHigh = priceToY(c.high);
        const yLow = priceToY(c.low);
        const yOpen = priceToY(c.open);
        const yClose = priceToY(c.close);
        const isUp = c.close >= c.open;
        const color = isUp ? '#089981' : '#F23645';

        // Wick
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, yHigh);
        ctx.lineTo(x, yLow);
        ctx.stroke();

        // Body
        const bodyTop = Math.min(yOpen, yClose);
        const bodyH = Math.max(1.2, Math.abs(yClose - yOpen));
        const bodyLeft = x - candleW / 2;

        if (chartStyle === 'hollow' && isUp) {
          ctx.fillStyle = '#131722';
          ctx.fillRect(bodyLeft, bodyTop, candleW, bodyH);
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.1;
          ctx.strokeRect(bodyLeft, bodyTop, candleW, bodyH);
        } else {
          ctx.fillStyle = color;
          ctx.fillRect(bodyLeft, bodyTop, candleW, bodyH);
        }
      }
    }

    // 6. SMA 20 & EMA 50 Overlays
    const drawOverlay = (arr: (number | null)[], color: string) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.4;
      let started = false;
      for (let i = startBarIdx; i <= endBarIdx; i++) {
        const val = arr[i];
        if (val === null) continue;
        const x = indexToX(i);
        const y = priceToY(val);
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    };

    if (indicators.sma20) drawOverlay(computed.sma20, '#2962FF');
    if (indicators.ema50) drawOverlay(computed.ema50, '#F59E0B');

    // 7. User Drawings (Trendlines & Horizontal Price Levels)
    const renderPriceTag = (y: number, label: string, bg: string, alignLeft = false) => {
      ctx.font = '600 10px "JetBrains Mono", monospace';
      const w = ctx.measureText(label).width + 12;
      const x = alignLeft ? 8 : plotW - w - 8;
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.roundRect(x, y - 9, w, 18, 3);
      ctx.fill();
      ctx.fillStyle = '#F0F3FA';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x + 6, y + 0.5);
    };

    for (const d of drawings) {
      if (d.type === 'hline') {
        const y = Math.round(priceToY(d.p1.price)) + 0.5;
        ctx.strokeStyle = '#b6c4ff';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(plotW, y);
        ctx.stroke();
        ctx.setLineDash([]);
        renderPriceTag(y, `LVL ${formatPrice(d.p1.price, meta.precision)}`, '#2A2E39', false);
      } else if (d.type === 'trendline' && d.p2) {
        const x1 = indexToX(d.p1.index);
        const y1 = priceToY(d.p1.price);
        const x2 = indexToX(d.p2.index);
        const y2 = priceToY(d.p2.price);
        ctx.strokeStyle = '#2962FF';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Anchor handles
        ctx.fillStyle = '#2962FF';
        ctx.beginPath();
        ctx.arc(x1, y1, 3, 0, Math.PI * 2);
        ctx.arc(x2, y2, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Active draft trendline preview
    if (draftTrendStart && hoverPos && hoverPos.x <= plotW && hoverPos.y <= mainH) {
      const x1 = indexToX(draftTrendStart.index);
      const y1 = priceToY(draftTrendStart.price);
      ctx.strokeStyle = '#b6c4ff';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(hoverPos.x, hoverPos.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 8. Open Position Entry & TP/SL Bracket Lines
    if (activePosition && quote) {
      const entryY = Math.round(priceToY(activePosition.avgEntry)) + 0.5;
      const mark = activePosition.side === 'LONG' ? quote.bid : quote.ask;
      const posPnl =
        (activePosition.side === 'LONG'
          ? mark - activePosition.avgEntry
          : activePosition.avgEntry - mark) * activePosition.qty;
      const posColor = posPnl >= 0 ? '#089981' : '#F23645';

      if (entryY >= 0 && entryY <= mainH) {
        ctx.strokeStyle = posColor;
        ctx.lineWidth = 1.2;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        ctx.moveTo(0, entryY);
        ctx.lineTo(plotW, entryY);
        ctx.stroke();
        ctx.setLineDash([]);
        renderPriceTag(
          entryY,
          `${activePosition.side} ${activePosition.qty} · ${formatCurrency(posPnl, true)}`,
          posColor,
          true
        );
      }

      if (activePosition.takeProfit !== undefined) {
        const tpY = Math.round(priceToY(activePosition.takeProfit)) + 0.5;
        if (tpY >= 0 && tpY <= mainH) {
          ctx.strokeStyle = '#089981';
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 3]);
          ctx.beginPath();
          ctx.moveTo(0, tpY);
          ctx.lineTo(plotW, tpY);
          ctx.stroke();
          ctx.setLineDash([]);
          renderPriceTag(tpY, `TP ${formatPrice(activePosition.takeProfit, meta.precision)}`, '#089981', true);
        }
      }

      if (activePosition.stopLoss !== undefined) {
        const slY = Math.round(priceToY(activePosition.stopLoss)) + 0.5;
        if (slY >= 0 && slY <= mainH) {
          ctx.strokeStyle = '#F23645';
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 3]);
          ctx.beginPath();
          ctx.moveTo(0, slY);
          ctx.lineTo(plotW, slY);
          ctx.stroke();
          ctx.setLineDash([]);
          renderPriceTag(slY, `SL ${formatPrice(activePosition.stopLoss, meta.precision)}`, '#F23645', true);
        }
      }
    }

    // 9. Working Limit / Stop Order Lines
    for (const ord of workingOrders) {
      if (ord.price === undefined) continue;
      const y = Math.round(priceToY(ord.price)) + 0.5;
      if (y < 0 || y > mainH) continue;
      const color = ord.side === 'BUY' ? '#2962FF' : '#F59E0B';
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(plotW, y);
      ctx.stroke();
      ctx.setLineDash([]);
      renderPriceTag(
        y,
        `${ord.type} ${ord.side} ${ord.qty} @ ${formatPrice(ord.price, meta.precision)}`,
        color,
        true
      );
    }

    // 10. Live Current Price Line
    const latestBar = activeCandles[activeCandles.length - 1];
    if (latestBar) {
      const liveY = Math.round(priceToY(latestBar.close)) + 0.5;
      const isUpBar = latestBar.close >= latestBar.open;
      const liveColor = isUpBar ? '#089981' : '#F23645';
      ctx.strokeStyle = liveColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(0, liveY);
      ctx.lineTo(plotW, liveY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore(); // end main plot clip

    // Live price badge on right axis
    if (latestBar) {
      const liveY = Math.max(10, Math.min(mainH - 10, priceToY(latestBar.close)));
      const isUpBar = latestBar.close >= latestBar.open;
      ctx.fillStyle = isUpBar ? '#089981' : '#F23645';
      ctx.fillRect(plotW + 1, liveY - 9, PRICE_AXIS_W - 2, 18);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '600 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(formatPrice(latestBar.close, meta.precision), plotW + 7, liveY + 0.5);
    }

    // 11. RSI 14 Sub-Pane
    if (indicators.rsi && rsiH > 0) {
      const rsiTop = mainH;
      const rsiPad = 12;
      const rsiToY = (v: number) => rsiTop + rsiPad + ((100 - v) / 100) * (rsiH - rsiPad * 2);

      // Divider
      ctx.strokeStyle = '#2A2E39';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, rsiTop + 0.5);
      ctx.lineTo(size.width, rsiTop + 0.5);
      ctx.stroke();

      // 30-70 shaded zone
      const y70 = rsiToY(70);
      const y30 = rsiToY(30);
      ctx.fillStyle = 'rgba(182, 196, 255, 0.04)';
      ctx.fillRect(0, y70, plotW, y30 - y70);

      // 70 / 30 dashed bounds
      ctx.strokeStyle = '#2A2E39';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(0, y70);
      ctx.lineTo(plotW, y70);
      ctx.moveTo(0, y30);
      ctx.lineTo(plotW, y30);
      ctx.stroke();
      ctx.setLineDash([]);

      // Axis labels 70 / 30
      ctx.fillStyle = '#787B86';
      ctx.font = '500 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('70', plotW + 8, y70);
      ctx.fillText('30', plotW + 8, y30);

      // RSI Line
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, rsiTop, plotW, rsiH);
      ctx.clip();

      ctx.beginPath();
      ctx.strokeStyle = '#b6c4ff';
      ctx.lineWidth = 1.4;
      let started = false;
      for (let i = startBarIdx; i <= endBarIdx; i++) {
        const val = computed.rsi[i];
        if (val === null) continue;
        const x = indexToX(i);
        const y = rsiToY(val);
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      ctx.restore();

      // Sub-pane inline label
      const curRsi = legendRsi ?? computed.rsi[totalBars - 1];
      ctx.fillStyle = '#787B86';
      ctx.font = '500 10px "Inter", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('RSI (14)', 8, rsiTop + 11);
      if (curRsi !== null && curRsi !== undefined) {
        ctx.fillStyle = curRsi > 70 ? '#F23645' : curRsi < 30 ? '#089981' : '#b6c4ff';
        ctx.font = '600 10px "JetBrains Mono", monospace';
        ctx.fillText(curRsi.toFixed(1), 54, rsiTop + 11);
      }
    }

    // 12. Axis Borders
    ctx.strokeStyle = '#2A2E39';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(plotW + 0.5, 0);
    ctx.lineTo(plotW + 0.5, size.height);
    ctx.moveTo(0, totalPlotH + 0.5);
    ctx.lineTo(size.width, totalPlotH + 0.5);
    ctx.stroke();

    // 13. Interactive #2962FF Crosshair + Axis Pill Badges
    if (hoverPos && hoverPos.x >= 0 && hoverPos.x <= plotW && hoverPos.y >= 0 && hoverPos.y <= totalPlotH) {
      const snapIdx = Math.max(0, Math.min(totalBars - 1, Math.round(xToIndex(hoverPos.x))));
      const snapX = Math.round(indexToX(snapIdx)) + 0.5;
      const cursorY = Math.round(hoverPos.y) + 0.5;

      ctx.strokeStyle = 'rgba(41, 98, 255, 0.72)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(snapX, 0);
      ctx.lineTo(snapX, totalPlotH);
      ctx.moveTo(0, cursorY);
      ctx.lineTo(plotW, cursorY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Price pill on right axis (when inside main plot)
      if (hoverPos.y <= mainH) {
        const hoverPrice = yToPrice(hoverPos.y);
        ctx.fillStyle = '#2962FF';
        ctx.fillRect(plotW + 1, cursorY - 9, PRICE_AXIS_W - 2, 18);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '600 11px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(formatPrice(hoverPrice, meta.precision), plotW + 7, cursorY + 0.5);
      }

      // Time pill on bottom axis
      const snapBar = activeCandles[snapIdx];
      if (snapBar) {
        const tLabel = formatAxisTime(snapBar.time, timeframe);
        ctx.font = '600 10px "JetBrains Mono", monospace';
        const tw = ctx.measureText(tLabel).width + 14;
        const tx = Math.max(4, Math.min(plotW - tw - 4, snapX - tw / 2));
        ctx.fillStyle = '#2962FF';
        ctx.fillRect(tx, totalPlotH + 2, tw, TIME_AXIS_H - 4);
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(tLabel, tx + tw / 2, totalPlotH + TIME_AXIS_H / 2 + 0.5);
      }
    }
  }, [
    size,
    meta,
    activeCandles,
    computed,
    indicators,
    chartStyle,
    timeframe,
    startBarIdx,
    endBarIdx,
    visibleCount,
    plotW,
    mainH,
    rsiH,
    totalPlotH,
    minPrice,
    maxPrice,
    maxVol,
    indexToX,
    xToIndex,
    priceToY,
    yToPrice,
    hoverPos,
    drawings,
    draftTrendStart,
    activePosition,
    workingOrders,
    quote,
    legendRsi,
    totalBars,
  ]);

  // Pointer & Wheel Handlers
  const getCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pt = getCanvasPoint(e);
    if (pt.x > plotW || pt.y > mainH) return;

    if (drawingTool === 'hline') {
      const price = yToPrice(pt.y);
      addDrawing(activeSymbol, {
        id: `drw-${Date.now()}`,
        type: 'hline',
        p1: { index: Math.round(xToIndex(pt.x)), price },
      });
      setDrawingTool('crosshair');
      return;
    }

    if (drawingTool === 'trendline') {
      const idx = xToIndex(pt.x);
      const price = yToPrice(pt.y);
      if (!draftTrendStart) {
        setDraftTrendStart({ index: idx, price });
      } else {
        addDrawing(activeSymbol, {
          id: `drw-${Date.now()}`,
          type: 'trendline',
          p1: draftTrendStart,
          p2: { index: idx, price },
        });
        setDraftTrendStart(null);
        setDrawingTool('crosshair');
      }
      return;
    }

    // Pan chart in crosshair mode
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startOffset: rightOffset,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pt = getCanvasPoint(e);
    setHoverPos(pt);

    if (dragRef.current.active) {
      const dx = e.clientX - dragRef.current.startX;
      const barsMoved = (dx / plotW) * visibleCount;
      const nextOffset = Math.max(
        -(totalBars - 15),
        Math.min(40, dragRef.current.startOffset - barsMoved)
      );
      setRightOffset(nextOffset);
    }
  };

  const handleMouseUp = () => {
    dragRef.current.active = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.12 : 0.89;
    setVisibleCount((prev) => Math.max(20, Math.min(180, Math.round(prev * factor))));
  };

  if (!meta || !quote) return null;
  const isUp = quote.changePercent >= 0;

  return (
    <section className="flex-1 min-w-0 h-full bg-[#131722] flex flex-col select-none overflow-hidden">
      {/* Chart Micro-Toolbar */}
      <div className="min-h-[40px] px-2.5 py-1 bg-[#1E222D] border-b border-[#2A2E39] flex flex-wrap items-center justify-between gap-2 shrink-0">
        {/* Active Symbol + Price Summary */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-[#F0F3FA] shrink-0"
              style={{
                backgroundColor: `${meta.badgeColor}26`,
                border: `1px solid ${meta.badgeColor}66`,
              }}
            >
              {meta.symbol.slice(0, 2)}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[14px] font-bold text-[#F0F3FA] tracking-tight">
                {meta.symbol}
              </span>
              <span className="text-[11px] text-[#787B86] hidden sm:inline truncate max-w-[130px]">
                {meta.name}
              </span>
              <span className="text-[10px] font-num text-[#50535E] hidden md:inline">
                {meta.exchange}
              </span>
            </div>
          </div>

          <span className="w-px h-4 bg-[#2A2E39]" />

          <div className="flex items-center gap-2">
            <span className="font-num text-[15px] font-semibold text-[#F0F3FA]">
              {formatPrice(quote.last, meta.precision)}
            </span>
            <span
              className={`font-num text-[11px] font-medium px-2 py-0.5 rounded-full ${
                isUp
                  ? 'text-[#089981] bg-[#089981]/12'
                  : 'text-[#F23645] bg-[#F23645]/12'
              }`}
            >
              {formatPercent(quote.changePercent)} {isUp ? '▲' : '▼'}
            </span>
          </div>
        </div>

        {/* Timeframe + Style + Indicator + Drawing Controls */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Timeframes */}
          <div className="flex items-center bg-[#131722] border border-[#2A2E39] rounded p-0.5">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setTimeframe(tf)}
                className={`px-2 py-0.5 font-num text-[11px] rounded-[3px] transition-colors cursor-pointer ${
                  timeframe === tf
                    ? 'bg-[#2962FF] text-white font-semibold'
                    : 'text-[#787B86] hover:text-[#F0F3FA] hover:bg-[#2A2E39]'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Chart Style */}
          <div className="hidden sm:flex items-center bg-[#131722] border border-[#2A2E39] rounded p-0.5">
            {CHART_STYLES.map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setChartStyle(st.id)}
                className={`px-2 py-0.5 text-[11px] rounded-[3px] transition-colors cursor-pointer ${
                  chartStyle === st.id
                    ? 'bg-[#2A2E39] text-[#F0F3FA] font-medium'
                    : 'text-[#787B86] hover:text-[#F0F3FA]'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Indicators */}
          <div className="flex items-center bg-[#131722] border border-[#2A2E39] rounded p-0.5 gap-0.5">
            {INDICATOR_TOGGLES.map((ind) => {
              const on = indicators[ind.key];
              return (
                <button
                  key={ind.key}
                  type="button"
                  onClick={() => toggleIndicator(ind.key)}
                  className={`px-1.5 py-0.5 text-[11px] font-medium rounded-[3px] transition-colors cursor-pointer flex items-center gap-1 ${
                    on
                      ? 'bg-[#2A2E39] text-[#F0F3FA]'
                      : 'text-[#50535E] hover:text-[#787B86]'
                  }`}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: on ? ind.color : '#434651' }}
                  />
                  <span>{ind.label}</span>
                </button>
              );
            })}
          </div>

          {/* Drawing Tools */}
          <div className="flex items-center bg-[#131722] border border-[#2A2E39] rounded p-0.5 gap-0.5">
            {(
              [
                { id: 'crosshair', icon: <Crosshair className="w-3.5 h-3.5" />, label: 'Crosshair & Pan' },
                { id: 'trendline', icon: <TrendingUp className="w-3.5 h-3.5" />, label: 'Draw Trendline (2 clicks)' },
                { id: 'hline', icon: <Minus className="w-3.5 h-3.5" />, label: 'Draw Horizontal Level' },
              ] as { id: DrawingTool; icon: React.ReactNode; label: string }[]
            ).map((tool) => (
              <button
                key={tool.id}
                type="button"
                onClick={() => {
                  setDrawingTool(tool.id);
                  setDraftTrendStart(null);
                }}
                title={tool.label}
                aria-label={tool.label}
                className={`p-1 rounded-[3px] transition-colors cursor-pointer ${
                  drawingTool === tool.id
                    ? 'bg-[#2962FF] text-white'
                    : 'text-[#787B86] hover:text-[#F0F3FA] hover:bg-[#2A2E39]'
                }`}
              >
                {tool.icon}
              </button>
            ))}

            {drawings.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => undoDrawing(activeSymbol)}
                  title="Undo last drawing"
                  className="p-1 rounded-[3px] text-[#787B86] hover:text-[#F0F3FA] hover:bg-[#2A2E39] cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => clearDrawings(activeSymbol)}
                  title="Clear all drawings on chart"
                  className="p-1 rounded-[3px] text-[#787B86] hover:text-[#F23645] hover:bg-[#2A2E39] cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => {
                setVisibleCount(85);
                setRightOffset(6);
              }}
              title="Reset zoom & fit latest bars"
              className="p-1 rounded-[3px] text-[#787B86] hover:text-[#F0F3FA] hover:bg-[#2A2E39] cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Canvas Viewport */}
      <div ref={containerRef} className="relative flex-1 min-h-[240px] w-full overflow-hidden">
        {/* Floating OHLCV + Indicator Legend */}
        {legendCandle && (
          <div className="pointer-events-none absolute top-2 left-2.5 z-10 flex flex-wrap items-center gap-x-3 gap-y-0.5 bg-[#131722]/85 backdrop-blur-[2px] px-2 py-1 rounded border border-[#2A2E39]/70 text-[11px]">
            <span className="font-num text-[#787B86]">
              O{' '}
              <span className="text-[#F0F3FA]">
                {formatPrice(legendCandle.open, meta.precision)}
              </span>
            </span>
            <span className="font-num text-[#787B86]">
              H{' '}
              <span className="text-[#089981]">
                {formatPrice(legendCandle.high, meta.precision)}
              </span>
            </span>
            <span className="font-num text-[#787B86]">
              L{' '}
              <span className="text-[#F23645]">
                {formatPrice(legendCandle.low, meta.precision)}
              </span>
            </span>
            <span className="font-num text-[#787B86]">
              C{' '}
              <span
                className={
                  legendCandle.close >= legendCandle.open ? 'text-[#089981]' : 'text-[#F23645]'
                }
              >
                {formatPrice(legendCandle.close, meta.precision)}
              </span>
            </span>
            <span className="font-num text-[#787B86]">
              Vol{' '}
              <span className="text-[#F0F3FA]">{formatCompactNumber(legendCandle.volume)}</span>
            </span>
            {indicators.sma20 && legendSma !== null && legendSma !== undefined && (
              <span className="font-num text-[#2962FF]">
                SMA20 {formatPrice(legendSma, meta.precision)}
              </span>
            )}
            {indicators.ema50 && legendEma !== null && legendEma !== undefined && (
              <span className="font-num text-[#F59E0B]">
                EMA50 {formatPrice(legendEma, meta.precision)}
              </span>
            )}
          </div>
        )}

        {/* Active Drawing Prompt Hint */}
        {drawingTool !== 'crosshair' && (
          <div className="pointer-events-none absolute bottom-8 left-2.5 z-10 px-2.5 py-1 rounded bg-[#2962FF] text-white text-[11px] font-medium">
            {drawingTool === 'hline'
              ? 'Click anywhere on chart to place horizontal price level'
              : draftTrendStart
                ? 'Click second point to complete trendline'
                : 'Click start point for trendline'}
          </div>
        )}

        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            dragRef.current.active = false;
            setHoverPos(null);
          }}
          onWheel={handleWheel}
          className={`block w-full h-full ${
            drawingTool === 'crosshair' ? 'cursor-crosshair' : 'cursor-cell'
          }`}
        />
      </div>
    </section>
  );
};
