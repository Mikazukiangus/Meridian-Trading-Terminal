import React, { useMemo, useState } from 'react';
import { ArrowLeftRight, ChevronDown, ChevronUp, X } from 'lucide-react';
import { useTerminal } from '../context/TerminalContext';
import {
  INSTRUMENT_MAP,
  formatCurrency,
  formatPercent,
  formatPrice,
} from '../data/instruments';

type DockTab = 'positions' | 'working' | 'history' | 'executions';

function formatClock(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export const BottomDock: React.FC = () => {
  const {
    account,
    quotes,
    totalEquity,
    unrealizedPnl,
    usedMargin,
    buyingPower,
    selectSymbol,
    closePosition,
    reversePosition,
    cancelOrder,
  } = useTerminal();

  const [tab, setTab] = useState<DockTab>('positions');
  const [collapsed, setCollapsed] = useState<boolean>(false);

  const workingOrders = useMemo(
    () => account.orders.filter((o) => o.status === 'WORKING'),
    [account.orders]
  );

  const tabs: { id: DockTab; label: string; count: number }[] = [
    { id: 'positions', label: 'Positions', count: account.positions.length },
    { id: 'working', label: 'Open Orders', count: workingOrders.length },
    { id: 'history', label: 'Order History', count: account.orders.length },
    { id: 'executions', label: 'Executions', count: account.executions.length },
  ];

  return (
    <section
      className={`bg-[#1E222D] border-t border-[#2A2E39] flex flex-col shrink-0 select-none transition-all ${
        collapsed ? 'h-[36px]' : 'h-[215px]'
      }`}
    >
      {/* Dock Header Bar */}
      <div className="h-[36px] px-2.5 border-b border-[#2A2E39] flex items-center justify-between gap-3 shrink-0">
        {/* Tabs */}
        <div className="flex items-center h-full gap-1 overflow-x-auto">
          {tabs.map((t) => {
            const active = tab === t.id && !collapsed;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTab(t.id);
                  if (collapsed) setCollapsed(false);
                }}
                className={`relative h-full px-2.5 flex items-center gap-1.5 text-[12px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  active
                    ? 'text-[#F0F3FA]'
                    : 'text-[#787B86] hover:text-[#F0F3FA]'
                }`}
              >
                <span>{t.label}</span>
                <span className="font-num text-[10px] text-[#787B86]">({t.count})</span>
                {active && (
                  <span className="absolute bottom-0 left-1 right-1 h-[2px] bg-[#2962FF]" />
                )}
              </button>
            );
          })}
        </div>

        {/* Account Summary Strip + Collapse Toggle */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="hidden lg:flex items-center gap-4 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="text-[#787B86]">Equity</span>
              <span className="font-num font-semibold text-[#F0F3FA]">
                {formatCurrency(totalEquity)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[#787B86]">Cash</span>
              <span className="font-num text-[#F0F3FA]">
                {formatCurrency(account.cashBalance)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[#787B86]">Margin</span>
              <span className="font-num text-[#F0F3FA]">{formatCurrency(usedMargin)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[#787B86]">Buying Power</span>
              <span className="font-num text-[#F0F3FA]">{formatCurrency(buyingPower)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[#787B86]">Unrealized</span>
              <span
                className={`font-num font-medium ${
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
            <div className="flex items-center gap-1.5">
              <span className="text-[#787B86]">Realized</span>
              <span
                className={`font-num font-medium ${
                  account.realizedPnl > 0
                    ? 'text-[#089981]'
                    : account.realizedPnl < 0
                      ? 'text-[#F23645]'
                      : 'text-[#787B86]'
                }`}
              >
                {formatCurrency(account.realizedPnl, true)}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="p-1 rounded text-[#787B86] hover:text-[#F0F3FA] hover:bg-[#2A2E39] transition-colors cursor-pointer"
            title={collapsed ? 'Expand Portfolio Dock' : 'Collapse Portfolio Dock'}
            aria-label={collapsed ? 'Expand Portfolio Dock' : 'Collapse Portfolio Dock'}
          >
            {collapsed ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Table Body */}
      {!collapsed && (
        <div className="flex-1 overflow-auto bg-[#131722]">
          {tab === 'positions' && (
            <table className="w-full text-left border-collapse min-w-[740px]">
              <thead className="sticky top-0 bg-[#131722] z-10 border-b border-[#2A2E39]">
                <tr className="h-[28px] text-[11px] uppercase tracking-[0.04em] text-[#787B86]">
                  <th className="px-3 font-medium">Symbol</th>
                  <th className="px-3 font-medium">Side</th>
                  <th className="px-3 font-medium text-right">Qty</th>
                  <th className="px-3 font-medium text-right">Avg Entry</th>
                  <th className="px-3 font-medium text-right">Mark Price</th>
                  <th className="px-3 font-medium text-right">Market Value</th>
                  <th className="px-3 font-medium text-right">TP / SL</th>
                  <th className="px-3 font-medium text-right">Unrealized P&amp;L</th>
                  <th className="px-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E222D]">
                {account.positions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-[12px] text-[#787B86]">
                      No open positions. Submit a Buy or Sell order in the Order Ticket to begin trading.
                    </td>
                  </tr>
                ) : (
                  account.positions.map((pos) => {
                    const meta = INSTRUMENT_MAP[pos.symbol];
                    const q = quotes[pos.symbol];
                    const precision = meta?.precision ?? 2;
                    const mark = q ? (pos.side === 'LONG' ? q.bid : q.ask) : pos.avgEntry;
                    const pnl =
                      (pos.side === 'LONG' ? mark - pos.avgEntry : pos.avgEntry - mark) * pos.qty;
                    const cost = pos.avgEntry * pos.qty;
                    const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
                    const isUp = pnl >= 0;

                    return (
                      <tr
                        key={pos.symbol}
                        onClick={() => selectSymbol(pos.symbol)}
                        className="h-[36px] hover:bg-[#2A2E39] transition-colors cursor-pointer"
                      >
                        <td className="px-3">
                          <span className="font-bold text-[#F0F3FA]">{pos.symbol}</span>
                          <span className="ml-2 text-[11px] text-[#787B86]">
                            {meta?.assetClass}
                          </span>
                        </td>
                        <td className="px-3">
                          <span
                            className={`font-num text-[11px] font-semibold px-1.5 py-0.5 rounded ${
                              pos.side === 'LONG'
                                ? 'text-[#089981] bg-[#089981]/12'
                                : 'text-[#F23645] bg-[#F23645]/12'
                            }`}
                          >
                            {pos.side}
                          </span>
                        </td>
                        <td className="px-3 text-right font-num text-[#F0F3FA]">{pos.qty}</td>
                        <td className="px-3 text-right font-num text-[#F0F3FA]">
                          {formatPrice(pos.avgEntry, precision)}
                        </td>
                        <td className="px-3 text-right font-num text-[#F0F3FA]">
                          {formatPrice(mark, precision)}
                        </td>
                        <td className="px-3 text-right font-num text-[#F0F3FA]">
                          {formatCurrency(mark * pos.qty)}
                        </td>
                        <td className="px-3 text-right font-num text-[11px] text-[#787B86]">
                          {pos.takeProfit ? formatPrice(pos.takeProfit, precision) : '—'} /{' '}
                          {pos.stopLoss ? formatPrice(pos.stopLoss, precision) : '—'}
                        </td>
                        <td className="px-3 text-right font-num">
                          <span className={isUp ? 'text-[#089981]' : 'text-[#F23645]'}>
                            {formatCurrency(pnl, true)}
                          </span>
                          <span
                            className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                              isUp
                                ? 'text-[#089981] bg-[#089981]/12'
                                : 'text-[#F23645] bg-[#F23645]/12'
                            }`}
                          >
                            {formatPercent(pnlPct)}
                          </span>
                        </td>
                        <td
                          className="px-3 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => reversePosition(pos.symbol)}
                              className="px-2 py-1 rounded bg-[#2A2E39] hover:bg-[#363A45] text-[#F0F3FA] text-[11px] inline-flex items-center gap-1 cursor-pointer"
                              title="Reverse position direction"
                            >
                              <ArrowLeftRight className="w-3 h-3" />
                              <span>Reverse</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => closePosition(pos.symbol)}
                              className="px-2 py-1 rounded bg-[#F23645]/15 hover:bg-[#F23645] text-[#F23645] hover:text-white text-[11px] font-medium transition-colors cursor-pointer"
                            >
                              Close
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}

          {tab === 'working' && (
            <table className="w-full text-left border-collapse min-w-[680px]">
              <thead className="sticky top-0 bg-[#131722] z-10 border-b border-[#2A2E39]">
                <tr className="h-[28px] text-[11px] uppercase tracking-[0.04em] text-[#787B86]">
                  <th className="px-3 font-medium">Time</th>
                  <th className="px-3 font-medium">Symbol</th>
                  <th className="px-3 font-medium">Type</th>
                  <th className="px-3 font-medium">Side</th>
                  <th className="px-3 font-medium text-right">Qty</th>
                  <th className="px-3 font-medium text-right">Order Price</th>
                  <th className="px-3 font-medium text-right">Current Market</th>
                  <th className="px-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E222D]">
                {workingOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-[12px] text-[#787B86]">
                      No working Limit or Stop orders. Place a Limit or Stop order in the ticket to queue execution.
                    </td>
                  </tr>
                ) : (
                  workingOrders.map((ord) => {
                    const meta = INSTRUMENT_MAP[ord.symbol];
                    const q = quotes[ord.symbol];
                    const precision = meta?.precision ?? 2;
                    return (
                      <tr
                        key={ord.id}
                        onClick={() => selectSymbol(ord.symbol)}
                        className="h-[36px] hover:bg-[#2A2E39] transition-colors cursor-pointer"
                      >
                        <td className="px-3 font-num text-[11px] text-[#787B86]">
                          {formatClock(ord.createdAt)}
                        </td>
                        <td className="px-3 font-bold text-[#F0F3FA]">{ord.symbol}</td>
                        <td className="px-3 font-num text-[11px] text-[#F0F3FA]">{ord.type}</td>
                        <td className="px-3">
                          <span
                            className={`font-num text-[11px] font-semibold ${
                              ord.side === 'BUY' ? 'text-[#089981]' : 'text-[#F23645]'
                            }`}
                          >
                            {ord.side}
                          </span>
                        </td>
                        <td className="px-3 text-right font-num text-[#F0F3FA]">{ord.qty}</td>
                        <td className="px-3 text-right font-num text-[#2962FF] font-medium">
                          {ord.price !== undefined ? formatPrice(ord.price, precision) : 'MKT'}
                        </td>
                        <td className="px-3 text-right font-num text-[#787B86]">
                          {q ? formatPrice(q.last, precision) : '—'}
                        </td>
                        <td
                          className="px-3 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => cancelOrder(ord.id)}
                            className="px-2 py-1 rounded bg-[#2A2E39] hover:bg-[#F23645] text-[#F0F3FA] text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                            <span>Cancel</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}

          {tab === 'history' && (
            <table className="w-full text-left border-collapse min-w-[680px]">
              <thead className="sticky top-0 bg-[#131722] z-10 border-b border-[#2A2E39]">
                <tr className="h-[28px] text-[11px] uppercase tracking-[0.04em] text-[#787B86]">
                  <th className="px-3 font-medium">Time</th>
                  <th className="px-3 font-medium">Symbol</th>
                  <th className="px-3 font-medium">Type</th>
                  <th className="px-3 font-medium">Side</th>
                  <th className="px-3 font-medium text-right">Qty</th>
                  <th className="px-3 font-medium text-right">Limit / Fill</th>
                  <th className="px-3 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E222D]">
                {account.orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-[12px] text-[#787B86]">
                      No order history recorded yet.
                    </td>
                  </tr>
                ) : (
                  account.orders.map((ord) => {
                    const meta = INSTRUMENT_MAP[ord.symbol];
                    const precision = meta?.precision ?? 2;
                    return (
                      <tr
                        key={ord.id}
                        onClick={() => selectSymbol(ord.symbol)}
                        className="h-[36px] hover:bg-[#2A2E39] transition-colors cursor-pointer"
                      >
                        <td className="px-3 font-num text-[11px] text-[#787B86]">
                          {formatClock(ord.updatedAt)}
                        </td>
                        <td className="px-3 font-bold text-[#F0F3FA]">{ord.symbol}</td>
                        <td className="px-3 font-num text-[11px] text-[#787B86]">{ord.type}</td>
                        <td className="px-3">
                          <span
                            className={`font-num text-[11px] font-semibold ${
                              ord.side === 'BUY' ? 'text-[#089981]' : 'text-[#F23645]'
                            }`}
                          >
                            {ord.side}
                          </span>
                        </td>
                        <td className="px-3 text-right font-num text-[#F0F3FA]">{ord.qty}</td>
                        <td className="px-3 text-right font-num text-[#F0F3FA]">
                          {ord.filledPrice !== undefined
                            ? formatPrice(ord.filledPrice, precision)
                            : ord.price !== undefined
                              ? formatPrice(ord.price, precision)
                              : 'MKT'}
                        </td>
                        <td className="px-3 text-right font-num text-[11px]">
                          <span
                            className={
                              ord.status === 'FILLED'
                                ? 'text-[#089981]'
                                : ord.status === 'WORKING'
                                  ? 'text-[#2962FF]'
                                  : 'text-[#787B86]'
                            }
                          >
                            {ord.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}

          {tab === 'executions' && (
            <table className="w-full text-left border-collapse min-w-[680px]">
              <thead className="sticky top-0 bg-[#131722] z-10 border-b border-[#2A2E39]">
                <tr className="h-[28px] text-[11px] uppercase tracking-[0.04em] text-[#787B86]">
                  <th className="px-3 font-medium">Time</th>
                  <th className="px-3 font-medium">Symbol</th>
                  <th className="px-3 font-medium">Side</th>
                  <th className="px-3 font-medium">Reason</th>
                  <th className="px-3 font-medium text-right">Qty</th>
                  <th className="px-3 font-medium text-right">Fill Price</th>
                  <th className="px-3 font-medium text-right">Fee</th>
                  <th className="px-3 font-medium text-right">Realized P&amp;L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E222D]">
                {account.executions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-[12px] text-[#787B86]">
                      No trade executions logged yet.
                    </td>
                  </tr>
                ) : (
                  account.executions.map((ex) => {
                    const meta = INSTRUMENT_MAP[ex.symbol];
                    const precision = meta?.precision ?? 2;
                    return (
                      <tr
                        key={ex.id}
                        onClick={() => selectSymbol(ex.symbol)}
                        className="h-[36px] hover:bg-[#2A2E39] transition-colors cursor-pointer"
                      >
                        <td className="px-3 font-num text-[11px] text-[#787B86]">
                          {formatClock(ex.timestamp)}
                        </td>
                        <td className="px-3 font-bold text-[#F0F3FA]">{ex.symbol}</td>
                        <td className="px-3">
                          <span
                            className={`font-num text-[11px] font-semibold ${
                              ex.side === 'BUY' ? 'text-[#089981]' : 'text-[#F23645]'
                            }`}
                          >
                            {ex.side}
                          </span>
                        </td>
                        <td className="px-3 text-[11px] text-[#787B86]">{ex.reason}</td>
                        <td className="px-3 text-right font-num text-[#F0F3FA]">{ex.qty}</td>
                        <td className="px-3 text-right font-num text-[#F0F3FA]">
                          {formatPrice(ex.price, precision)}
                        </td>
                        <td className="px-3 text-right font-num text-[#787B86]">
                          {formatCurrency(ex.fee)}
                        </td>
                        <td className="px-3 text-right font-num">
                          {ex.realizedPnl === undefined ? (
                            <span className="text-[#50535E]">—</span>
                          ) : (
                            <span
                              className={
                                ex.realizedPnl >= 0 ? 'text-[#089981]' : 'text-[#F23645]'
                              }
                            >
                              {formatCurrency(ex.realizedPnl, true)}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      )}
    </section>
  );
};
