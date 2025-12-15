/* ============================================================================
 * Mini City Tycoon — Data Contracts (engine-agnostic)
 * - AssetDefinition / SpriteRule (exact contract)
 * - Full abstract gameplay model (City / Buildings / Passives / Workers / Visitors)
 * - Skill procs with triggers/conditions/chance/cooldowns
 *
 * This file is intentionally framework/engine agnostic and purely data-driven.
 * Pixi/React can consume it via adapters (asset loader, sprite resolver, renderer).
 * ========================================================================== */

/* ----------------------------- 0) Primitives ----------------------------- */

export type ID = string;
/** 0..1 */
export type Percentage = number;
/** epoch ms or monotonic tick time depending on your simulation choice */
export type Timestamp = number;

/** Optional helper: used to pick a deterministic RNG key (seed) */
export type SeedKey = string;

/** Use for stable, hierarchical tags (e.g. "visitor.premium", "building.hotel") */
export type Tag = string;

export interface PersonIdentity {
  firstName: string;
  lastName: string;
  age: number;
  origin?: string;
  title?: string;
  motto?: string;
}

/* ---------------------- 1) AssetDefinition & SpriteRule ------------------- */

/**
 * The game is designed so every "thing" (visitor, worker, building, upgrade, skill...)
 * can expose one or more visual assets, selected by rules.
 *
 * - Definitions are data-only, no Pixi refs.
 * - The engine uses SpriteRule to resolve which asset to use in a given context.
 * - A fallback chain ensures missing assets do not break the game.
 */

/** Common categories of visuals the game can request */
export type VisualKind =
  | "sprite" // entity on the map (visitor, worker, building)
  | "portrait" // UI (cards, popovers)
  | "icon" // UI small icon
  | "effect" // VFX sprite / particles / overlay
  | "tileset"; // for tile-based render if you want later

/** A named layer (useful for compositing: base body + hat + badge, etc.) */
export type SpriteLayer =
  | "base"
  | "overlay"
  | "badge"
  | "shadow"
  | "highlight"
  | "state";

/** Rendering variant for an entity (idle/moving/working/etc.) */
export type SpriteVariant =
  | "idle"
  | "move"
  | "work"
  | "rest"
  | "consume"
  | "enter"
  | "leave"
  | "disabled"
  | "selected";

/** Orientation (optional). Even if movement is orthogonal, visuals can face direction. */
export type Facing = "N" | "E" | "S" | "W";

/**
 * A single concrete asset candidate.
 * `uri` can be:
 * - relative path: "assets/characters/visitors/default/visitor_01.png"
 * - remote: "https://..."
 * - atlas frame id: "atlas:main#visitor_01"
 */
export interface AssetDefinition {
  /** Unique id, stable */
  id: ID;

  /** What kind of visual it is */
  kind: VisualKind;

  /** Tags used by rules and tooling (modpacks) */
  tags?: Tag[];

  /** Primary source */
  uri: string;

  /** Optional: if this is a frame within an atlas/tileset */
  atlasRef?: {
    atlasId: ID;
    frame: string;
  };

  /** Optional: dimensions/hints (not required by simulation) */
  meta?: {
    width?: number;
    height?: number;
    pivot?: { x: number; y: number };
    /** default scale when drawn */
    scale?: number;
    /** zIndex hint if relevant */
    zIndex?: number;
  };

  /** Optional: for animated sprites */
  animation?: {
    /** if frames are separate assets or atlas frames */
    frames: string[];
    fps: number;
    loop?: boolean;
  };

  /** Fallback chain: if this asset missing, try these ids in order */
  fallbacks?: ID[];

  /**
   * Optional: specify that this asset is part of a modpack and can override others
   * e.g. pack "neon" provides better visitor sprites.
   */
  sourcePackId?: ID;
}

/**
 * Dynamic selection constraints.
 * The resolver checks these against a context object (visitor/worker/building/city/etc.).
 *
 * `path` uses dot-notation.
 * Example: "entity.state" or "worker.resources.endurance.current"
 */
export type Comparator = ">=" | ">" | "<=" | "<" | "==" | "!=";

export interface ConditionAtom {
  path: string;
  op: Comparator;
  value: number | boolean | string;
}

export interface ConditionGroup {
  all?: Condition[];
  any?: Condition[];
  not?: Condition;
}

export type Condition = ConditionAtom | ConditionGroup;

export interface ReputationRequirement {
  local?: { min?: number; max?: number };
  premium?: { min?: number; max?: number };
  regulatoryPressure?: { min?: number; max?: number };
}

export interface UnlockRequirements {
  money?: number;
  reputation?: ReputationRequirement;
}

/**
 * How we pick one asset among many candidates:
 * - deterministic: stable for entityId, can change when variant changes
 * - random: non-deterministic (still seedable)
 * - first: first matching by priority
 */
