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
    <section className="pointer-events-auto w-80 rounded-2xl border border-slate-800/70 bg-slate-900/85 p-4 shadow-2xl backdrop-blur">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <p className="text-[11px] uppercase text-slate-400 tracking-wide">Tutoriel express</p>
          <h3 className="text-lg font-semibold text-white">
            {isFinished ? 'Parcours terminé' : `Étape ${activeIndex + 1} / ${steps.length}`}
          </h3>
          <p className="text-[11px] text-slate-400">
            Actions guidées, récompenses en arrière-plan.
          </p>
        </div>
        <div className="flex h-full min-h-[40px] items-center rounded-lg border border-slate-800 bg-slate-950/50 px-2 text-[11px] text-slate-300">
          {Math.round(((activeIndex) / steps.length) * 100)}%
        </div>
      </div>

      <ol className="mt-3 space-y-2">
        {steps.map((step, index) => {
          const isDone = progress.completed.includes(step.id) || index < progress.currentIndex;
          const isActive = !isFinished && index === progress.currentIndex;
          const statusColor = isDone
            ? 'text-emerald-300'
            : isActive
            ? 'text-sky-200'
            : 'text-slate-400';
          const badge = isDone ? '✅' : isActive ? (activeComplete ? '🟢' : '🕐') : '⬜';
          return (
            <li
              key={step.id}
              className={`rounded-xl border border-slate-800/70 bg-slate-900/75 p-3 transition ${
                isActive ? 'ring-1 ring-sky-500/50 shadow-lg shadow-sky-900/30' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className={`text-sm font-semibold ${statusColor}`}>
                    {badge} {step.title}
                  </p>
                  <p className="text-xs text-slate-300">{step.description}</p>
                  {step.ctaLabel && (
                    <p
                      className={`text-[11px] font-semibold ${
                        isActive ? 'text-sky-200' : 'text-slate-300'
                      }`}
                    >
                      Action attendue : {step.ctaLabel}
                    </p>
                  )}
                  {step.ctaHelper && (
                    <p className="text-[11px] text-slate-400">{step.ctaHelper}</p>
                  )}
                </div>
                <div className="flex flex-col items-end text-right">
                  <span className="text-[11px] uppercase text-slate-400">Récompense</span>
                  <span className="text-[12px] font-semibold text-amber-100/90">
                    +{formatMoney(step.reward)}
                  </span>
                  <span className="text-[11px] text-slate-500">Versée à la validation</span>
                </div>
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
            Valider l’étape
          </button>
        ) : (
          <p className="text-sm font-semibold text-emerald-200">
            Bravo, toutes les étapes sont validées !
          </p>
        )}
        <div className="flex flex-col items-end text-right">
          <p className="text-[11px] text-slate-300">
            Bouton actif quand la condition est remplie.
          </p>
          {activeStep && (
            <p className="text-[11px] text-slate-500">
              Bonus +{formatMoney(activeStep.reward)} ajouté en arrière-plan.
            </p>
          )}
        </div>
      </div>
    </section>
  );
};
