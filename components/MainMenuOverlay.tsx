import React from 'react';
import { SkillTreePreview } from './SkillTreePreview';
import { BuildingLibrary } from './BuildingLibrary';
import { PeopleDirectory } from './PeopleDirectory';
import { PersonRole } from '@/types/types';
import { RecruitmentBoard } from './RecruitmentBoard';
import { ReputationSnapshot } from '@/pixi/ReputationSystem';
import { SecurityPanel } from './SecurityPanel';
import { SecuritySnapshot } from '@/pixi/SecuritySystem';

const GUARD_WORKER_ID = 'worker_salma';

export type MenuTab =
  | 'buildings'
  | 'skills'
  | 'people'
  | 'recruitment'
  | 'security';

interface MainMenuOverlayProps {
  open: boolean;
  tab: MenuTab;
  onTabChange: (tab: MenuTab) => void;
  onClose: () => void;
  occupantsByRole: Record<PersonRole, number>;
  movingPeople: Record<PersonRole, number>;
  money: number;
  reputation: ReputationSnapshot;
  totalClicks: number;
  security: SecuritySnapshot;
  guardPresence: { roaming: number; stationed: number };
  hiredWorkers: string[];
  hiredByJob: Record<string, number>;
  onHireWorker: (workerId: string) => void;
}

const tabs: { id: MenuTab; label: string; description: string }[] = [
  {
    id: 'buildings',
    label: 'Bâtiments',
    description:
      'Consulter la fiche descriptive de chaque type de bâtiment depuis le bureau d’urbanisme.',
  },
  {
    id: 'skills',
    label: 'Arbres de compétences',
    description:
      'Arbres dédiés par bâtiment, personnage et travailleur, avec une mise en page RPG.',
  },
  {
    id: 'security',
    label: 'Sécurité',
    description:
      'Couverture des gardes et recrutement d’une patrouille dédiée.',
  },
  {
    id: 'people',
    label: 'Personnes',
    description:
      'Accéder aux fiches des visiteurs et du personnel sans devoir sélectionner la scène.',
  },
  {
    id: 'recruitment',
    label: 'Recrutement',
    description:
      'Signer des contrats de travailleuses selon la progression, la réputation et les besoins actuels.',
  },
];

export const MainMenuOverlay: React.FC<MainMenuOverlayProps> = ({
  open,
  tab,
  onTabChange,
  onClose,
  occupantsByRole,
  movingPeople,
  money,
  reputation,
  totalClicks,
  security,
  guardPresence,
  hiredWorkers,
  hiredByJob,
  onHireWorker,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-slate-950/70 p-3 backdrop-blur-sm">
      <div
        className="absolute inset-0"
        role="presentation"
        onClick={onClose}
      />
      <section className="relative z-10 flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/95 shadow-2xl">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-4 py-3">
          <div className="flex flex-col">
            <p className="text-xs uppercase text-slate-400">Menu principal</p>
            <h2 className="text-lg font-semibold text-white">Accès aux sous-menus</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-slate-800 px-3 py-1 text-sm font-semibold text-slate-200 hover:bg-slate-700"
          >
            Fermer
          </button>
        </header>

        <nav className="flex flex-wrap gap-2 border-b border-slate-800 bg-slate-900/60 px-3 py-2">
          {tabs.map((item) => {
            const isActive = tab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex min-w-[180px] flex-1 items-start gap-2 rounded-lg border px-3 py-2 text-left text-[13px] transition md:flex-none ${
                  isActive
                    ? 'border-sky-400 bg-sky-900/30 text-white shadow'
                    : 'border-slate-700 bg-slate-800/80 text-slate-200 hover:border-slate-500'
                }`}
              >
                <span className="font-semibold leading-tight">{item.label}</span>
                <span className="text-[11px] leading-tight text-slate-300">
                  {item.description}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {tab === 'buildings' && <BuildingLibrary totalClicks={totalClicks} />}
          {tab === 'skills' && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-sky-200">Arbres de compétences</h3>
              <p className="text-sm text-slate-300">
                Chaque catégorie dispose désormais de son propre menu : progression des bâtiments,
                destinées des personnages visiteurs et voies de talents pour les travailleurs. La présentation a été
                repensée façon RPG (paliers, badges, ligne du temps) pour mieux distinguer chaque parcours.
              </p>
              <SkillTreePreview />
            </div>
          )}
          {tab === 'people' && (
            <PeopleDirectory
              occupantsByRole={occupantsByRole}
              movingPeople={movingPeople}
            />
          )}
          {tab === 'recruitment' && (
            <RecruitmentBoard
              occupantsByRole={occupantsByRole}
              reputation={reputation}
              money={money}
              totalClicks={totalClicks}
              hiredWorkers={hiredWorkers}
              onHireWorker={onHireWorker}
            />
          )}
          {tab === 'security' && (
            <SecurityPanel
              security={security}
              guardPresence={guardPresence}
              hiredGuards={hiredByJob.guard ?? 0}
              money={money}
              onHireGuard={() => onHireWorker(GUARD_WORKER_ID)}
            />
          )}
        </div>
      </section>
    </div>
  );
};
