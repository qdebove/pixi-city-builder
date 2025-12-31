import React from 'react';

type Props = {
  reason?: string | null;
  onRestart: () => void;
};

export const GameOverBanner: React.FC<Props> = ({ reason, onRestart }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur">
    <div className="w-[420px] max-w-full rounded-2xl border border-rose-600/60 bg-slate-950/90 p-6 text-center shadow-2xl">
      <h2 className="text-2xl font-bold text-white">Game Over</h2>
      <p className="mt-2 text-sm text-slate-200">
        Dette impayée en fin de mois. La simulation est stoppée.
      </p>
      {reason && <p className="mt-1 text-[13px] text-rose-200">{reason}</p>}
      <button
        type="button"
        onClick={onRestart}
        className="mt-4 w-full rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500"
      >
        Recommencer
      </button>
    </div>
  </div>
);
