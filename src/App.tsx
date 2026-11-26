import React, { useState } from 'react';
import { X } from 'lucide-react';
import { TerminalProvider, useTerminal } from './context/TerminalContext';
import { TopBar } from './components/TopBar';
import { WatchlistRail } from './components/WatchlistRail';
import { CandlestickChart } from './components/CandlestickChart';
import { OrderTicket } from './components/OrderTicket';
import { BottomDock } from './components/BottomDock';
import { MarketScreener } from './components/MarketScreener';
import { MarketHeatmap } from './components/MarketHeatmap';
import { CommandPalette } from './components/CommandPalette';
import { ToastContainer } from './components/ToastContainer';

function TerminalWorkspaceShell() {
  const { activeScreen } = useTerminal();
  const [watchlistDrawerOpen, setWatchlistDrawerOpen] = useState(false);
  const [orderDrawerOpen, setOrderDrawerOpen] = useState(false);

  return (
    <div className="h-screen w-screen bg-[#131722] text-[#F0F3FA] flex flex-col overflow-hidden">
      <TopBar
        onToggleWatchlistDrawer={() => {
          setOrderDrawerOpen(false);
          setWatchlistDrawerOpen((v) => !v);
        }}
        onToggleOrderDrawer={() => {
          setWatchlistDrawerOpen(false);
          setOrderDrawerOpen((v) => !v);
        }}
      />

      {activeScreen === 'terminal' && (
        <div className="flex-1 min-h-0 flex overflow-hidden relative">
          {/* Desktop Persistent Left Watchlist Rail (>= 1280px) */}
          <div className="hidden xl:block w-[284px] shrink-0 h-full">
            <WatchlistRail />
          </div>

          {/* Center Column: Interactive Chart + Collapsible Bottom Dock */}
          <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
            <div className="flex-1 min-h-0 flex overflow-hidden">
              <CandlestickChart />
            </div>
            <BottomDock />
          </div>

          {/* Desktop Persistent Right Paper Trading Order Ticket (>= 1024px) */}
          <div className="hidden lg:block w-[292px] shrink-0 h-full">
            <OrderTicket />
          </div>

          {/* Tablet / Mobile Slide-Over Watchlist Drawer (< 1280px) */}
          {watchlistDrawerOpen && (
            <div
              className="xl:hidden fixed inset-0 top-[44px] z-40 bg-[#0a0e19]/60 flex"
              onClick={() => setWatchlistDrawerOpen(false)}
            >
              <div
                className="w-[300px] max-w-[85vw] h-full relative"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setWatchlistDrawerOpen(false)}
                  className="absolute top-2 right-2 z-10 p-1 rounded bg-[#2A2E39] text-[#F0F3FA] cursor-pointer"
                  aria-label="Close watchlist drawer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <WatchlistRail onSelectCloseDrawer={() => setWatchlistDrawerOpen(false)} />
              </div>
            </div>
          )}

          {/* Tablet / Mobile Slide-Over Order Ticket Drawer (< 1024px) */}
          {orderDrawerOpen && (
            <div
              className="lg:hidden fixed inset-0 top-[44px] z-40 bg-[#0a0e19]/60 flex justify-end"
              onClick={() => setOrderDrawerOpen(false)}
            >
              <div
                className="w-[310px] max-w-[90vw] h-full relative"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setOrderDrawerOpen(false)}
                  className="absolute top-2 right-2 z-10 p-1 rounded bg-[#2A2E39] text-[#F0F3FA] cursor-pointer"
                  aria-label="Close order ticket drawer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <OrderTicket />
              </div>
            </div>
          )}
        </div>
      )}

      {activeScreen === 'screener' && <MarketScreener />}
      {activeScreen === 'heatmap' && <MarketHeatmap />}

      <CommandPalette />
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <TerminalProvider>
      <TerminalWorkspaceShell />
    </TerminalProvider>
  );
}
