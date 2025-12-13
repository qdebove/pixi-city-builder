import {
  BuildingDefinition,
  BuildingInstance,
  BuildingOccupants,
  City,
  JobDefinition,
  JobID,
  PassiveDefinition,
  PassiveEffect,
  PassiveInstance,
  SkillNode,
  SkillTree,
  Trait,
  Visitor,
  VisitorPreferences,
  Worker,
} from '@/types/data-contract';

const createOccupants = (visitorsInside: number, workersInside: number): BuildingOccupants => ({
  visitorsInside,
  workersInside,
});

const basePassiveEffects: Record<string, PassiveEffect> = {
  comfortBoost: {
    target: 'building',
    stat: 'comfort',
    value: 0.1,
    mode: 'additive',
  },
  premiumPull: {
    target: 'city',
    stat: 'premiumVisitors',
    value: 0.05,
    mode: 'multiplicative',
  },
  upkeepSaver: {
    target: 'building',
    stat: 'upkeep',
    value: -0.08,
    mode: 'additive',
  },
};

export const PASSIVE_DEFINITIONS: Record<string, PassiveDefinition> = {
  hospitalityTraining: {
    id: 'hospitalityTraining',
    descriptionKey: 'passive.hospitalityTraining',
    effects: [basePassiveEffects.comfortBoost],
  },
  vipAmbassador: {
    id: 'vipAmbassador',
    descriptionKey: 'passive.vipAmbassador',
    effects: [basePassiveEffects.premiumPull],
  },
  leanOps: {
    id: 'leanOps',
    descriptionKey: 'passive.leanOps',
    effects: [basePassiveEffects.upkeepSaver],
  },
};

export const TRAITS: Trait[] = [
  {
    id: 'polyglot',
    descriptionKey: 'trait.polyglot',
    effects: [
      {
        target: 'worker',
        stat: 'efficiency',
        value: 0.05,
        mode: 'multiplicative',
      },
    ],
    visuals: {
      preferredRuleIds: { skillIcon: 'skill_icon_polyglot' },
      tags: ['trait'],
    },
  },
  {
    id: 'meticulous',
    descriptionKey: 'trait.meticulous',
    effects: [
      {
        target: 'worker',
        stat: 'stressResistance',
        value: 0.1,
        mode: 'additive',
      },
    ],
    visuals: {
      preferredRuleIds: { skillIcon: 'skill_icon_meticulous' },
      tags: ['trait'],
    },
  },
];

export const JOB_DEFINITIONS: Record<JobID, JobDefinition> = {
  concierge: {
    id: 'concierge',
    nameKey: 'job.concierge',
    baseEfficiency: 1,
    skillTreeId: 'concierge_tree',
  },
  technician: {
    id: 'technician',
    nameKey: 'job.technician',
    baseEfficiency: 1,
    skillTreeId: 'technician_tree',
  },
};

const conciergeNodes: Record<string, SkillNode> = {
  welcomeCharm: {
    id: 'welcomeCharm',
    cost: 1,
    maxRank: 3,
    effects: [
      {
        target: 'visitor',
        stat: 'satisfaction',
        value: 0.05,
        mode: 'additive',
      },
    ],
    prerequisites: [],
    visuals: {
      preferredRuleIds: { skillIcon: 'skill_icon_welcome' },
      tags: ['concierge'],
    },
  },
  vipHandler: {
    id: 'vipHandler',
    cost: 2,
    maxRank: 2,
    effects: [
      {
        target: 'city',
        stat: 'premiumVisitors',
        value: 0.03,
        mode: 'multiplicative',
      },
    ],
    prerequisites: ['welcomeCharm'],
    visuals: {
      preferredRuleIds: { skillIcon: 'skill_icon_vip' },
      tags: ['premium'],
    },
  },
};

const technicianNodes: Record<string, SkillNode> = {
  quickFix: {
    id: 'quickFix',
    cost: 1,
    maxRank: 3,
    effects: [
      {
        target: 'building',
        stat: 'condition',
        value: 0.05,
        mode: 'additive',
      },
    ],
    prerequisites: [],
    visuals: {
      preferredRuleIds: { skillIcon: 'skill_icon_toolkit' },
      tags: ['maintenance'],
    },
  },
  riskMonitor: {
    id: 'riskMonitor',
    cost: 2,
    maxRank: 1,
    effects: [
      {
        target: 'city',
        stat: 'regulation',
        value: -0.02,
        mode: 'additive',
      },
    ],
    prerequisites: ['quickFix'],
    visuals: {
      preferredRuleIds: { skillIcon: 'skill_icon_alert' },
      tags: ['risk'],
    },
  },
};

