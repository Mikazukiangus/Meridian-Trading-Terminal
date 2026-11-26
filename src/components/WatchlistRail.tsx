import React, { useMemo, useState } from 'react';
import { Search, Star, X } from 'lucide-react';
import { useTerminal } from '../context/TerminalContext';
import { INSTRUMENTS, formatPercent, formatPrice } from '../data/instruments';
import { AssetClass } from '../types/terminal';

type WatchlistFilter = 'ALL' | AssetClass | 'STARRED';

interface WatchlistRailProps {
  onSelectCloseDrawer?: () => void;
}

const FILTER_TABS: { id: WatchlistFilter; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'Equities', label: 'Equities' },
  { id: 'Crypto', label: 'Crypto' },
  { id: 'FX', label: 'FX' },
  { id: 'STARRED', label: '★' },
];

function MiniSparkline({ points, isUp }: { points: number[]; isUp: boolean }) {
  if (!points || points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const w = 44;
  const h = 18;

  const coords = points
    .map((val, idx) => {
      const x = (idx / (points.length - 1)) * w;
      const y = h - 2 - ((val - min) / range) * (h - 4);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0 overflow-visible">
      <polyline
        fill="none"
        stroke={isUp ? '#089981' : '#F23645'}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={coords}
      />
    </svg>
  );
}

export const WatchlistRail: React.FC<WatchlistRailProps> = ({ onSelectCloseDrawer }) => {
  const { activeSymbol, selectSymbol, quotes, favorites, toggleFavorite, account } = useTerminal();
  const [filter, setFilter] = useState<WatchlistFilter>('ALL');
  const [query, setQuery] = useState('');

  const positionSymbols = useMemo(
    () => new Set(account.positions.map((p) => p.symbol)),
    [account.positions]
  );

  const filteredInstruments = useMemo(() => {
    const q = query.trim().toLowerCase();
    return INSTRUMENTS.filter((inst) => {
      if (filter === 'STARRED' && !favorites.includes(inst.symbol)) return false;
      if (filter !== 'ALL' && filter !== 'STARRED' && inst.assetClass !== filter) return false;
      if (q) {
        return (
          inst.symbol.toLowerCase().includes(q) ||
          inst.name.toLowerCase().includes(q) ||
          inst.sector.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [filter, query, favorites]);

  return (
    <aside className="w-full h-full bg-[#1E222D] border-r border-[#2A2E39] flex flex-col select-none">
      {/* Header + Filter Tabs */}
      <div className="px-2.5 pt-2 pb-1.5 border-b border-[#2A2E39] shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#787B86]">
            Watchlist
          </span>
          <span className="font-num text-[11px] text-[#50535E]">
            {filteredInstruments.length} / {INSTRUMENTS.length}
          </span>
        </div>

        {/* Compact Search */}
        <div className="relative mb-2">
          <Search className="w-3.5 h-3.5 text-[#787B86] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter ticker or name..."
            className="w-full h-[30px] pl-8 pr-7 bg-[#131722] border border-[#2A2E39] focus:border-[#2962FF] focus:outline-none rounded text-[12px] text-[#F0F3FA] placeholder:text-[#50535E]"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#787B86] hover:text-[#F0F3FA] cursor-pointer"
              aria-label="Clear filter"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Asset Class Tabs */}
        <div className="flex items-center gap-0.5 bg-[#131722] p-0.5 rounded border border-[#2A2E39]">
          {FILTER_TABS.map((tab) => {
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`flex-1 py-1 text-[11px] font-medium rounded-[3px] transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-[#2A2E39] text-[#F0F3FA]'
                    : 'text-[#787B86] hover:text-[#F0F3FA]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Column Subheader */}
      <div className="h-[26px] px-2.5 bg-[#131722] border-b border-[#2A2E39] flex items-center justify-between text-[10px] uppercase tracking-[0.04em] text-[#787B86] shrink-0">
        <span>Symbol</span>
        <div className="flex items-center gap-5">
          <span>Trend</span>
          <span className="w-[78px] text-right">Last / Chg%</span>
        </div>
      </div>

      {/* Instrument List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#2A2E39]/60">
        {filteredInstruments.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-[12px] text-[#787B86] mb-2">No matching instruments</p>
            <button
              type="button"
              onClick={() => {
                setFilter('ALL');
                setQuery('');
              }}
              className="text-[11px] text-[#2962FF] hover:underline cursor-pointer"
            >
              Reset watchlist filters
            </button>
          </div>
        ) : (
          filteredInstruments.map((inst) => {
            const quote = quotes[inst.symbol];
            if (!quote) return null;
            const isSelected = activeSymbol === inst.symbol;
            const isUp = quote.changePercent >= 0;
            const isFav = favorites.includes(inst.symbol);
            const hasPos = positionSymbols.has(inst.symbol);
            const flashClass =
              quote.tickDirection === 'up'
                ? 'tick-flash-up'
                : quote.tickDirection === 'down'
                  ? 'tick-flash-down'
                  : '';

            return (
              <div
                key={inst.symbol}
                onClick={() => {
                  selectSymbol(inst.symbol);
                  onSelectCloseDrawer?.();
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    selectSymbol(inst.symbol);
                    onSelectCloseDrawer?.();
                  }
                }}
                className={`group px-2.5 py-2 flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-[#2A2E39]'
                    : 'hover:bg-[#2A2E39]/60'
                }`}
              >
                {/* Left: Avatar + Ticker + Name */}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(inst.symbol);
                    }}
                    className={`shrink-0 transition-colors cursor-pointer ${
                      isFav
                        ? 'text-[#F59E0B]'
                        : 'text-[#50535E] opacity-60 group-hover:opacity-100 hover:text-[#F0F3FA]'
                    }`}
                    title={isFav ? 'Remove from Starred' : 'Add to Starred'}
                    aria-label={`Toggle favorite for ${inst.symbol}`}
                  >
                    <Star className={`w-3 h-3 ${isFav ? 'fill-current' : ''}`} />
                  </button>

                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-[#F0F3FA] shrink-0"
                    style={{
                      backgroundColor: `${inst.badgeColor}26`,
                      border: `1px solid ${inst.badgeColor}66`,
                    }}
                  >
                    {inst.symbol.slice(0, 2)}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[12px] font-bold text-[#F0F3FA] tracking-tight truncate">
                        {inst.symbol}
                      </span>
                      {hasPos && (
                        <span
                          className="text-[9px] font-num font-semibold px-1 rounded bg-[#2962FF]/20 text-[#b6c4ff]"
                          title="Active Position"
                        >
                          POS
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#787B86] truncate">{inst.name}</div>
                  </div>
                </div>

                {/* Middle: Mini Sparkline */}
                <MiniSparkline points={quote.sparkline} isUp={isUp} />

                {/* Right: Monospace Price + Delta Pill */}
                <div
                  key={`${inst.symbol}-${quote.tickSeq}`}
                  className={`flex flex-col items-end shrink-0 min-w-[78px] rounded px-1 -mr-1 ${flashClass}`}
                >
                  <span className="font-num text-[12px] font-medium text-[#F0F3FA] leading-[16px]">
                    {formatPrice(quote.last, inst.precision)}
                  </span>
                  <span
                    className={`mt-0.5 font-num text-[10px] font-medium px-1.5 py-[1px] rounded-full leading-[13px] ${
                      isUp
                        ? 'text-[#089981] bg-[#089981]/12'
                        : 'text-[#F23645] bg-[#F23645]/12'
                    }`}
                  >
                    {formatPercent(quote.changePercent)} {isUp ? '▲' : '▼'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
