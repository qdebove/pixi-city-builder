import { ActiveEventSnapshot } from '@/pixi/EventSystem';
import React from 'react';

interface Props {
  events: ActiveEventSnapshot[];
}

const severityColors: Record<ActiveEventSnapshot['severity'], string> = {
  info: 'from-sky-500/60 via-sky-400/50 to-sky-500/60',
  warning: 'from-amber-500/70 via-amber-400/60 to-amber-500/70',
  critical: 'from-rose-600/70 via-rose-500/60 to-rose-600/70',
};

const badgeColors: Record<ActiveEventSnapshot['severity'], string> = {
  info: 'bg-sky-500/80 text-sky-100',
  warning: 'bg-amber-500/80 text-amber-100',
  critical: 'bg-rose-600/80 text-rose-100',
};

const formatSeconds = (ms: number): string => {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${seconds}s`;
};

const effectSummary = (event: ActiveEventSnapshot): string => {
  const chunks: string[] = [];

  if (event.effects.incomeMultiplier && event.effects.incomeMultiplier !== 1) {
    const percent = Math.round((event.effects.incomeMultiplier - 1) * 100);
    chunks.push(`${percent >= 0 ? '+' : ''}${percent}% revenus`);
  }

  if (
    event.effects.spawnIntervalMultiplier &&
    event.effects.spawnIntervalMultiplier !== 1
  ) {
    const percent = Math.round((1 - event.effects.spawnIntervalMultiplier) * 100);
    chunks.push(`${percent >= 0 ? '+' : ''}${percent}% flux visiteurs`);
  }

  if (event.effects.reputationDeltaPerSecond) {
    const rep = event.effects.reputationDeltaPerSecond;
    if (rep.local) chunks.push(`réputation locale ${rep.local > 0 ? '+' : ''}${rep.local}/s`);
    if (rep.premium)
      chunks.push(`réputation premium ${rep.premium > 0 ? '+' : ''}${rep.premium}/s`);
    if (rep.regulatoryPressure)
      chunks.push(
        `pression régul. ${rep.regulatoryPressure > 0 ? '+' : ''}${rep.regulatoryPressure}/s`
      );
  }

  if (event.effects.moneyDeltaPerTick) {
    chunks.push(`${event.effects.moneyDeltaPerTick > 0 ? '+' : ''}${event.effects.moneyDeltaPerTick} crédits/tick`);
  }

  return chunks.join(' · ');
};

export const EventTicker: React.FC<Props> = ({ events }) => {
  if (!events || events.length === 0) {
    return (
      <div className="pointer-events-none fixed bottom-[200px] right-4 z-40 flex justify-center" />
    );
  }

  return (
    <div className="pointer-events-none fixed bottom-[200px] right-4 z-40 flex flex-col items-end gap-3 px-4 py-2 text-sm">
      {events.map((event) => {
        const ratio = Math.max(
          0,
          Math.min(1, 1 - event.remainingMs / Math.max(1, event.durationMs))
        );
        const summary = effectSummary(event);

        return (
          <div key={event.instanceId} className="group pointer-events-auto relative">
            <div className="flex items-center gap-3 rounded-xl border border-slate-800/90 bg-slate-900/90 px-3 py-2 shadow-xl backdrop-blur-md">
              <div
                className={`h-10 w-1 rounded-full bg-gradient-to-b ${severityColors[event.severity]}`}
                style={{ minWidth: '4px' }}
                aria-hidden
              />
              <div className="flex min-w-[220px] items-center justify-between gap-3">
                <div className="flex flex-col">
                  <span className="text-[12px] font-semibold text-white">{event.title}</span>
                  <span className="text-[11px] text-slate-400">
                    {formatSeconds(event.remainingMs)} restantes
                  </span>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badgeColors[event.severity]}`}
                >
                  {event.severity === 'info'
                    ? 'Info'
                    : event.severity === 'warning'
                    ? 'Alerte'
                    : 'Critique'}
                </span>
              </div>
            </div>

            <div className="invisible absolute bottom-full right-0 mb-2 w-[320px] translate-y-1 opacity-0 transition duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
              <div className="overflow-hidden rounded-xl border border-slate-800/80 bg-slate-950/95 shadow-2xl backdrop-blur-md">
                <div
                  className={`h-1 bg-gradient-to-r ${severityColors[event.severity]}`}
                  style={{ width: `${ratio * 100}%` }}
                />
                <div className="flex flex-col gap-1 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300">{formatSeconds(event.remainingMs)} restantes</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badgeColors[event.severity]}`}
                    >
                      {event.severity === 'info'
                        ? 'Info'
                        : event.severity === 'warning'
                        ? 'Alerte'
                        : 'Critique'}
                    </span>
                  </div>
                  <p className="text-[13px] font-semibold text-slate-100 leading-tight">{event.title}</p>
                  <p className="text-[12px] text-slate-300 leading-snug">{event.description}</p>
                  {summary && (
                    <p className="mt-1 text-[11px] text-slate-400">{summary}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