export type SelectionMode = "first" | "random" | "deterministic";

/**
 * When we need visuals, we ask the resolver:
 * "Give me a sprite for entity X in variant Y facing Z"
 *
 * SpriteRule declares how to choose it.
 */
export interface SpriteRule {
  id: ID;

  /** Which visuals this rule applies to */
  kind: VisualKind;

  /**
   * The target scope:
   * - "visitor" | "worker" | "building" | "upgrade" | "skill" | "city" | "effect"
   * This keeps rules engine-agnostic and gameplay-agnostic.
   */
  target:
    | "visitor"
    | "worker"
    | "building"
    | "upgrade"
    | "skill"
    | "city"
    | "effect";

  /** Optional rule tags (for debugging / tooling) */
  tags?: Tag[];

  /**
   * Higher priority rules win.
   * Typical: 1000 = very specific, 100 = normal, 10 = fallback.
   */
  priority: number;

  /** Optional gating conditions */
  conditions?: Condition;

  /**
   * Desired variant. If omitted, applies to all.
   * Example: apply only when worker is "move".
   */
  variant?: SpriteVariant;

  /** Desired facing. If omitted, applies to all. */
  facing?: Facing;

  /** Candidate assets to pick from (ids referencing AssetDefinition) */
  candidates: ID[];

  /** Candidate weights (same length as candidates). If omitted => equal weights. */
  weights?: number[];

  /** How to pick among candidates */
  mode?: SelectionMode;

  /**
   * If deterministic, the resolver may use these keys to build a stable RNG key:
   * - entity.id
   * - entity.type
   * - variant/facing
   * - custom keys
   */
  deterministicKeyPaths?: string[];

  /**
   * Fallback rule if none of the candidates are available.
   * Useful for safe defaults.
   */
  fallbackRuleId?: ID;
}

/**
 * Runtime request context for sprite resolution.
 * The renderer builds this on demand.
 */
export interface SpriteResolveRequest {
  kind: VisualKind;
  target: SpriteRule["target"];

  /** The subject data, e.g. Visitor/Worker/BuildingInstance */
  entity: unknown;

  /** Optional extra context: city, building, visitor, etc. */
  context?: Record<string, unknown>;

  variant?: SpriteVariant;
  facing?: Facing;

  /** For deterministic selection */
  seedKey?: SeedKey;
}

/**
 * The resolved asset to draw (still engine-agnostic).
 * Adapter for Pixi will map this to Texture/Sprite/AnimatedSprite etc.
 */
export interface ResolvedSprite {
  assetId: ID;
  uri: string;
  kind: VisualKind;
  variant?: SpriteVariant;
  facing?: Facing;
  layer?: SpriteLayer;

  meta?: AssetDefinition["meta"];
  animation?: AssetDefinition["animation"];

  /** Debug info for tooling */
  resolvedByRuleId?: ID;
}

/**
 * A registry that an engine can load:
 * - assets are content
 * - rules decide which content to use for which entity/state
 */
export interface AssetRegistry {
  assets: Record<ID, AssetDefinition>;
  rules: Record<ID, SpriteRule>;

  /**
   * Optional: allow packs to override assets/rules by id.
   * "activePacks" order defines override precedence.
   */
  packs?: Record<ID, AssetPack>;
  activePackIds?: ID[];
}

export interface AssetPack {
  id: ID;
  name: string;
  description?: string;

  /** Partial overrides */
  assets?: Record<ID, AssetDefinition>;
  rules?: Record<ID, SpriteRule>;
}

/* --------------------- 2) Abstract gameplay data model -------------------- */

export interface City {
  id: ID;
  name: string;
  money: number;
  reputation: Reputation;

  buildings: Record<ID, BuildingInstance>;
  workers: Record<ID, Worker>;
  visitors: Record<ID, Visitor>;

  modifiers: CityModifier[];
}

export interface Reputation {
  local: number;
  premium: number;
  regulatoryPressure: number;
}

/* ------------------------------ Buildings -------------------------------- */

export type BuildingCategory =
  | "hotel"
  | "restaurant"
  | "casino"
  | "service"
  | "staff_housing"
  | "staff_support"
  | "infrastructure"
  | "road";

export interface BuildingDefinition {
  id: ID;
  category: BuildingCategory;

  baseCost: number;

  /** Max occupants of visitors enjoying services */
  baseVisitorCapacity: number;

  /** Max workers assigned */
  workerSlots: number;

  /** Base passive income per tick (before modifiers) */
  basePassiveIncome: number;

  /** Base tick interval (ms or ticks depending on simulation) */
  baseIncomeInterval: number;

  /** Allowed jobs for worker assignment */
  allowedWorkerRoles: JobID[];

