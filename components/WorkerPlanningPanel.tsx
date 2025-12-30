import React from 'react';
import { JOB_DEFINITIONS } from '@/pixi/data/game-model';
import { WorkerShiftAssignment } from '@/types/data-contract';
import { WorkerScheduleSnapshot } from '@/types/ui';

type WorkerPlanningPanelProps = {
  schedules: WorkerScheduleSnapshot[];
  onAssign: (
    workerId: string,
    slotIndex: number,
    assignment: WorkerShiftAssignment
  ) => void;
  onClose: () => void;
};

const assignmentOrder: WorkerShiftAssignment[] = [
  'primary',
  'secondary',
  'service',
  'rest',
];

const assignmentLabels: Record<WorkerShiftAssignment, string> = {
  primary: 'Principal',
  secondary: 'Secondaire',
  service: 'Services',
  rest: 'Repos',
};

const assignmentClasses: Record<WorkerShiftAssignment, string> = {
  primary: 'bg-emerald-900/40 text-emerald-100 border-emerald-500/60',
  secondary: 'bg-sky-900/40 text-sky-100 border-sky-500/60',
  service: 'bg-amber-900/50 text-amber-100 border-amber-500/60',
  rest: 'bg-slate-800/60 text-slate-200 border-slate-600/70',
};

const nextAssignment = (current: WorkerShiftAssignment): WorkerShiftAssignment => {
  const idx = assignmentOrder.indexOf(current);
  const nextIndex = (idx + 1) % assignmentOrder.length;
  return assignmentOrder[nextIndex];
};

const ResourceBar: React.FC<{
  label: string;
  value: number;
  colorFrom: string;
  colorTo: string;
}> = ({ label, value, colorFrom, colorTo }) => {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px] text-slate-300">
        <span className="uppercase">{label}</span>
        <span className="font-mono text-slate-200">{Math.round(value * 100)}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-800">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.min(value * 100, 100)}%`,
            backgroundImage: `linear-gradient(to right, ${colorFrom}, ${colorTo})`,
          }}
        />
      </div>
    </div>
  );
};

export const WorkerPlanningPanel: React.FC<WorkerPlanningPanelProps> = ({
  schedules,
  onAssign,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="absolute inset-0" role="presentation" onClick={onClose} />
      <section className="relative z-10 flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/95 shadow-2xl">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
          <div>
            <p className="text-xs uppercase text-slate-400">Planning journalier</p>
            <h2 className="text-lg font-semibold text-white">
              Répartir les créneaux des travailleuses
            </h2>
            <p className="text-sm text-slate-300">
              Blocs de 3h : cliquez pour alterner principal, secondaire, services ou repos.
              Fatigue et faim augmentent hors repos ; les créneaux de service rechargent les
              ressources.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-slate-800 px-3 py-1 text-sm font-semibold text-slate-200 hover:bg-slate-700"
          >
            Fermer
          </button>
        </header>

        <div className="flex flex-col gap-3 border-b border-slate-800 bg-slate-900/80 px-4 py-3 text-[12px] text-slate-200">
          <div className="flex flex-wrap gap-2">
            {assignmentOrder.map((assignment) => (
              <span
                key={assignment}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-semibold ${assignmentClasses[assignment]}`}
              >
                <span className="h-2 w-2 rounded-full bg-white/80" />
                {assignmentLabels[assignment]}
              </span>
            ))}
          </div>
          <p className="text-slate-300">
            Le créneau actuel est encadré. Un avertissement s&apos;affiche en cas de fatigue ou
            faim critique : ajustez en passant un bloc sur &ldquo;Services&rdquo; ou &ldquo;Repos&rdquo;.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {schedules.length === 0 ? (
            <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-4 text-sm text-slate-300">
              Aucune travailleuse recrutée pour l&apos;instant. Signez un contrat
              dans l&apos;onglet Recrutement pour configurer un planning.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {schedules.map((schedule) => {
              const job = JOB_DEFINITIONS[schedule.primaryJob];
              const caution = schedule.cautionLabel;

              return (
                <article
                  key={schedule.workerId}
                  className="rounded-xl border border-slate-700/70 bg-slate-900/80 p-3 shadow-lg"
                >
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-[11px] uppercase text-slate-400">
                        {job?.nameKey ?? 'Affectation'}
                      </p>
                      <p className="text-base font-semibold text-white">
                        {schedule.name}
                      </p>
                      <p className="text-[12px] text-slate-300">
                        Principal : {job?.nameKey ?? schedule.primaryJob} •
                        Secours :{' '}
                        {schedule.secondaryJobs.length > 0
                          ? schedule.secondaryJobs.join(', ')
                          : 'N/A'}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                      <span className="rounded-full bg-slate-800 px-2 py-1 text-slate-200">
                        Efficacité {Math.round(schedule.efficiencyModifier * 100)}%
                      </span>
                      {caution && (
                        <span className="rounded-full bg-rose-900/60 px-2 py-1 text-rose-100">
                          {caution}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mb-3 grid grid-cols-4 gap-2 md:grid-cols-8">
                    {schedule.slots.map((slot, index) => {
                      const isCurrent = schedule.currentSlotIndex === index;
                      return (
                        <button
                          key={`${schedule.workerId}-${slot.startHour}`}
                          onClick={() =>
                            onAssign(
                              schedule.workerId,
                              index,
                              nextAssignment(slot.assignment)
                            )
                          }
                          className={`flex flex-col gap-1 rounded-lg border px-2 py-2 text-left text-[12px] font-semibold transition ${assignmentClasses[slot.assignment]} ${isCurrent ? 'ring-2 ring-sky-400 ring-offset-1 ring-offset-slate-900' : ''}`}
                        >
                          <span className="font-mono text-[11px] text-slate-100">
                            {String(slot.startHour).padStart(2, '0')}h-
                            {String(slot.endHour).padStart(2, '0')}h
                          </span>
                          <span>{slot.label}</span>
                          <span className="text-[11px] text-slate-200">
                            {assignmentLabels[slot.assignment]}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                    <ResourceBar
                      label="Fatigue"
                      value={schedule.fatigue}
                      colorFrom="#f472b6"
                      colorTo="#fb7185"
                    />
                    <ResourceBar
                      label="Faim"
                      value={schedule.hunger}
                      colorFrom="#fbbf24"
                      colorTo="#f59e0b"
                    />
                    <ResourceBar
                      label="Moral"
                      value={schedule.morale}
                      colorFrom="#34d399"
                      colorTo="#22d3ee"
                    />
                  </div>
                </article>
              );
            })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
