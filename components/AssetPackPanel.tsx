import React from 'react';
import { AssetPackPreview } from '@/pixi/assets/packs';

interface AssetPackPanelProps {
  packs: AssetPackPreview[];
  active: string[];
  onUpdate: (activeIds: string[]) => void | Promise<void>;
}

export const AssetPackPanel: React.FC<AssetPackPanelProps> = ({
  packs,
  active,
  onUpdate,
}) => {
  const togglePack = (id: string) => {
    const next = active.includes(id)
      ? active.filter((packId) => packId !== id)
      : [...active, id];
    onUpdate(next);
  };

  const accentColors: Record<AssetPackPreview['accent'], string> = {
    violet: 'border-violet-500/60 shadow-violet-500/10',
    amber: 'border-amber-500/60 shadow-amber-500/10',
    sky: 'border-sky-500/60 shadow-sky-500/10',
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-700/80 bg-slate-900/80 p-4 shadow-lg">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-semibold text-white">Packs graphiques</h3>
            <p className="text-sm text-slate-300">
              Activer/désactiver des mods visuels sans redémarrer : sprites, portraits et effets respectent le resolver.
            </p>
          </div>
          <div className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200">
            {active.length > 0 ? `${active.length} pack(s) actifs` : 'Palette par défaut'}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          {packs.map((pack) => {
            const isActive = active.includes(pack.id);
            return (
              <button
                key={pack.id}
                onClick={() => togglePack(pack.id)}
                className={`flex h-full flex-col items-start gap-2 rounded-xl border bg-slate-900/70 p-4 text-left transition hover:-translate-y-[1px] hover:border-sky-500 ${accentColors[pack.accent]} ${
                  isActive ? 'ring-1 ring-sky-400' : ''
                }`}
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-white">{pack.name}</p>
                    <p className="text-xs text-slate-300">{pack.description}</p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                      isActive
                        ? 'bg-emerald-600/30 text-emerald-100 border border-emerald-500/60'
                        : 'bg-slate-800 text-slate-200 border border-slate-700'
                    }`}
                  >
                    {isActive ? 'Actif' : 'Disponible'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 text-[11px] text-slate-200">
                  {pack.tags.map((tag) => (
                    <span
                      key={`${pack.id}-${tag}`}
                      className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-200"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-slate-300">
                  Chaque pack surcharge uniquement les assets déclarés, le fallback reste garanti par le resolver.
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-sm text-slate-200">
        <p className="font-semibold text-slate-100">Rappels moteur</p>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-300">
          <li>Les règles de sélection restent data-driven : pas d’asset hardcodé, fallback assuré.</li>
          <li>Les packs sont persistés avec les sauvegardes pour garantir une reprise cohérente.</li>
          <li>Les assets sont préchargés pour éviter les flashs lors du basculement en temps réel.</li>
        </ul>
      </div>
    </div>
  );
};
