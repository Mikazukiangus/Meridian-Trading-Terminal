import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTerminal } from '../context/TerminalContext';
import {
  INSTRUMENTS,
  formatCompactNumber,
  formatPercent,
  formatPrice,
} from '../data/instruments';
import { AssetClass, InstrumentMeta, InstrumentQuote } from '../types/terminal';

type SizeMetric = 'weight' | 'volume' | 'volatility';

interface TreemapInput {
  id: string;
  value: number;
}

interface LayoutRect<T> {
  item: T;
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Deterministic recursive binary treemap splitter that keeps tile aspect ratios balanced
 * and guarantees 100% crisp coverage of the bounding box without overlaps.
 */
function layoutBinaryTreemap<T extends TreemapInput>(
  items: T[],
  x: number,
  y: number,
  w: number,
  h: number
): LayoutRect<T>[] {
  if (items.length === 0 || w <= 0 || h <= 0) return [];
  if (items.length === 1) {
    return [{ item: items[0], x, y, w, h }];
  }

  const sorted = [...items].sort((a, b) => b.value - a.value);
  const total = sorted.reduce((acc, it) => acc + Math.max(0.001, it.value), 0);
  const half = total / 2;

  let acc = 0;
  let splitIdx = 1;
  for (let i = 0; i < sorted.length - 1; i++) {
    acc += Math.max(0.001, sorted[i].value);
    splitIdx = i + 1;
    if (acc >= half) break;
  }

  const leftItems = sorted.slice(0, splitIdx);
  const rightItems = sorted.slice(splitIdx);
  const leftSum = leftItems.reduce((s, it) => s + Math.max(0.001, it.value), 0);
  const ratio = leftSum / total;

  if (w >= h) {
    const lw = w * ratio;
    return [
      ...layoutBinaryTreemap(leftItems, x, y, lw, h),
      ...layoutBinaryTreemap(rightItems, x + lw, y, w - lw, h),
    ];
  } else {
    const lh = h * ratio;
    return [
      ...layoutBinaryTreemap(leftItems, x, y, w, lh),
      ...layoutBinaryTreemap(rightItems, x, y + lh, w, h - lh),
    ];
  }
}

function getHeatColor(changePct: number): { bg: string; hover: string } {
  if (changePct >= 3.0) return { bg: '#089981', hover: '#0ab095' };
  if (changePct >= 1.5) return { bg: '#0a7565', hover: '#0d8876' };
  if (changePct >= 0.4) return { bg: '#13524a', hover: '#19665c' };
  if (changePct > -0.4) return { bg: '#2A2E39', hover: '#363A45' };
  if (changePct > -1.5) return { bg: '#5c242f', hover: '#702d3a' };
  if (changePct > -3.0) return { bg: '#992736', hover: '#b02e3f' };
  return { bg: '#F23645', hover: '#ff4957' };
}

export const MarketHeatmap: React.FC = () => {
  const { quotes, selectSymbol } = useTerminal();

  const [assetFilter, setAssetFilter] = useState<'ALL' | AssetClass>('ALL');
  const [sizeMetric, setSizeMetric] = useState<SizeMetric>('weight');
  const [hovered, setHovered] = useState<{
    meta: InstrumentMeta;
    quote: InstrumentQuote;
    clientX: number;
    clientY: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [bounds, setBounds] = useState({ width: 1100, height: 620 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 40 && height > 40) {
          setBounds({ width: Math.floor(width), height: Math.floor(height) });
        }
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Group filtered instruments by sector and compute nested treemap rectangles
  const sectorLayouts = useMemo(() => {
    const filtered = INSTRUMENTS.filter((inst) =>
      assetFilter === 'ALL' ? true : inst.assetClass === assetFilter
    );

    const getVal = (inst: InstrumentMeta): number => {
      const q = quotes[inst.symbol];
      if (sizeMetric === 'volume') return Math.max(1, q?.volume24h ?? inst.baseVolume24h);
      if (sizeMetric === 'volatility') {
        return Math.max(0.2, q?.volatility24h ?? inst.volatility * 500);
      }
      return Math.max(40, inst.marketCapWeight);
    };

    const groupedMap = new Map<string, InstrumentMeta[]>();
    for (const inst of filtered) {
      const key = `${inst.assetClass} · ${inst.sector}`;
      const list = groupedMap.get(key) ?? [];
      list.push(inst);
      groupedMap.set(key, list);
    }

    const sectorGroups = Array.from(groupedMap.entries()).map(([id, items]) => ({
      id,
      items,
      value: items.reduce((s, i) => s + getVal(i), 0),
    }));

    const outerRects = layoutBinaryTreemap(sectorGroups, 0, 0, bounds.width, bounds.height);

    return outerRects.map((secRect) => {
      const headerH = 22;
      const pad = 2;
      const innerX = secRect.x + pad;
      const innerY = secRect.y + headerH;
      const innerW = Math.max(0, secRect.w - pad * 2);
      const innerH = Math.max(0, secRect.h - headerH - pad);

      const tileInputs = secRect.item.items.map((inst) => ({
        id: inst.symbol,
        meta: inst,
        value: getVal(inst),
      }));

      const tiles = layoutBinaryTreemap(tileInputs, innerX, innerY, innerW, innerH);
      return {
        sectorName: secRect.item.id,
        x: secRect.x,
        y: secRect.y,
        w: secRect.w,
        h: secRect.h,
        tiles,
      };
    });
  }, [assetFilter, sizeMetric, quotes, bounds]);

  return (
    <main className="flex-1 min-h-0 flex flex-col bg-[#131722] overflow-hidden select-none">
      {/* Heatmap Control Bar */}
      <div className="px-4 py-2 bg-[#1E222D] border-b border-[#2A2E39] flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Asset Class Tabs */}
          <div className="flex items-center bg-[#131722] border border-[#2A2E39] rounded p-0.5">
            {(['ALL', 'Equities', 'Crypto', 'FX'] as const).map((cls) => (
              <button
                key={cls}
                type="button"
                onClick={() => setAssetFilter(cls)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-[3px] transition-colors cursor-pointer ${
                  assetFilter === cls
                    ? 'bg-[#2962FF] text-white'
                    : 'text-[#787B86] hover:text-[#F0F3FA]'
                }`}
              >
                {cls === 'ALL' ? 'All Markets' : cls}
              </button>
            ))}
          </div>

          {/* Tile Size Metric */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-[#787B86]">Size by</span>
            <div className="flex items-center bg-[#131722] border border-[#2A2E39] rounded p-0.5">
              {(
                [
                  { id: 'weight', label: 'Market Weight' },
                  { id: 'volume', label: '24h Volume' },
                  { id: 'volatility', label: 'Volatility' },
                ] as { id: SizeMetric; label: string }[]
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSizeMetric(m.id)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-[3px] transition-colors cursor-pointer ${
                    sizeMetric === m.id
                      ? 'bg-[#2A2E39] text-[#F0F3FA]'
                      : 'text-[#787B86] hover:text-[#F0F3FA]'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Heat Scale Legend */}
        <div className="flex items-center gap-1.5 text-[10px] font-num text-[#787B86]">
          <span>-3%+</span>
          <div className="flex items-center gap-0.5">
            {['#F23645', '#992736', '#5c242f', '#2A2E39', '#13524a', '#0a7565', '#089981'].map(
              (hex) => (
                <span
                  key={hex}
                  className="w-5 h-3 rounded-[2px]"
                  style={{ backgroundColor: hex }}
                />
              )
            )}
          </div>
          <span>+3%+</span>
        </div>
      </div>

      {/* Treemap Viewport */}
      <div className="flex-1 min-h-0 p-2 overflow-hidden">
        <div ref={containerRef} className="relative w-full h-full bg-[#0f131e] rounded overflow-hidden">
          {sectorLayouts.map((sec) => (
            <React.Fragment key={sec.sectorName}>
              {/* Sector Container Frame & Label */}
              <div
                style={{
                  left: sec.x,
                  top: sec.y,
                  width: sec.w,
                  height: sec.h,
                }}
                className="absolute border border-[#131722] bg-[#131722] pointer-events-none"
              >
                <div className="h-[22px] px-2 flex items-center text-[10px] font-semibold uppercase tracking-[0.04em] text-[#787B86] truncate">
                  {sec.sectorName}
                </div>
              </div>

              {/* Individual Asset Tiles */}
              {sec.tiles.map((t) => {
                const meta = t.item.meta;
                const q = quotes[meta.symbol];
                if (!q) return null;
                const { bg } = getHeatColor(q.changePercent);
                const showName = t.w > 135 && t.h > 82;
                const showPrice = t.w > 78 && t.h > 54;
                const showChange = t.w > 48 && t.h > 34;

                return (
                  <button
                    key={meta.symbol}
                    type="button"
                    onClick={() => selectSymbol(meta.symbol, true)}
                    onMouseEnter={(e) =>
                      setHovered({
                        meta,
                        quote: q,
                        clientX: e.clientX,
                        clientY: e.clientY,
                      })
                    }
                    onMouseMove={(e) =>
                      setHovered({
                        meta,
                        quote: q,
                        clientX: e.clientX,
                        clientY: e.clientY,
                      })
                    }
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      left: t.x + 1,
                      top: t.y + 1,
                      width: Math.max(0, t.w - 2),
                      height: Math.max(0, t.h - 2),
                      backgroundColor: bg,
                    }}
                    className="absolute rounded-[2px] border border-[#131722]/70 hover:brightness-110 transition-all duration-150 flex flex-col items-center justify-center p-1.5 overflow-hidden text-center cursor-pointer"
                  >
                    <span
                      className={`font-bold text-[#F0F3FA] tracking-tight leading-tight truncate max-w-full ${
                        t.w > 150 && t.h > 95 ? 'text-[16px]' : t.w > 80 ? 'text-[13px]' : 'text-[11px]'
                      }`}
                    >
                      {meta.symbol}
                    </span>
                    {showName && (
                      <span className="text-[11px] text-[#F0F3FA]/75 truncate max-w-full mt-0.5">
                        {meta.name}
                      </span>
                    )}
                    {showChange && (
                      <span
                        className={`font-num font-semibold text-[#F0F3FA] mt-0.5 ${
                          t.w > 150 && t.h > 95 ? 'text-[14px]' : 'text-[11px]'
                        }`}
                      >
                        {formatPercent(q.changePercent)}
                      </span>
                    )}
                    {showPrice && (
                      <span className="font-num text-[10px] text-[#F0F3FA]/80 mt-0.5">
                        {formatPrice(q.last, meta.precision)}
                      </span>
                    )}
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Elevated Level-2 Hover Inspector */}
      {hovered && (
        <div
          style={{
            left: Math.min(window.innerWidth - 250, hovered.clientX + 14),
            top: Math.min(window.innerHeight - 170, hovered.clientY + 14),
          }}
          className="terminal-popover fixed z-50 w-[236px] rounded p-3 pointer-events-none"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-[13px] text-[#F0F3FA]">{hovered.meta.symbol}</span>
            <span
              className={`font-num text-[11px] font-medium px-1.5 py-0.5 rounded-full ${
                hovered.quote.changePercent >= 0
                  ? 'text-[#089981] bg-[#089981]/12'
                  : 'text-[#F23645] bg-[#F23645]/12'
              }`}
            >
              {formatPercent(hovered.quote.changePercent)}
            </span>
          </div>
          <div className="text-[11px] text-[#787B86] mb-2 truncate">
            {hovered.meta.name} · {hovered.meta.sector}
          </div>
          <div className="space-y-1 text-[11px] border-t border-[#434651]/60 pt-2">
            <div className="flex justify-between">
              <span className="text-[#787B86]">Last Price</span>
              <span className="font-num text-[#F0F3FA] font-medium">
                {formatPrice(hovered.quote.last, hovered.meta.precision)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#787B86]">24h Range</span>
              <span className="font-num text-[#F0F3FA]">
                {formatPrice(hovered.quote.low24h, Math.min(2, hovered.meta.precision))} –{' '}
                {formatPrice(hovered.quote.high24h, Math.min(2, hovered.meta.precision))}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#787B86]">24h Volume</span>
              <span className="font-num text-[#F0F3FA]">
                {formatCompactNumber(hovered.quote.volume24h)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#787B86]">RSI (14)</span>
              <span className="font-num text-[#F0F3FA]">{hovered.quote.rsi14.toFixed(1)}</span>
            </div>
          </div>
          <div className="mt-2 pt-1.5 border-t border-[#434651]/60 text-[10px] text-[#b6c4ff]">
            Click tile to open in Terminal Chart
          </div>
        </div>
      )}
    </main>
  );
};
