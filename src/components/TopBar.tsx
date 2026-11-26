import React, { useState } from 'react';
import {
  BarChart2,
  Grid2x2,
  ListFilter,
  Pause,
  Play,
  RotateCcw,
  Search,
  SlidersHorizontal,
  TableProperties,
} from 'lucide-react';
import { useTerminal } from '../context/TerminalContext';
import { formatCurrency } from '../data/instruments';
import { WorkspaceScreen } from '../types/terminal';

interface TopBarProps {
  onToggleWatchlistDrawer?: () => void;
  onToggleOrderDrawer?: () => void;
}

const NAV_ITEMS: { id: WorkspaceScreen; label: string; icon: React.ReactNode }[] = [
  { id: 'terminal', label: 'Terminal', icon: <BarChart2 className="w-3.5 h-3.5" /> },
  { id: 'screener', label: 'Screener', icon: <TableProperties className="w-3.5 h-3.5" /> },
  { id: 'heatmap', label: 'Heatmap', icon: <Grid2x2 className="w-3.5 h-3.5" /> },
];

export const TopBar: React.FC<TopBarProps> = ({
  onToggleWatchlistDrawer,
  onToggleOrderDrawer,
}) => {
  const {
    activeScreen,
    setActiveScreen,
    totalEquity,
    unrealizedPnl,
    isLive,
    setIsLive,
    simSpeed,
    setSimSpeed,
    resetAccount,
    setCommandOpen,
  } = useTerminal();

  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <header className="h-[44px] bg-[#1E222D] border-b border-[#2A2E39] px-3 flex items-center justify-between gap-3 shrink-0 select-none z-30">
      {/* Left: Brand + Primary Workspace Tabs */}
      <div className="flex items-center gap-4 min-w-0">
        <div className="flex items-center gap-2 shrink-0">
          {activeScreen === 'terminal' && onToggleWatchlistDrawer && (
            <button
              type="button"
              onClick={onToggleWatchlistDrawer}
              className="xl:hidden p-1.5 rounded text-[#787B86] hover:text-[#F0F3FA] hover:bg-[#2A2E39] transition-colors"
              title="Toggle Watchlist"
              aria-label="Toggle Watchlist"
            >
              <ListFilter className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveScreen('terminal')}
            className="flex items-center gap-2 text-[#F0F3FA] font-bold tracking-tight text-[14px] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span className="w-5 h-5 rounded bg-[#2962FF] flex items-center justify-center text-[11px] font-bold text-white">
              M
            </span>
            <span>Meridian</span>
          </button>
        </div>

        <nav className="flex items-center h-[44px] gap-1" aria-label="Workspace Views">
          {NAV_ITEMS.map((item) => {
            const active = activeScreen === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveScreen(item.id)}
                className={`relative h-[44px] px-3 flex items-center gap-1.5 text-[13px] font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  active
                    ? 'text-[#F0F3FA]'
                    : 'text-[#787B86] hover:text-[#F0F3FA] hover:bg-[#2A2E39]/50'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {active && (
                  <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-[#2962FF]" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Center: Quick Symbol Command Trigger */}
      <div className="hidden md:flex items-center flex-1 max-w-[320px]">
        <button
          type="button"
          onClick={() => setCommandOpen(true)}
          className="w-full h-[30px] px-2.5 bg-[#131722] border border-[#2A2E39] hover:border-[#434651] rounded flex items-center justify-between gap-2 text-[#787B86] hover:text-[#F0F3FA] transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2 text-[12px] truncate">
            <Search className="w-3.5 h-3.5 shrink-0" />
            <span>Search symbol or screen...</span>
          </span>
          <kbd className="font-num text-[10px] px-1.5 py-0.5 rounded bg-[#2A2E39] text-[#787B86] shrink-0">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Right: Account Equity + Simulation Controls */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => setCommandOpen(true)}
          className="md:hidden p-1.5 rounded text-[#787B86] hover:text-[#F0F3FA] hover:bg-[#2A2E39] transition-colors"
          aria-label="Search Symbols"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Paper Equity Summary */}
        <div className="hidden sm:flex items-center gap-3 px-2.5 h-[30px] rounded bg-[#131722] border border-[#2A2E39]">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-[#787B86]">Equity</span>
            <span className="font-num text-[12px] font-semibold text-[#F0F3FA]">
              {formatCurrency(totalEquity)}
            </span>
          </div>
          <span className="w-px h-3.5 bg-[#2A2E39]" />
          <div className="flex items-baseline gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-[#787B86]">Open P&amp;L</span>
            <span
              className={`font-num text-[12px] font-medium ${
                unrealizedPnl > 0
                  ? 'text-[#089981]'
                  : unrealizedPnl < 0
                    ? 'text-[#F23645]'
                    : 'text-[#787B86]'
              }`}
            >
              {formatCurrency(unrealizedPnl, true)}
            </span>
          </div>
        </div>

        {/* Feed Play/Pause + Speed */}
        <div className="flex items-center bg-[#131722] border border-[#2A2E39] rounded h-[30px] p-0.5">
          <button
            type="button"
            onClick={() => setIsLive(!isLive)}
            className={`h-full px-2 rounded-[3px] flex items-center gap-1 text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
              isLive
                ? 'bg-[#089981]/15 text-[#089981]'
                : 'text-[#787B86] hover:text-[#F0F3FA] hover:bg-[#2A2E39]'
            }`}
            title={isLive ? 'Pause simulated market feed' : 'Resume simulated market feed'}
          >
            {isLive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            <span className="hidden lg:inline">{isLive ? 'Live' : 'Paused'}</span>
          </button>
          <button
            type="button"
            onClick={() => setSimSpeed(simSpeed === 1 ? 3 : 1)}
            className={`h-full px-2 rounded-[3px] font-num text-[11px] font-medium transition-colors cursor-pointer ${
              simSpeed === 3
                ? 'bg-[#2962FF]/20 text-[#b6c4ff]'
                : 'text-[#787B86] hover:text-[#F0F3FA] hover:bg-[#2A2E39]'
            }`}
            title="Toggle simulation tick speed (1x / 3x)"
          >
            {simSpeed}x
          </button>
        </div>

        {/* Reset Paper Account */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setConfirmReset((v) => !v)}
            className="h-[30px] px-2 rounded border border-[#2A2E39] bg-[#131722] text-[#787B86] hover:text-[#F0F3FA] hover:bg-[#2A2E39] transition-colors flex items-center gap-1 text-[11px] cursor-pointer"
            title="Reset Paper Account"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Reset</span>
          </button>

          {confirmReset && (
            <div className="terminal-popover absolute right-0 top-[36px] w-[230px] rounded p-3 z-50">
              <div className="text-[12px] font-semibold text-[#F0F3FA] mb-1">
                Reset Paper Account?
              </div>
              <p className="text-[11px] text-[#787B86] mb-3 leading-relaxed">
                Closes all positions, cancels working orders, and restores $100,000.00 cash.
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="px-2.5 py-1 rounded text-[11px] text-[#787B86] hover:text-[#F0F3FA] hover:bg-[#363A45] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetAccount();
                    setConfirmReset(false);
                  }}
                  className="px-2.5 py-1 rounded text-[11px] font-medium bg-[#F23645] text-white hover:bg-[#F23645]/90 cursor-pointer"
                >
                  Confirm Reset
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tablet/Mobile Order Ticket Toggle */}
        {activeScreen === 'terminal' && onToggleOrderDrawer && (
          <button
            type="button"
            onClick={onToggleOrderDrawer}
            className="lg:hidden h-[30px] px-2.5 rounded bg-[#2962FF] hover:bg-[#1E53E5] text-white text-[12px] font-medium flex items-center gap-1.5 cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Trade</span>
          </button>
        )}
      </div>
    </header>
  );
};