  /** Passives that can be unlocked for this building */
  passiveUnlocks: PassiveDefinition[];

  /** Optional durability/condition system */
  baseCondition?: number; // 0..1
}

export interface BuildingInstance {
  id: ID;
  definitionId: ID;

  /** grid coordinates if you store them */
  grid?: { x: number; y: number };

  level: number;
  condition: number; // 0..1
  active: boolean;

  assignedWorkers: ID[];
  unlockedPassives: PassiveInstance[];

  /** current effective income per tick */
  currentIncome: number;

  /** people inside: visitors vs workers */
  occupants: BuildingOccupants;

  /** For scheduling income tick */
  incomeTimer?: IncomeTimerState;
}

export interface BuildingOccupants {
  visitorsInside: number;
  workersInside: number;
}

/** Timer state used to avoid "instant trigger after pause" */
export interface IncomeTimerState {
  lastTickAt: Timestamp;
  interval: number;
}

/* -------------------------------- Passives ------------------------------- */

export type PassiveTarget = "city" | "building" | "worker" | "visitor";

export interface PassiveDefinition {
  id: ID;
  descriptionKey: string; // localization key
  effects: PassiveEffect[];
}

export interface PassiveInstance {
  passiveId: ID;
  level: number;
}

export interface PassiveEffect {
  target: PassiveTarget;
  stat: string;
  value: number;
  mode: "additive" | "multiplicative";
}

/* -------------------------------- Workers -------------------------------- */

export interface Worker {
  id: ID;

  identity?: PersonIdentity;

  level: number;
  experience: number;

  stats: WorkerStats;
  resources: WorkerResources;

  jobs: WorkerJobs;
  skillTrees: Record<JobID, SkillTreeProgress>;

  assignedBuildingId?: ID;

  traits: Trait[];

  /** runtime only, optional */
  skillRuntime?: SkillRuntimeState;

  /** Salaire journalier brut attendu (ajuste l'économie multi-niveaux). */
  salaryPerDay?: number;

  /** optional: for movement/needs simulation */
  needs?: WorkerNeeds;
}

export interface WorkerStats {
  efficiency: number;
  versatility: number;
  stressResistance: number;
  loyalty: number;
}

export interface WorkerResources {
  endurance: Resource;
  health: Resource;
  morale: Resource;
}

export interface Resource {
  current: number;
  max: number;
}

export type JobID = ID;

export interface JobDefinition {
  id: JobID;
  nameKey: string;
  baseEfficiency: number;
  skillTreeId: ID;
}

export interface WorkerJobs {
  primary: JobID;
  secondary: JobID[];
}

/** Optional needs loop (engine-agnostic) */
export interface WorkerNeeds {
  fatigue: number; // 0..1
  stress: number; // 0..1
  hunger: number; // 0..1
  restTargetBuildingId?: ID;
}

/* ------------------------------ Skill trees ------------------------------ */

export interface SkillTree {
  id: ID;
  jobId: JobID;
  nodes: Record<ID, SkillNode>;
}

export interface SkillTreeProgress {
  /** nodeId -> rank */
  unlockedNodes: Record<ID, number>;
}

export type SkillTrigger =
  | "onAssign"
  | "onShiftStart"
  | "onShiftEnd"
  | "onTask"
  | "onVisitorArrive"
  | "onVisitorConsume"
  | "onIncomeTick"
  | "onDamage"
  | "onLowResource"
  | "manual";

export interface ProcSpec {
  /** 0..1 (ex: 0.25 = 25%) */
  chance?: Percentage;
  cooldownTicks?: number;
  maxPerWindow?: {
    window: "shift" | "day" | "visitor" | "building";
    count: number;
  };
  costs?: Partial<{
    endurance: number;
    health: number;
    morale: number;
    money: number;
  }>;
}

export interface SkillProc {
  id: ID;
  trigger: SkillTrigger;
  conditions?: Condition;
  spec?: ProcSpec;
  effects: PassiveEffect[];

  /** Optional: link to visuals for VFX/icon, etc */
  visuals?: VisualRefs;
}

export interface SkillNode {
  id: ID;
  cost: number;
  maxRank: number;
  requirements?: UnlockRequirements;

  /** Permanent effects once unlocked */
  effects: PassiveEffect[];
  prerequisites: ID[];

  /** Triggered effects */
  procs?: SkillProc[];

  /** Optional: visuals for UI */
  visuals?: VisualRefs;
}

export interface SkillRuntimeState {
  cooldownUntilTick: Record<ID, number>;
  windowCounters: Record<string, number>;
}

/* -------------------------------- Visitors ------------------------------- */

export type VisitorState =
  | "arriving"
  | "wandering"
  | "consuming"
  | "resting"
  | "waiting"
  | "leaving";

