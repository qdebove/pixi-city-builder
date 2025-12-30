import React from 'react';
import { SavedGameMetadata } from '@/types/save';

interface SaveManagerPanelProps {
  metadata: SavedGameMetadata | null;
  onSave: () => void | Promise<void>;
  onLoad: () => void | Promise<void>;
  onClear: () => void;
  version: number;
}

const formatTimestamp = (timestamp: number) =>
  new Date(timestamp).toLocaleString('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

export const SaveManagerPanel: React.FC<SaveManagerPanelProps> = ({
  metadata,
  onSave,
  onLoad,
  onClear,
  version,
}) => {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-700/80 bg-slate-900/80 p-4 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <h3 className="text-lg font-semibold text-white">Sauvegarde locale</h3>
            <p className="text-sm text-slate-300">
              Version {version} • Reprise complète (ville, personnel, skills, packs actifs)
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onSave}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white shadow hover:bg-emerald-500"
            >
              Sauvegarder maintenant
            </button>
            <button
              onClick={onLoad}
              disabled={!metadata}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold shadow ${
                metadata
                  ? 'bg-sky-600 text-white hover:bg-sky-500'
                  : 'bg-slate-700 text-slate-400 cursor-not-allowed'
              }`}
            >
              Reprendre
            </button>
            <button
              onClick={onClear}
              disabled={!metadata}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold shadow ${
                metadata
                  ? 'bg-rose-600 text-white hover:bg-rose-500'
                  : 'bg-slate-700 text-slate-400 cursor-not-allowed'
              }`}
            >
              Purger
            </button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
            <p className="text-xs uppercase text-slate-400">Statut</p>
            <p className="text-sm font-semibold text-white">
              {metadata ? 'Sauvegarde disponible' : 'Aucune sauvegarde locale'}
            </p>
            <p className="text-xs text-slate-300">
              {metadata ? `Le ${formatTimestamp(metadata.timestamp)}` : 'Créez un snapshot à tout moment.'}
            </p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
            <p className="text-xs uppercase text-slate-400">Progression</p>
            <p className="text-sm font-semibold text-white">
              {metadata ? `Jour ${metadata.day} • Mois ${metadata.month}` : '—'}
            </p>
            <p className="text-xs text-slate-300">
              {metadata ? `Année ${metadata.year} • ${metadata.money.toLocaleString('fr-FR')} €` : 'En attente de première capture'}
            </p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
            <p className="text-xs uppercase text-slate-400">Packs visuels actifs</p>
            <p className="text-sm font-semibold text-white">
              {metadata && metadata.activeAssetPacks.length > 0
                ? metadata.activeAssetPacks.join(' · ')
                : 'Palette par défaut'}
            </p>
            <p className="text-xs text-slate-300">
              La sauvegarde embarque les packs appliqués pour garantir une reprise fidèle.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-sm text-slate-200">
        <p className="font-semibold text-slate-100">Notes</p>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-300">
          <li>La sauvegarde stocke la grille complète (bâtiments, zones, dettes, réputation, événements actifs).</li>
          <li>Les travailleuses, leurs skills et les packs graphiques sont persistés pour éviter toute divergence.</li>
          <li>Les déplacements en cours sont vidés pour repartir sur une base cohérente.</li>
        </ul>
      </div>
    </div>
  );
};
