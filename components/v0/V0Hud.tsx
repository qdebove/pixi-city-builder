import React from 'react';
import { DebtSnapshot } from '@/pixi/DebtSystem';
import { TimeSnapshot } from '@/pixi/TimeSystem';

type HudProps = {
  money: number;
  time: TimeSnapshot;
  debt: DebtSnapshot;
  isPaused: boolean;
  timeScale: number;
  onPause: () => void;
  onResume: () => void;
  onFast: () => void;
  onPayDebt: () => void;
};

const formatMoney = (value: number) =>
  value.toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  });

export const V0Hud: React.FC<HudProps> = ({
  money,
  time,
  debt,
  isPaused,
  timeScale,
  onPause,
  onResume,
  onFast,
  onPayDebt,
}) => {
  const outstanding = debt.isPaidForMonth ? 0 : debt.paymentDue;
  const daysUntilDue = debt.dueDay - time.day;
  const timeMode: 'pause' | 'normal' | 'fast' =
    isPaused || timeScale <= 0.1 ? 'pause' : timeScale >= 2.5 ? 'fast' : 'normal';

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3 shadow-lg backdrop-blur">
      <div className="flex flex-col">
        <span className="text-[10px] uppercase text-slate-400">Argent</span>
        <span className="font-mono text-lg font-semibold text-emerald-200">
          {formatMoney(money)}
        </span>
      </div>

      <div className="flex flex-col">
        <span className="text-[10px] uppercase text-slate-400">Calendrier</span>
        <span className="font-semibold text-slate-100">
          Jour {time.day} · Mois {time.month} · {time.hour.toString().padStart(2, '0')}:00
        </span>
      </div>

      <div className="flex flex-col">
        <span className="text-[10px] uppercase text-slate-400">Dette</span>
        <span className="font-semibold text-amber-200">
          {formatMoney(debt.balance)} restantes
        </span>
        <span className="text-[11px] text-slate-300">
          Échéance {outstanding > 0 ? formatMoney(outstanding) : 'soldée'} (jour {debt.dueDay})
        </span>
        {!debt.isPaidForMonth && (
          <span className="text-[11px] text-slate-400">
            {daysUntilDue < 0
              ? `En retard de ${Math.abs(daysUntilDue)} jour(s)`
              : daysUntilDue === 0
                ? "Prélèvement aujourd'hui"
                : `Dans ${daysUntilDue} jour(s)`}
          </span>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={onPause}
          className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
            timeMode === 'pause'
              ? 'bg-slate-700 text-white'
              : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
          }`}
        >
          Pause
        </button>
        <button
          type="button"
          onClick={onResume}
          className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
            timeMode === 'normal'
              ? 'bg-slate-700 text-white'
              : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
          }`}
        >
          Lecture
        </button>
        <button
          type="button"
          onClick={onFast}
          className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
            timeMode === 'fast'
              ? 'bg-slate-700 text-white'
              : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
          }`}
        >
          x3
        </button>
        <button
          type="button"
          onClick={onPayDebt}
          disabled={outstanding <= 0}
          className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
            outstanding <= 0
              ? 'cursor-not-allowed bg-slate-800 text-slate-400'
              : 'bg-amber-600 text-white hover:bg-amber-500'
          }`}
        >
          Payer la dette
        </button>
      </div>
    </div>
  );
};
