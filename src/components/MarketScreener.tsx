import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Search, Star, X } from 'lucide-react';
import { useTerminal } from '../context/TerminalContext';
import {
  INSTRUMENTS,
  formatCompactNumber,
  formatPercent,
  formatPrice,
} from '../data/instruments';
import { AssetClass } from '../types/terminal';

type SortKey =
  | 'symbol'
  | 'last'
  | 'changePercent'
  | 'spreadBps'
  | 'volume24h'
  | 'rsi14'
  | 'volatility24h';

type PerfFilter = 'ALL' | 'GAINERS' | 'LOSERS' | 'VOLATILE';
type SignalFilter = 'ALL' | 'RSI_OVERSOLD' | 'RSI_OVERBOUGHT' | 'ABOVE_SMA' | 'BELOW_SMA';

function RowSparkline({ points, isUp }: { points: number[]; isUp: boolean }) {
  if (!points || points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const w = 56;
  const h = 18;
  const coords = points
    .map((val, idx) => {
      const x = (idx / (points.length - 1)) * w;
      const y = h - 2 - ((val - min) / range) * (h - 4);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="inline-block overflow-visible">
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

export const MarketScreener: React.FC = () => {
  const { quotes, favorites, toggleFavorite, selectSymbol } = useTerminal();

  const [assetFilter, setAssetFilter] = useState<'ALL' | AssetClass>('ALL');
  const [sectorFilter, setSectorFilter] = useState<string>('ALL');
  const [perfFilter, setPerfFilter] = useState<PerfFilter>('ALL');
  const [signalFilter, setSignalFilter] = useState<SignalFilter>('ALL');
  const [query, setQuery] = useState<string>('');
  const [sortKey, setSortKey] = useState<SortKey>('changePercent');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const sectors = useMemo(() => {
    const set = new Set(INSTRUMENTS.map((i) => i.sector));
    return ['ALL', ...Array.from(set).sort()];
  }, []);

  const rows = useMemo(() => {
    return INSTRUMENTS.map((meta) => {
      const q = quotes[meta.symbol];
      const spreadBps = q && q.last > 0 ? ((q.ask - q.bid) / q.last) * 10_000 : meta.spreadBps;
      const rangePos =
        q && q.high24h > q.low24h
          ? Math.max(0, Math.min(100, ((q.last - q.low24h) / (q.high24h - q.low24h)) * 100))
          : 50;
      return { meta, q, spreadBps, rangePos };
    });
  }, [quotes]);

  // Breadth & top movers KPI metrics
  const summary = useMemo(() => {
    let advancers = 0;
    let decliners = 0;
    let totalVol = 0;
    let topGainer = rows[0];
    let topLoser = rows[0];

    for (const r of rows) {
      if (!r.q) continue;
      if (r.q.changePercent >= 0) advancers++;
      else decliners++;
      totalVol += r.q.volume24h;
      if (topGainer?.q && r.q.changePercent > topGainer.q.changePercent) topGainer = r;
      if (topLoser?.q && r.q.changePercent < topLoser.q.changePercent) topLoser = r;
    }

    return { advancers, decliners, totalVol, topGainer, topLoser };
  }, [rows]);

  const filteredSortedRows = useMemo(() => {
    const text = query.trim().toLowerCase();

    const filtered = rows.filter(({ meta, q }) => {
      if (!q) return false;
      if (assetFilter !== 'ALL' && meta.assetClass !== assetFilter) return false;
      if (sectorFilter !== 'ALL' && meta.sector !== sectorFilter) return false;

      if (perfFilter === 'GAINERS' && q.changePercent < 0) return false;
      if (perfFilter === 'LOSERS' && q.changePercent >= 0) return false;
      if (perfFilter === 'VOLATILE' && q.volatility24h < 2.2) return false;

      if (signalFilter === 'RSI_OVERSOLD' && q.rsi14 >= 35) return false;
      if (signalFilter === 'RSI_OVERBOUGHT' && q.rsi14 <= 65) return false;
      if (signalFilter === 'ABOVE_SMA' && q.last < q.sma20) return false;
      if (signalFilter === 'BELOW_SMA' && q.last >= q.sma20) return false;

      if (text) {
        return (
          meta.symbol.toLowerCase().includes(text) ||
          meta.name.toLowerCase().includes(text) ||
          meta.sector.toLowerCase().includes(text)
        );
      }
      return true;
    });

    filtered.sort((a, b) => {
      let av = 0;
      let bv = 0;
      if (sortKey === 'symbol') {
        const cmp = a.meta.symbol.localeCompare(b.meta.symbol);
        return sortDir === 'asc' ? cmp : -cmp;
      } else if (sortKey === 'spreadBps') {
        av = a.spreadBps;
        bv = b.spreadBps;
      } else {
        av = a.q?.[sortKey] ?? 0;
        bv = b.q?.[sortKey] ?? 0;
      }
      return sortDir === 'asc' ? av - bv : bv - av;
    });

    return filtered;
  }, [rows, assetFilter, sectorFilter, perfFilter, signalFilter, query, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'symbol' ? 'asc' : 'desc');
    }
  };

  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sortDir === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-[#2962FF]" />
    ) : (
      <ArrowDown className="w-3 h-3 text-[#2962FF]" />
    );
  };

  const advPct =
    rows.length > 0 ? Math.round((summary.advancers / rows.length) * 100) : 50;

  return (
    <main className="flex-1 min-h-0 flex flex-col bg-[#131722] overflow-hidden select-none">
      {/* Summary Breadth KPI Strip */}
      <div className="px-4 py-3 bg-[#131722] border-b border-[#2A2E39] grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 shrink-0">
        {/* Market Breadth */}
        <div className="p-3 rounded bg-[#1E222D] border border-[#2A2E39]">
          <div className="flex items-center justify-between text-[11px] text-[#787B86] mb-1.5">
            <span>Market Breadth</span>
            <span className="font-num">
              <span className="text-[#089981]">{summary.advancers} Up</span>
              <span className="mx-1 text-[#50535E]">/</span>
              <span className="text-[#F23645]">{summary.decliners} Down</span>
            </span>
          </div>
          <div className="h-2 w-full rounded bg-[#F23645]/80 overflow-hidden flex">
            <div
              className="h-full bg-[#089981] transition-all duration-300"
              style={{ width: `${advPct}%` }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between font-num text-[11px] text-[#787B86]">
            <span>{advPct}% Advancers</span>
            <span>{100 - advPct}% Decliners</span>
          </div>
        </div>

        {/* 24h Simulated Volume */}
        <div className="p-3 rounded bg-[#1E222D] border border-[#2A2E39] flex flex-col justify-between">
          <div className="text-[11px] text-[#787B86]">Aggregate 24h Volume</div>
          <div className="font-num text-[20px] font-semibold text-[#F0F3FA] mt-1">
            {formatCompactNumber(summary.totalVol)}
          </div>
          <div className="text-[11px] text-[#787B86] mt-0.5">
            Across {INSTRUMENTS.length} multi-asset instruments
          </div>
        </div>

        {/* Top Gainer */}
        {summary.topGainer?.q && (
          <button
            type="button"
            onClick={() => selectSymbol(summary.topGainer.meta.symbol, true)}
            className="p-3 rounded bg-[#1E222D] border border-[#2A2E39] hover:border-[#089981]/60 transition-colors text-left flex flex-col justify-between cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#787B86]">Top Gainer</span>
              <span className="font-num text-[11px] font-medium px-1.5 py-0.5 rounded-full text-[#089981] bg-[#089981]/12">
                {formatPercent(summary.topGainer.q.changePercent)} ▲
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-[16px] font-bold text-[#F0F3FA]">
                {summary.topGainer.meta.symbol}
              </span>
              <span className="font-num text-[14px] text-[#F0F3FA]">
                {formatPrice(summary.topGainer.q.last, summary.topGainer.meta.precision)}
              </span>
            </div>
            <div className="text-[11px] text-[#787B86] truncate mt-0.5">
              {summary.topGainer.meta.name} · {summary.topGainer.meta.sector}
            </div>
          </button>
        )}

        {/* Top Loser */}
        {summary.topLoser?.q && (
          <button
            type="button"
            onClick={() => selectSymbol(summary.topLoser.meta.symbol, true)}
            className="p-3 rounded bg-[#1E222D] border border-[#2A2E39] hover:border-[#F23645]/60 transition-colors text-left flex flex-col justify-between cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#787B86]">Top Decliner</span>
              <span className="font-num text-[11px] font-medium px-1.5 py-0.5 rounded-full text-[#F23645] bg-[#F23645]/12">
                {formatPercent(summary.topLoser.q.changePercent)} ▼
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-[16px] font-bold text-[#F0F3FA]">
                {summary.topLoser.meta.symbol}
              </span>
              <span className="font-num text-[14px] text-[#F0F3FA]">
                {formatPrice(summary.topLoser.q.last, summary.topLoser.meta.precision)}
              </span>
            </div>
            <div className="text-[11px] text-[#787B86] truncate mt-0.5">
              {summary.topLoser.meta.name} · {summary.topLoser.meta.sector}
            </div>
          </button>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="px-4 py-2 bg-[#1E222D] border-b border-[#2A2E39] flex flex-wrap items-center justify-between gap-2.5 shrink-0">
        <div className="flex flex-wrap items-center gap-2">
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
                {cls === 'ALL' ? 'All Assets' : cls}
              </button>
            ))}
          </div>

          {/* Sector Dropdown */}
          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
            aria-label="Filter by sector"
            className="h-[30px] px-2.5 bg-[#131722] border border-[#2A2E39] focus:border-[#2962FF] focus:outline-none rounded text-[12px] text-[#F0F3FA] cursor-pointer"
          >
            {sectors.map((sec) => (
              <option key={sec} value={sec}>
                {sec === 'ALL' ? 'All Sectors' : sec}
              </option>
            ))}
          </select>

          {/* Performance Filter */}
          <select
            value={perfFilter}
            onChange={(e) => setPerfFilter(e.target.value as PerfFilter)}
            aria-label="Filter by performance"
            className="h-[30px] px-2.5 bg-[#131722] border border-[#2A2E39] focus:border-[#2962FF] focus:outline-none rounded text-[12px] text-[#F0F3FA] cursor-pointer"
          >
            <option value="ALL">All Movers</option>
            <option value="GAINERS">Gainers Only</option>
            <option value="LOSERS">Losers Only</option>
            <option value="VOLATILE">High Volatility (&gt;2.2%)</option>
          </select>

          {/* Technical Signal Filter */}
          <select
            value={signalFilter}
            onChange={(e) => setSignalFilter(e.target.value as SignalFilter)}
            aria-label="Filter by technical signal"
            className="h-[30px] px-2.5 bg-[#131722] border border-[#2A2E39] focus:border-[#2962FF] focus:outline-none rounded text-[12px] text-[#F0F3FA] cursor-pointer"
          >
            <option value="ALL">All Technicals</option>
            <option value="ABOVE_SMA">Above SMA 20</option>
            <option value="BELOW_SMA">Below SMA 20</option>
            <option value="RSI_OVERSOLD">RSI Oversold (&lt;35)</option>
            <option value="RSI_OVERBOUGHT">RSI Overbought (&gt;65)</option>
          </select>
        </div>

        {/* Search + Match Count */}
        <div className="flex items-center gap-2.5">
          <div className="relative w-[220px]">
            <Search className="w-3.5 h-3.5 text-[#787B86] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search ticker, name, sector..."
              className="w-full h-[30px] pl-8 pr-7 bg-[#131722] border border-[#2A2E39] focus:border-[#2962FF] focus:outline-none rounded text-[12px] text-[#F0F3FA] placeholder:text-[#50535E]"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#787B86] hover:text-[#F0F3FA] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <span className="font-num text-[11px] text-[#787B86] whitespace-nowrap">
            {filteredSortedRows.length} matches
          </span>
        </div>
      </div>

      {/* High-Density Sortable Screener Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse min-w-[980px]">
          <thead className="sticky top-0 bg-[#131722] z-10 border-b border-[#2A2E39]">
            <tr className="h-[30px] text-[11px] uppercase tracking-[0.04em] text-[#787B86]">
              <th className="pl-4 pr-2 w-8" />
              <th className="px-2 font-medium">
                <button
                  type="button"
                  onClick={() => handleSort('symbol')}
                  className="inline-flex items-center gap-1 hover:text-[#F0F3FA] cursor-pointer"
                >
                  <span>Instrument</span>
                  {renderSortIcon('symbol')}
                </button>
              </th>
              <th className="px-3 font-medium">Class / Sector</th>
              <th className="px-3 font-medium text-right">
                <button
                  type="button"
                  onClick={() => handleSort('last')}
                  className="inline-flex items-center gap-1 hover:text-[#F0F3FA] cursor-pointer"
                >
                  <span>Last Price</span>
                  {renderSortIcon('last')}
                </button>
              </th>
              <th className="px-3 font-medium text-right">
                <button
                  type="button"
                  onClick={() => handleSort('changePercent')}
                  className="inline-flex items-center gap-1 hover:text-[#F0F3FA] cursor-pointer"
                >
                  <span>24h Chg %</span>
                  {renderSortIcon('changePercent')}
                </button>
              </th>
              <th className="px-3 font-medium text-right">
                <button
                  type="button"
                  onClick={() => handleSort('spreadBps')}
                  className="inline-flex items-center gap-1 hover:text-[#F0F3FA] cursor-pointer"
                >
                  <span>Spread</span>
                  {renderSortIcon('spreadBps')}
                </button>
              </th>
              <th className="px-3 font-medium text-right">
                <button
                  type="button"
                  onClick={() => handleSort('volume24h')}
                  className="inline-flex items-center gap-1 hover:text-[#F0F3FA] cursor-pointer"
                >
                  <span>24h Volume</span>
                  {renderSortIcon('volume24h')}
                </button>
              </th>
              <th className="px-3 font-medium text-center">24h Range</th>
              <th className="px-3 font-medium text-right">
                <button
                  type="button"
                  onClick={() => handleSort('rsi14')}
                  className="inline-flex items-center gap-1 hover:text-[#F0F3FA] cursor-pointer"
                >
                  <span>RSI (14)</span>
                  {renderSortIcon('rsi14')}
                </button>
              </th>
              <th className="px-3 font-medium">SMA 20</th>
              <th className="px-3 font-medium text-center">Trend</th>
              <th className="pl-2 pr-4 font-medium text-right">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#1E222D]">
            {filteredSortedRows.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-16 text-center">
                  <div className="text-[13px] text-[#787B86] mb-2">
                    No instruments match the active screener criteria.
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAssetFilter('ALL');
                      setSectorFilter('ALL');
                      setPerfFilter('ALL');
                      setSignalFilter('ALL');
                      setQuery('');
                    }}
                    className="px-3 py-1.5 rounded bg-[#2962FF] hover:bg-[#1E53E5] text-white text-[12px] font-medium cursor-pointer"
                  >
                    Clear All Filters
                  </button>
                </td>
              </tr>
            ) : (
              filteredSortedRows.map(({ meta, q, spreadBps, rangePos }) => {
                if (!q) return null;
                const isUp = q.changePercent >= 0;
                const isFav = favorites.includes(meta.symbol);
                const aboveSma = q.last >= q.sma20;
                const rsiColor =
                  q.rsi14 > 65
                    ? 'text-[#F23645]'
                    : q.rsi14 < 35
                      ? 'text-[#089981]'
                      : 'text-[#F0F3FA]';

                return (
                  <tr
                    key={meta.symbol}
                    onClick={() => selectSymbol(meta.symbol, true)}
                    className="h-[40px] hover:bg-[#2A2E39] transition-colors cursor-pointer"
                  >
                    <td
                      className="pl-4 pr-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(meta.symbol);
                      }}
                    >
                      <Star
                        className={`w-3.5 h-3.5 transition-colors ${
                          isFav
                            ? 'text-[#F59E0B] fill-current'
                            : 'text-[#50535E] hover:text-[#F0F3FA]'
                        }`}
                      />
                    </td>
                    <td className="px-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-[#F0F3FA] shrink-0"
                          style={{
                            backgroundColor: `${meta.badgeColor}26`,
                            border: `1px solid ${meta.badgeColor}66`,
                          }}
                        >
                          {meta.symbol.slice(0, 2)}
                        </div>
                        <div>
                          <div className="text-[13px] font-bold text-[#F0F3FA] leading-tight">
                            {meta.symbol}
                          </div>
                          <div className="text-[11px] text-[#787B86] leading-tight">
                            {meta.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 text-[12px] text-[#787B86]">
                      <span className="text-[#F0F3FA]">{meta.assetClass}</span>
                      <span className="mx-1.5 text-[#50535E]">·</span>
                      <span>{meta.sector}</span>
                    </td>
                    <td className="px-3 text-right font-num text-[13px] font-medium text-[#F0F3FA]">
                      {formatPrice(q.last, meta.precision)}
                    </td>
                    <td className="px-3 text-right">
                      <span
                        className={`font-num text-[11px] font-medium px-2 py-0.5 rounded-full ${
                          isUp
                            ? 'text-[#089981] bg-[#089981]/12'
                            : 'text-[#F23645] bg-[#F23645]/12'
                        }`}
                      >
                        {formatPercent(q.changePercent)} {isUp ? '▲' : '▼'}
                      </span>
                    </td>
                    <td className="px-3 text-right font-num text-[12px] text-[#787B86]">
                      {spreadBps.toFixed(1)} bps
                    </td>
                    <td className="px-3 text-right font-num text-[12px] text-[#F0F3FA]">
                      {formatCompactNumber(q.volume24h)}
                    </td>
                    <td className="px-3">
                      <div className="w-[100px] mx-auto">
                        <div className="relative h-1.5 rounded bg-[#2A2E39]">
                          <div
                            className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#2962FF] border border-[#131722]"
                            style={{ left: `calc(${rangePos.toFixed(0)}% - 4px)` }}
                          />
                        </div>
                        <div className="mt-1 flex justify-between font-num text-[9px] text-[#787B86]">
                          <span>{formatPrice(q.low24h, Math.min(2, meta.precision))}</span>
                          <span>{formatPrice(q.high24h, Math.min(2, meta.precision))}</span>
                        </div>
                      </div>
                    </td>
                    <td className={`px-3 text-right font-num text-[12px] font-medium ${rsiColor}`}>
                      {q.rsi14.toFixed(1)}
                    </td>
                    <td className="px-3 text-[11px] font-medium">
                      <span className={aboveSma ? 'text-[#089981]' : 'text-[#F23645]'}>
                        {aboveSma ? 'Above' : 'Below'}
                      </span>
                    </td>
                    <td className="px-3 text-center">
                      <RowSparkline points={q.sparkline} isUp={isUp} />
                    </td>
                    <td
                      className="pl-2 pr-4 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => selectSymbol(meta.symbol, true)}
                        className="px-2.5 py-1 rounded bg-[#2962FF] hover:bg-[#1E53E5] text-white text-[11px] font-medium transition-colors cursor-pointer"
                      >
                        Trade
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
};