export interface VisitorPreferences {
  luxury: number;
  priceSensitivity: number;
  variety: number;
  discretion: number;
}

export interface Visitor {
  id: ID;

  identity?: PersonIdentity;

  budget: number;
  patience: number;

  preferences: VisitorPreferences;

  satisfaction: number; // can be 0..1 or 0..100, your choice
  fatigue: number;

  /**
   * Non-staff do not débloquer un arbre de compétences : ils progressent via une barre d’XP simple.
   * Elle peut influencer les caractéristiques (patience, budget) mais reste motorisée côté données.
   */
  level?: number;
  experience: number;
  experienceToNext?: number;

  state: VisitorState;

  timeInCity: number;

  /** optional: current target building / route decisions */
  targetBuildingId?: ID;

  /** optional visuals */
  visuals?: VisualRefs;
}

/* -------------------------- Traits & Modifiers --------------------------- */

export interface Trait {
  id: ID;
  descriptionKey: string;
  effects: PassiveEffect[];
  visuals?: VisualRefs;
}

export interface CityModifier {
  sourceId: ID;
  effects: PassiveEffect[];
  duration?: number; // ticks
  visuals?: VisualRefs;
}

export interface SimulationTickContext {
  deltaTime: number;

  cityModifiers: CityModifier[];
  buildingModifiers: Record<ID, PassiveEffect[]>;
  workerModifiers: Record<ID, PassiveEffect[]>;
  visitorModifiers: Record<ID, PassiveEffect[]>;

  /** current tick index for cooldowns */
  tickIndex: number;
}

/* ----------------------- 3) Visual references on data --------------------- */

/**
 * Instead of hardcoding a single sprite path into entities,
 * we reference visuals by "visual slots" and let rules pick concrete assets.
 */
export type VisualSlot =
  | "mapSprite"
  | "portrait"
  | "icon"
  | "upgradeIcon"
  | "skillIcon"
  | "skillVfx"
  | "incomeVfx";

export interface VisualRefs {
  /** which sprite rule targets should apply (tags aid resolution) */
  tags?: Tag[];

  /**
   * Optional direct hints:
   * - allow content designers to specify preferred packs or families
   */
  preferredPackIds?: ID[];

  /**
   * Optional per-slot preferred rule ids.
   * If provided, the resolver tries these rules first.
   */
  preferredRuleIds?: Partial<Record<VisualSlot, ID>>;
}

/* --------------------- 4) Example "exact" SpriteRule usage ---------------- */

/**
 * Example:
 * - For a visitor on the map in "move" variant,
 *   pick a deterministic sprite among "visitor_default_*"
 */
export const EXAMPLE_ASSET_REGISTRY: AssetRegistry = {
  assets: {
    "visitor_default_01": {
      id: "visitor_default_01",
      kind: "sprite",
      uri: "assets/characters/visitors/default/visitor_01.png",
      tags: ["visitor.default"],
      meta: { width: 32, height: 32, scale: 1 },
      fallbacks: ["visitor_fallback"],
    },
    "visitor_default_02": {
      id: "visitor_default_02",
      kind: "sprite",
      uri: "assets/characters/visitors/default/visitor_02.png",
      tags: ["visitor.default"],
      meta: { width: 32, height: 32, scale: 1 },
      fallbacks: ["visitor_fallback"],
    },
    "visitor_fallback": {
      id: "visitor_fallback",
      kind: "sprite",
      uri: "assets/characters/visitors/default/fallback.png",
      tags: ["visitor.fallback"],
      meta: { width: 32, height: 32, scale: 1 },
    },
  },
  rules: {
    "visitor_map_move_default": {
      id: "visitor_map_move_default",
      kind: "sprite",
      target: "visitor",
      priority: 100,
      variant: "move",
      candidates: ["visitor_default_01", "visitor_default_02"],
      mode: "deterministic",
      deterministicKeyPaths: ["entity.id", "variant"],
    },
    "visitor_map_idle_default": {
      id: "visitor_map_idle_default",
      kind: "sprite",
      target: "visitor",
      priority: 90,
      variant: "idle",
      candidates: ["visitor_default_01", "visitor_default_02"],
      mode: "deterministic",
      deterministicKeyPaths: ["entity.id", "variant"],
    },
  },
};

/* ============================================================================
 * Notes for integration (not code):
 * - A "SpriteResolver" will:
 *   1) collect rules matching request.kind/target (+ optional variant/facing)
 *   2) filter by conditions (Condition evaluator on request.entity + request.context)
 *   3) sort by priority desc
 *   4) pick asset according to SelectionMode
 *   5) follow fallbacks if missing
 *
 * - This is mod-friendly:
 *   AssetPack can override assets/rules by the same IDs.
 * ========================================================================== */