export const SKILL_TREES: Record<string, SkillTree> = {
  concierge_tree: {
    id: 'concierge_tree',
    jobId: 'concierge',
    nodes: conciergeNodes,
  },
  technician_tree: {
    id: 'technician_tree',
    jobId: 'technician',
    nodes: technicianNodes,
  },
};

export const BUILDING_DEFINITIONS: Record<string, BuildingDefinition> = {
  hotel: {
    id: 'hotel',
    category: 'hotel',
    baseCost: 1000,
    baseVisitorCapacity: 8,
    workerSlots: 3,
    basePassiveIncome: 120,
    baseIncomeInterval: 2500,
    allowedWorkerRoles: ['concierge'],
    passiveUnlocks: [PASSIVE_DEFINITIONS.hospitalityTraining],
  },
  restaurant: {
    id: 'restaurant',
    category: 'restaurant',
    baseCost: 800,
    baseVisitorCapacity: 12,
    workerSlots: 4,
    basePassiveIncome: 140,
    baseIncomeInterval: 2200,
    allowedWorkerRoles: ['concierge', 'technician'],
    passiveUnlocks: [PASSIVE_DEFINITIONS.leanOps],
  },
  casino: {
    id: 'casino',
    category: 'casino',
    baseCost: 1800,
    baseVisitorCapacity: 16,
    workerSlots: 6,
    basePassiveIncome: 260,
    baseIncomeInterval: 1800,
    allowedWorkerRoles: ['concierge', 'technician'],
    passiveUnlocks: [PASSIVE_DEFINITIONS.vipAmbassador],
  },
};

const defaultBuildingInstance = (
  definitionId: string,
  occupants: BuildingOccupants,
  unlockedPassives: PassiveInstance[]
): BuildingInstance => ({
  id: `${definitionId}-01`,
  definitionId,
  level: 1,
  condition: 1,
  active: true,
  assignedWorkers: [],
  unlockedPassives,
  currentIncome: BUILDING_DEFINITIONS[definitionId].basePassiveIncome,
  occupants,
  incomeTimer: {
    lastTickAt: 0,
    interval: BUILDING_DEFINITIONS[definitionId].baseIncomeInterval,
  },
});

const visitorTemplate = (
  id: string,
  preferences: VisitorPreferences,
  budget: number,
  patience: number,
  satisfaction: number
): Visitor => ({
  id,
  preferences,
  budget,
  patience,
  satisfaction,
  fatigue: 0,
  state: 'arriving',
  timeInCity: 0,
  visuals: { preferredRuleIds: { icon: 'visitor_icon', portrait: 'visitor_portrait' } },
});

export const VISITOR_ARCHETYPES: Visitor[] = [
  visitorTemplate(
    'visitor_leisure',
    { luxury: 0.4, priceSensitivity: 0.5, variety: 0.7, discretion: 0.6 },
    350,
    0.6,
    0.6
  ),
  visitorTemplate(
    'visitor_premium',
    { luxury: 0.85, priceSensitivity: 0.2, variety: 0.4, discretion: 0.8 },
    700,
    0.75,
    0.7
  ),
];

const workerTemplate = (
  id: string,
  job: JobID,
  traits: Trait[]
): Worker => ({
  id,
  level: 1,
  experience: 0,
  stats: {
    efficiency: 1,
    versatility: 1,
    stressResistance: 0.8,
    loyalty: 0.75,
  },
  resources: {
    endurance: { current: 100, max: 100 },
    health: { current: 100, max: 100 },
    morale: { current: 80, max: 100 },
  },
  jobs: { primary: job, secondary: [] },
  skillTrees: {
    [JOB_DEFINITIONS[job].skillTreeId]: { unlockedNodes: {} },
  },
  traits,
});

export const WORKER_ROSTER: Worker[] = [
  workerTemplate('worker_alix', 'concierge', [TRAITS[0]]),
  workerTemplate('worker_jade', 'technician', [TRAITS[1]]),
];

export const CITY_MODEL: City = {
  id: 'city_proto',
  name: 'Ville Prototype',
  money: 2500,
  reputation: {
    local: 55,
    premium: 45,
    regulatoryPressure: 10,
  },
  modifiers: [],
  buildings: {
    hotelA: defaultBuildingInstance(
      BUILDING_DEFINITIONS.hotel.id,
      createOccupants(4, 1),
      [{ passiveId: 'hospitalityTraining', level: 1 }]
    ),
    restaurantA: defaultBuildingInstance(
      BUILDING_DEFINITIONS.restaurant.id,
      createOccupants(6, 2),
      []
    ),
  },
  workers: WORKER_ROSTER.reduce<Record<string, Worker>>((acc, worker) => {
    acc[worker.id] = worker;
    return acc;
  }, {}),
  visitors: VISITOR_ARCHETYPES.reduce<Record<string, Visitor>>((acc, visitor) => {
    acc[visitor.id] = visitor;
    return acc;
  }, {}),
};
