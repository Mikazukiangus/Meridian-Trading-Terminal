import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BarChart2, Grid2x2, Search, TableProperties, X } from 'lucide-react';
import { useTerminal } from '../context/TerminalContext';
import { INSTRUMENTS, formatPercent, formatPrice } from '../data/instruments';
import { WorkspaceScreen } from '../types/terminal';

interface CommandItem {
  id: string;
  kind: 'symbol' | 'screen';
  title: string;
  subtitle: string;
  screen?: WorkspaceScreen;
  symbol?: string;
}

export const CommandPalette: React.FC = () => {
  const { commandOpen, setCommandOpen, selectSymbol, setActiveScreen, quotes } = useTerminal();
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (commandOpen) {
      setQuery('');
      setSelectedIdx(0);
      window.setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [commandOpen]);

  const items = useMemo<CommandItem[]>(() => {
    const q = query.trim().toLowerCase();

    const screens: CommandItem[] = [
      { id: 'scr-terminal', kind: 'screen', title: 'Trading Terminal', subtitle: 'Candlestick Chart, Watchlist & Order Ticket', screen: 'terminal' },
      { id: 'scr-screener', kind: 'screen', title: 'Market Screener', subtitle: 'Multi-Asset Scanner & Technical Signals', screen: 'screener' },
      { id: 'scr-heatmap', kind: 'screen', title: 'Market Heatmap', subtitle: 'Sector & Asset Class Treemap', screen: 'heatmap' },
    ];

    const symbols: CommandItem[] = INSTRUMENTS.map((inst) => ({
      id: `sym-${inst.symbol}`,
      kind: 'symbol',
      title: inst.symbol,
      subtitle: `${inst.name} · ${inst.assetClass} · ${inst.sector}`,
      symbol: inst.symbol,
    }));

    const all = [...symbols, ...screens];
    if (!q) return all;

    return all.filter(
      (it) =>
        it.title.toLowerCase().includes(q) || it.subtitle.toLowerCase().includes(q)
    );
  }, [query]);

  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  if (!commandOpen) return null;

  const executeItem = (item: CommandItem) => {
    if (item.kind === 'symbol' && item.symbol) {
      selectSymbol(item.symbol, true);
    } else if (item.kind === 'screen' && item.screen) {
      setActiveScreen(item.screen);
    }
    setCommandOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setCommandOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx((i) => (items.length > 0 ? (i + 1) % items.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx((i) => (items.length > 0 ? (i - 1 + items.length) % items.length : 0));
    } else if (e.key === 'Enter' && items[selectedIdx]) {
      e.preventDefault();
      executeItem(items[selectedIdx]);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0a0e19]/70 flex items-start justify-center pt-[12vh] px-4"
      onClick={() => setCommandOpen(false)}
    >
      <div
        className="terminal-popover w-full max-w-[520px] rounded overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input */}
        <div className="px-3 h-[44px] border-b border-[#434651] flex items-center gap-2.5 bg-[#1E222D]">
          <Search className="w-4 h-4 text-[#787B86] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to ticker (NVDA, BTCUSD, EURUSD) or screen..."
            className="flex-1 bg-transparent text-[13px] text-[#F0F3FA] placeholder:text-[#787B86] focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setCommandOpen(false)}
            className="text-[#787B86] hover:text-[#F0F3FA] cursor-pointer"
            aria-label="Close command palette"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[340px] overflow-y-auto divide-y divide-[#1E222D]/60 bg-[#1E222D]">
          {items.length === 0 ? (
            <div className="py-8 text-center text-[12px] text-[#787B86]">
              No matching symbols or screens found.
            </div>
          ) : (
            items.map((item, idx) => {
              const active = idx === selectedIdx;
              const q = item.symbol ? quotes[item.symbol] : undefined;
              const isUp = (q?.changePercent ?? 0) >= 0;

              return (
                <button
                  key={item.id}
                  type="button"
                  onMouseEnter={() => setSelectedIdx(idx)}
                  onClick={() => executeItem(item)}
                  className={`w-full px-3 py-2 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer ${
                    active ? 'bg-[#2A2E39]' : 'hover:bg-[#2A2E39]/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {item.kind === 'screen' ? (
                      <div className="w-6 h-6 rounded bg-[#2962FF]/15 text-[#b6c4ff] flex items-center justify-center shrink-0">
                        {item.screen === 'terminal' ? (
                          <BarChart2 className="w-3.5 h-3.5" />
                        ) : item.screen === 'screener' ? (
                          <TableProperties className="w-3.5 h-3.5" />
                        ) : (
                          <Grid2x2 className="w-3.5 h-3.5" />
                        )}
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-[#2A2E39] border border-[#434651] flex items-center justify-center text-[10px] font-bold text-[#F0F3FA] shrink-0">
                        {item.title.slice(0, 2)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-[13px] font-bold text-[#F0F3FA] truncate">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-[#787B86] truncate">{item.subtitle}</div>
                    </div>
                  </div>

                  {q && (
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-num text-[12px] text-[#F0F3FA]">
                        {formatPrice(q.last, q.last < 5 ? 5 : 2)}
                      </span>
                      <span
                        className={`font-num text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                          isUp
                            ? 'text-[#089981] bg-[#089981]/12'
                            : 'text-[#F23645] bg-[#F23645]/12'
                        }`}
                      >
                        {formatPercent(q.changePercent)}
                      </span>
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Keyboard Hints Footer */}
        <div className="px-3 py-1.5 bg-[#131722] border-t border-[#2A2E39] flex items-center justify-between text-[10px] text-[#787B86]">
          <span>↑↓ Navigate · Enter Select · Esc Close</span>
          <span className="font-num">Meridian Command</span>
        </div>
      </div>
    </div>
  );
};
