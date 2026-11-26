import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';
import { useTerminal } from '../context/TerminalContext';
import {
  INSTRUMENT_MAP,
  formatCurrency,
  formatPrice,
  roundToPrecision,
} from '../data/instruments';
import { OrderSide, OrderType } from '../types/terminal';

const ORDER_TYPES: { id: OrderType; label: string }[] = [
  { id: 'MARKET', label: 'Market' },
  { id: 'LIMIT', label: 'Limit' },
  { id: 'STOP', label: 'Stop' },
];

const SIZE_PCTS = [10, 25, 50, 100];

export const OrderTicket: React.FC = () => {
  const {
    activeSymbol,
    quotes,
    buyingPower,
    account,
    placeOrder,
    closePosition,
  } = useTerminal();

  const meta = INSTRUMENT_MAP[activeSymbol];
  const quote = quotes[activeSymbol];

  const [side, setSide] = useState<OrderSide>('BUY');
  const [orderType, setOrderType] = useState<OrderType>('MARKET');
  const [qtyStr, setQtyStr] = useState<string>('10');
  const [limitPriceStr, setLimitPriceStr] = useState<string>('');
  const [bracketsOpen, setBracketsOpen] = useState<boolean>(false);
  const [tpStr, setTpStr] = useState<string>('');
  const [slStr, setSlStr] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Update sensible defaults whenever activeSymbol changes
  useEffect(() => {
    if (!meta || !quote) return;
    const defaultQty =
      meta.assetClass === 'FX'
        ? meta.symbol === 'XAUUSD'
          ? 2
          : 5000
        : meta.symbol === 'BTCUSD'
          ? 0.1
          : meta.symbol === 'ETHUSD'
            ? 2
            : 25;
    setQtyStr(String(defaultQty));
    setLimitPriceStr(formatPrice(quote.last, meta.precision).replace(/,/g, ''));
    setTpStr('');
    setSlStr('');
    setErrorMsg(null);
  }, [activeSymbol]); // intentionally only on symbol change

  // Keep limit price pre-seeded if switching to LIMIT/STOP while empty
  useEffect(() => {
    if (orderType !== 'MARKET' && !limitPriceStr && quote && meta) {
      setLimitPriceStr(quote.last.toFixed(meta.precision));
    }
  }, [orderType, limitPriceStr, quote, meta]);

  const activePosition = useMemo(
    () => account.positions.find((p) => p.symbol === activeSymbol),
    [account.positions, activeSymbol]
  );

  if (!meta || !quote) return null;

  const qty = Number.parseFloat(qtyStr) || 0;
  const marketExecPrice = side === 'BUY' ? quote.ask : quote.bid;
  const effectivePrice =
    orderType === 'MARKET'
      ? marketExecPrice
      : Number.parseFloat(limitPriceStr) || marketExecPrice;

  const estNotional = qty * effectivePrice;
  const estFee = estNotional * 0.0005;
  const spread = quote.ask - quote.bid;
  const spreadBps = quote.last > 0 ? (spread / quote.last) * 10_000 : 0;

  const handlePercentAllocation = (pct: number) => {
    if (effectivePrice <= 0) return;
    const targetUsd = buyingPower * (pct / 100) * 0.998;
    const rawQty = targetUsd / effectivePrice;
    const stepped = Math.floor(rawQty / meta.qtyStep) * meta.qtyStep;
    const decimals = meta.qtyStep < 1 ? Math.ceil(-Math.log10(meta.qtyStep)) : 0;
    setQtyStr(Math.max(meta.qtyStep, Number(stepped.toFixed(decimals))).toString());
    setErrorMsg(null);
  };

  const handleAdjustPrice = (pctOffset: number) => {
    const next = roundToPrecision(quote.last * (1 + pctOffset), meta.precision);
    setLimitPriceStr(next.toFixed(meta.precision));
    setErrorMsg(null);
  };

  const handleSuggestBrackets = () => {
    const dir = side === 'BUY' ? 1 : -1;
    const tp = roundToPrecision(effectivePrice * (1 + dir * 0.03), meta.precision);
    const sl = roundToPrecision(effectivePrice * (1 - dir * 0.015), meta.precision);
    setTpStr(tp.toFixed(meta.precision));
    setSlStr(sl.toFixed(meta.precision));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const parsedTp = tpStr.trim() ? Number.parseFloat(tpStr) : undefined;
    const parsedSl = slStr.trim() ? Number.parseFloat(slStr) : undefined;

    if (bracketsOpen) {
      if (parsedTp !== undefined && (!Number.isFinite(parsedTp) || parsedTp <= 0)) {
        setErrorMsg('Enter a valid Take Profit price.');
        return;
      }
      if (parsedSl !== undefined && (!Number.isFinite(parsedSl) || parsedSl <= 0)) {
        setErrorMsg('Enter a valid Stop Loss price.');
        return;
      }
    }

    const res = placeOrder({
      symbol: activeSymbol,
      side,
      type: orderType,
      qty,
      price: orderType === 'MARKET' ? undefined : Number.parseFloat(limitPriceStr),
      takeProfit: bracketsOpen ? parsedTp : undefined,
      stopLoss: bracketsOpen ? parsedSl : undefined,
    });

    if (!res.ok) {
      setErrorMsg(res.error ?? 'Order rejected.');
    }
  };

  const posPnl = activePosition
    ? ((activePosition.side === 'LONG'
        ? quote.bid - activePosition.avgEntry
        : activePosition.avgEntry - quote.ask) *
        activePosition.qty)
    : 0;

  return (
    <aside className="w-full h-full bg-[#1E222D] border-l border-[#2A2E39] flex flex-col select-none overflow-y-auto">
      {/* Header */}
      <div className="px-3 py-2 border-b border-[#2A2E39] flex items-center justify-between shrink-0">
        <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#787B86]">
          Order Ticket
        </span>
        <span className="font-num text-[11px] font-semibold text-[#F0F3FA]">
          {meta.symbol} · {meta.assetClass}
        </span>
      </div>

      {/* Live Bid / Ask Cards */}
      <div className="px-3 pt-2.5 pb-2 grid grid-cols-2 gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => {
            setSide('SELL');
            if (orderType !== 'MARKET') {
              setLimitPriceStr(quote.bid.toFixed(meta.precision));
            }
          }}
          className={`p-2 rounded border text-left transition-colors cursor-pointer ${
            side === 'SELL'
              ? 'bg-[#F23645]/12 border-[#F23645]'
              : 'bg-[#131722] border-[#2A2E39] hover:border-[#434651]'
          }`}
        >
          <div className="text-[10px] uppercase tracking-wider text-[#F23645] font-semibold">
            Sell / Bid
          </div>
          <div className="font-num text-[14px] font-semibold text-[#F0F3FA] mt-0.5">
            {formatPrice(quote.bid, meta.precision)}
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setSide('BUY');
            if (orderType !== 'MARKET') {
              setLimitPriceStr(quote.ask.toFixed(meta.precision));
            }
          }}
          className={`p-2 rounded border text-left transition-colors cursor-pointer ${
            side === 'BUY'
              ? 'bg-[#089981]/12 border-[#089981]'
              : 'bg-[#131722] border-[#2A2E39] hover:border-[#434651]'
          }`}
        >
          <div className="text-[10px] uppercase tracking-wider text-[#089981] font-semibold">
            Buy / Ask
          </div>
          <div className="font-num text-[14px] font-semibold text-[#F0F3FA] mt-0.5">
            {formatPrice(quote.ask, meta.precision)}
          </div>
        </button>
      </div>

      {/* Spread strip */}
      <div className="px-3 pb-2 flex items-center justify-between text-[11px] text-[#787B86] shrink-0">
        <span>Live Spread</span>
        <span className="font-num text-[#F0F3FA]">
          {formatPrice(spread, meta.precision)} ({spreadBps.toFixed(1)} bps)
        </span>
      </div>

      {/* Order Form */}
      <form onSubmit={handleSubmit} className="px-3 pb-3 flex flex-col gap-2.5 flex-1">
        {/* Order Type Segmented Tabs */}
        <div className="grid grid-cols-3 gap-1 bg-[#131722] p-0.5 rounded border border-[#2A2E39]">
          {ORDER_TYPES.map((ot) => {
            const active = orderType === ot.id;
            return (
              <button
                key={ot.id}
                type="button"
                onClick={() => {
                  setOrderType(ot.id);
                  setErrorMsg(null);
                }}
                className={`py-1 text-[11px] font-medium rounded-[3px] transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#2A2E39] text-[#F0F3FA]'
                    : 'text-[#787B86] hover:text-[#F0F3FA]'
                }`}
              >
                {ot.label}
              </button>
            );
          })}
        </div>

        {/* Limit / Stop Price Input */}
        {orderType !== 'MARKET' && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="order-price-input"
                className="text-[11px] text-[#787B86] font-medium"
              >
                {orderType === 'LIMIT' ? 'Limit Price' : 'Stop Trigger Price'}
              </label>
              <div className="flex items-center gap-1">
                {[
                  { label: '-0.5%', val: -0.005 },
                  { label: 'Last', val: 0 },
                  { label: '+0.5%', val: 0.005 },
                ].map((adj) => (
                  <button
                    key={adj.label}
                    type="button"
                    onClick={() => handleAdjustPrice(adj.val)}
                    className="px-1.5 py-0.5 rounded bg-[#131722] border border-[#2A2E39] hover:bg-[#2A2E39] font-num text-[10px] text-[#787B86] hover:text-[#F0F3FA] cursor-pointer"
                  >
                    {adj.label}
                  </button>
                ))}
              </div>
            </div>
            <input
              id="order-price-input"
              type="number"
              step={meta.tickSize}
              value={limitPriceStr}
              onChange={(e) => {
                setLimitPriceStr(e.target.value);
                setErrorMsg(null);
              }}
              className="w-full h-[34px] px-2.5 bg-[#131722] border border-[#2A2E39] focus:border-[#2962FF] focus:outline-none rounded font-num text-[13px] text-[#F0F3FA]"
            />
          </div>
        )}

        {/* Quantity Input + Quick Sizing */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="order-qty-input" className="text-[11px] text-[#787B86] font-medium">
              Quantity ({meta.unitLabel})
            </label>
            <span className="font-num text-[11px] text-[#787B86]">
              BP: {formatCurrency(buyingPower)}
            </span>
          </div>
          <input
            id="order-qty-input"
            type="number"
            step={meta.qtyStep}
            min={0}
            value={qtyStr}
            onChange={(e) => {
              setQtyStr(e.target.value);
              setErrorMsg(null);
            }}
            className="w-full h-[34px] px-2.5 bg-[#131722] border border-[#2A2E39] focus:border-[#2962FF] focus:outline-none rounded font-num text-[13px] text-[#F0F3FA]"
          />
          <div className="grid grid-cols-4 gap-1 mt-1.5">
            {SIZE_PCTS.map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => handlePercentAllocation(pct)}
                className="py-1 rounded bg-[#131722] border border-[#2A2E39] hover:bg-[#2A2E39] hover:border-[#434651] font-num text-[11px] text-[#787B86] hover:text-[#F0F3FA] transition-colors cursor-pointer"
              >
                {pct}%
              </button>
            ))}
          </div>
        </div>

        {/* Take Profit / Stop Loss Bracket Controls */}
        <div className="border border-[#2A2E39] rounded bg-[#131722]/60">
          <button
            type="button"
            onClick={() => setBracketsOpen((v) => !v)}
            className="w-full px-2.5 py-2 flex items-center justify-between text-[11px] font-medium text-[#F0F3FA] hover:bg-[#2A2E39]/40 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#2962FF]" />
              <span>TP / SL Brackets</span>
            </span>
            {bracketsOpen ? (
              <ChevronUp className="w-3.5 h-3.5 text-[#787B86]" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-[#787B86]" />
            )}
          </button>

          {bracketsOpen && (
            <div className="px-2.5 pb-2.5 pt-1 border-t border-[#2A2E39] space-y-2">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSuggestBrackets}
                  className="text-[10px] text-[#2962FF] hover:underline cursor-pointer"
                >
                  Auto-fill +3% / -1.5%
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-[#089981] mb-1">Take Profit</label>
                  <input
                    type="number"
                    step={meta.tickSize}
                    placeholder="Optional"
                    value={tpStr}
                    onChange={(e) => setTpStr(e.target.value)}
                    className="w-full h-[30px] px-2 bg-[#131722] border border-[#2A2E39] focus:border-[#089981] focus:outline-none rounded font-num text-[12px] text-[#F0F3FA] placeholder:text-[#50535E]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#F23645] mb-1">Stop Loss</label>
                  <input
                    type="number"
                    step={meta.tickSize}
                    placeholder="Optional"
                    value={slStr}
                    onChange={(e) => setSlStr(e.target.value)}
                    className="w-full h-[30px] px-2 bg-[#131722] border border-[#2A2E39] focus:border-[#F23645] focus:outline-none rounded font-num text-[12px] text-[#F0F3FA] placeholder:text-[#50535E]"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Order Summary Table */}
        <div className="p-2.5 rounded bg-[#131722] border border-[#2A2E39] space-y-1.5 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="text-[#787B86]">Est. Order Value</span>
            <span className="font-num text-[#F0F3FA] font-medium">
              {formatCurrency(estNotional)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#787B86]">Est. Commission (5 bps)</span>
            <span className="font-num text-[#787B86]">{formatCurrency(estFee)}</span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-[#2A2E39]">
            <span className="text-[#787B86]">Total Impact</span>
            <span className="font-num text-[#F0F3FA] font-semibold">
              {formatCurrency(estNotional + estFee)}
            </span>
          </div>
        </div>

        {/* Inline Validation Error */}
        {errorMsg && (
          <div className="px-2.5 py-2 rounded bg-[#F23645]/12 border border-[#F23645]/40 flex items-start gap-2 text-[11px] text-[#ffb4ab]">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#F23645]" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Primary Buy / Sell Action CTA */}
        <button
          type="submit"
          className={`w-full h-[38px] rounded font-semibold text-[13px] text-white transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
            side === 'BUY'
              ? 'bg-[#089981] hover:bg-[#078470]'
              : 'bg-[#F23645] hover:bg-[#dc2c3a]'
          }`}
        >
          <span>
            {side === 'BUY' ? 'Buy / Long' : 'Sell / Short'} {meta.symbol}
          </span>
          <span className="font-num text-[11px] opacity-90">
            @ {orderType === 'MARKET' ? 'MKT' : formatPrice(effectivePrice, meta.precision)}
          </span>
        </button>

        {/* Active Position Quick Card for Current Symbol */}
        {activePosition && (
          <div className="mt-auto pt-2 border-t border-[#2A2E39]">
            <div className="p-2.5 rounded bg-[#131722] border border-[#2A2E39]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-[#F0F3FA]">
                  Open {activePosition.side} Position
                </span>
                <span
                  className={`font-num text-[11px] font-semibold ${
                    posPnl >= 0 ? 'text-[#089981]' : 'text-[#F23645]'
                  }`}
                >
                  {formatCurrency(posPnl, true)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-[#787B86] mb-2">
                <span className="font-num">
                  {activePosition.qty} {meta.unitLabel}
                </span>
                <span className="font-num">
                  Avg {formatPrice(activePosition.avgEntry, meta.precision)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => closePosition(activeSymbol)}
                className="w-full h-[28px] rounded border border-[#434651] bg-[#2A2E39] hover:bg-[#363A45] text-[11px] font-medium text-[#F0F3FA] transition-colors cursor-pointer"
              >
                Flatten {activeSymbol} at Market
              </button>
            </div>
          </div>
        )}
      </form>
    </aside>
  );
};
