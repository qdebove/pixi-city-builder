import React from 'react';
import { TutorialProgress, TutorialStep } from '@/types/tutorial';

const formatMoney = (value: number) =>
  value.toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  });

interface TutorialPanelProps {
  steps: TutorialStep[];
  progress: TutorialProgress;
  activeStep: TutorialStep | null;
  activeComplete: boolean;
  isFinished: boolean;
  onAdvance: () => void;
}

export const TutorialPanel: React.FC<TutorialPanelProps> = ({
  steps,
  progress,
  activeStep,
  activeComplete,
  isFinished,
  onAdvance,
}) => {
  const activeIndex = isFinished ? steps.length : progress.currentIndex;

  return (
    <section className="pointer-events-auto w-80 rounded-2xl border border-slate-800/80 bg-slate-900/90 p-4 shadow-2xl backdrop-blur">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase text-slate-400">Tutoriel express</p>
          <h3 className="text-lg font-semibold text-white">
            {isFinished ? 'Parcours terminé' : `Étape ${activeIndex + 1} / ${steps.length}`}
          </h3>
        </div>
        <span className="rounded-full bg-sky-900/50 px-2 py-1 text-[11px] font-semibold text-sky-200">
          Primes cumulables
        </span>
      </div>

      <ol className="mt-3 space-y-2">
        {steps.map((step, index) => {
          const isDone = progress.completed.includes(step.id) || index < progress.currentIndex;
          const isActive = !isFinished && index === progress.currentIndex;
          const statusColor = isDone ? 'text-emerald-300' : isActive ? 'text-sky-200' : 'text-slate-400';
          const badge =
            isDone ? '✅' : isActive ? (activeComplete ? '🟢' : '🕐') : '⬜';
          return (
            <li
              key={step.id}
              className={`rounded-xl border border-slate-800/80 bg-slate-900/80 p-3 ${
                isActive ? 'shadow-lg shadow-sky-900/40' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className={`text-sm font-semibold ${statusColor}`}>
                    {badge} {step.title}
                  </p>
                  <p className="text-xs text-slate-300">{step.description}</p>
                </div>
                <span className="rounded-md bg-amber-900/40 px-2 py-1 text-[11px] font-semibold text-amber-200">
                  +{formatMoney(step.reward)}
                </span>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-3 flex items-center justify-between">
        {activeStep && !isFinished ? (
          <button
            onClick={onAdvance}
            disabled={!activeComplete}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
              activeComplete
                ? 'border border-emerald-500/60 bg-emerald-700 text-white hover:bg-emerald-600'
                : 'border border-slate-700 bg-slate-800 text-slate-400 cursor-not-allowed'
            }`}
          >
            Suivant {activeComplete ? `(+${formatMoney(activeStep.reward)})` : ''}
          </button>
        ) : (
          <p className="text-sm font-semibold text-emerald-200">
            Bravo, toutes les étapes sont validées !
          </p>
        )}
        <p className="text-[11px] text-slate-400">
          Bouton actif quand la condition est remplie.
        </p>
      </div>
    </section>
  );
};
