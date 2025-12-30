import { AssetDefinition, AssetPack } from '@/types/data-contract';

const circleSvg = (fill: string, stroke: string): string => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><circle cx="32" cy="32" r="22" fill="${fill}" stroke="${stroke}" stroke-width="4" /></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const badgeSvg = (label: string, color: string): string => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect x="8" y="8" rx="10" ry="10" width="48" height="48" fill="${color}" stroke="#0f172a" stroke-width="4" /><text x="32" y="38" font-family="Inter,Arial" font-weight="700" font-size="24" text-anchor="middle" fill="#0f172a">${label}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const spriteMeta = { width: 32, height: 32, scale: 0.9 } as const;

const neonAssets: Record<string, AssetDefinition> = {
  visitor_map_default: {
    id: 'visitor_map_default',
    kind: 'sprite',
    uri: circleSvg('#f472b6', '#7c3aed'),
    tags: ['visitor.default'],
    meta: spriteMeta,
    sourcePackId: 'neon',
  },
  staff_map_default: {
    id: 'staff_map_default',
    kind: 'sprite',
    uri: circleSvg('#22d3ee', '#14b8a6'),
    tags: ['worker.default'],
    meta: spriteMeta,
    sourcePackId: 'neon',
  },
  visitor_portrait_default: {
    id: 'visitor_portrait_default',
    kind: 'portrait',
    uri: badgeSvg('V', '#0ea5e9'),
    tags: ['visitor.portrait'],
    meta: { width: 64, height: 64 },
    sourcePackId: 'neon',
  },
  staff_portrait_default: {
    id: 'staff_portrait_default',
    kind: 'portrait',
    uri: badgeSvg('S', '#a855f7'),
    tags: ['worker.portrait'],
    meta: { width: 64, height: 64 },
    sourcePackId: 'neon',
  },
  income_pulse: {
    id: 'income_pulse',
    kind: 'effect',
    uri: circleSvg('#a855f7', '#f472b6'),
    tags: ['effect.income'],
    meta: { width: 64, height: 64, scale: 1.25 },
    sourcePackId: 'neon',
  },
};

const noirAssets: Record<string, AssetDefinition> = {
  visitor_map_default: {
    id: 'visitor_map_default',
    kind: 'sprite',
    uri: circleSvg('#e5e7eb', '#111827'),
    tags: ['visitor.default'],
    meta: spriteMeta,
    sourcePackId: 'noir',
  },
  staff_map_default: {
    id: 'staff_map_default',
    kind: 'sprite',
    uri: circleSvg('#cbd5e1', '#0f172a'),
    tags: ['worker.default'],
    meta: spriteMeta,
    sourcePackId: 'noir',
  },
  visitor_icon_default: {
    id: 'visitor_icon_default',
    kind: 'icon',
    uri: badgeSvg('V', '#0f172a'),
    tags: ['visitor.icon'],
    meta: { width: 32, height: 32 },
    sourcePackId: 'noir',
  },
  staff_icon_default: {
    id: 'staff_icon_default',
    kind: 'icon',
    uri: badgeSvg('S', '#1f2937'),
    tags: ['worker.icon'],
    meta: { width: 32, height: 32 },
    sourcePackId: 'noir',
  },
  income_pulse: {
    id: 'income_pulse',
    kind: 'effect',
    uri: circleSvg('#fbbf24', '#f59e0b'),
    tags: ['effect.income'],
    meta: { width: 64, height: 64, scale: 1.15 },
    sourcePackId: 'noir',
  },
};

export const ASSET_PACKS: Record<string, AssetPack> = {
  neon: {
    id: 'neon',
    name: 'Néon',
    description: 'Palette saturée inspirée des districts nocturnes, avec contours contrastés.',
    assets: neonAssets,
  },
  noir: {
    id: 'noir',
    name: 'Noir & papier',
    description: 'Teintes grisées pour un rendu blueprint / plan technique.',
    assets: noirAssets,
  },
};

export interface AssetPackPreview {
  id: string;
  name: string;
  description?: string;
  accent: 'violet' | 'amber' | 'sky';
  tags: string[];
}

export const ASSET_PACK_PREVIEWS: AssetPackPreview[] = [
  {
    id: 'neon',
    name: ASSET_PACKS.neon.name,
    description: ASSET_PACKS.neon.description,
    accent: 'violet',
    tags: ['nuit', 'contraste', 'flux lumineux'],
  },
  {
    id: 'noir',
    name: ASSET_PACKS.noir.name,
    description: ASSET_PACKS.noir.description,
    accent: 'amber',
    tags: ['blueprint', 'lecture claire', 'cartouche sobre'],
  },
];
