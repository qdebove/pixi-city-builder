import {
  AssetRegistry,
  VisualKind,
} from '../types/data-contract';

const circleSvg = (fill: string, stroke: string): string => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><circle cx="32" cy="32" r="22" fill="${fill}" stroke="${stroke}" stroke-width="4" /></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const badgeSvg = (label: string, color: string): string => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect x="8" y="8" rx="10" ry="10" width="48" height="48" fill="${color}" stroke="#0f172a" stroke-width="4" /><text x="32" y="38" font-family="Inter,Arial" font-weight="700" font-size="24" text-anchor="middle" fill="#0f172a">${label}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const spriteMeta = { width: 32, height: 32, scale: 0.9 } as const;

const mapAssets = {
  visitor_map_default: {
    id: 'visitor_map_default',
    kind: 'sprite' as VisualKind,
    uri: circleSvg('#f472b6', '#1f2937'),
    tags: ['visitor.default'],
    meta: spriteMeta,
  },
  visitor_map_alt: {
    id: 'visitor_map_alt',
    kind: 'sprite' as VisualKind,
    uri: circleSvg('#fb7185', '#1f2937'),
    tags: ['visitor.default'],
    meta: spriteMeta,
  },
  staff_map_default: {
    id: 'staff_map_default',
    kind: 'sprite' as VisualKind,
    uri: circleSvg('#38bdf8', '#0f172a'),
    tags: ['worker.default'],
    meta: spriteMeta,
  },
  staff_map_alt: {
    id: 'staff_map_alt',
    kind: 'sprite' as VisualKind,
    uri: circleSvg('#22d3ee', '#0f172a'),
    tags: ['worker.default'],
    meta: spriteMeta,
  },
};

const portraitAssets = {
  visitor_portrait_default: {
    id: 'visitor_portrait_default',
    kind: 'portrait' as VisualKind,
    uri: badgeSvg('V', '#f9a8d4'),
    tags: ['visitor.portrait'],
    meta: { width: 64, height: 64 },
  },
  staff_portrait_default: {
    id: 'staff_portrait_default',
    kind: 'portrait' as VisualKind,
    uri: badgeSvg('S', '#bae6fd'),
    tags: ['worker.portrait'],
    meta: { width: 64, height: 64 },
  },
};

const iconAssets = {
  visitor_icon_default: {
    id: 'visitor_icon_default',
    kind: 'icon' as VisualKind,
    uri: badgeSvg('V', '#fdf2f8'),
    tags: ['visitor.icon'],
    meta: { width: 32, height: 32 },
  },
  staff_icon_default: {
    id: 'staff_icon_default',
    kind: 'icon' as VisualKind,
    uri: badgeSvg('S', '#e0f2fe'),
    tags: ['worker.icon'],
    meta: { width: 32, height: 32 },
  },
};

export const BASE_ASSET_REGISTRY: AssetRegistry = {
  assets: {
    ...mapAssets,
    ...portraitAssets,
    ...iconAssets,
  },
  rules: {
    visitor_map_move: {
      id: 'visitor_map_move',
      kind: 'sprite',
      target: 'visitor',
      priority: 200,
      variant: 'move',
      mode: 'deterministic',
      deterministicKeyPaths: ['entity.id'],
      candidates: ['visitor_map_default', 'visitor_map_alt'],
    },
    visitor_map_idle: {
      id: 'visitor_map_idle',
      kind: 'sprite',
      target: 'visitor',
      priority: 180,
      variant: 'idle',
      mode: 'deterministic',
      deterministicKeyPaths: ['entity.id'],
      candidates: ['visitor_map_default', 'visitor_map_alt'],
      fallbackRuleId: 'visitor_map_move',
    },
    staff_map_move: {
      id: 'staff_map_move',
      kind: 'sprite',
      target: 'worker',
      priority: 200,
      variant: 'move',
      mode: 'deterministic',
      deterministicKeyPaths: ['entity.id'],
      candidates: ['staff_map_default', 'staff_map_alt'],
    },
    staff_map_idle: {
      id: 'staff_map_idle',
      kind: 'sprite',
      target: 'worker',
      priority: 180,
      variant: 'idle',
      mode: 'deterministic',
      deterministicKeyPaths: ['entity.id'],
      candidates: ['staff_map_default', 'staff_map_alt'],
      fallbackRuleId: 'staff_map_move',
    },
    visitor_portrait: {
      id: 'visitor_portrait',
      kind: 'portrait',
      target: 'visitor',
      priority: 100,
      candidates: ['visitor_portrait_default'],
      mode: 'first',
    },
    staff_portrait: {
      id: 'staff_portrait',
      kind: 'portrait',
      target: 'worker',
      priority: 100,
      candidates: ['staff_portrait_default'],
      mode: 'first',
    },
    visitor_icon: {
      id: 'visitor_icon',
      kind: 'icon',
      target: 'visitor',
      priority: 100,
      candidates: ['visitor_icon_default'],
      mode: 'first',
    },
    staff_icon: {
      id: 'staff_icon',
      kind: 'icon',
      target: 'worker',
      priority: 100,
      candidates: ['staff_icon_default'],
      mode: 'first',
    },
  },
};

