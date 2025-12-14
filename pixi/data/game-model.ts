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
    stat: 'income',
    value: 8,
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
    stat: 'interval',
    value: -150,
    mode: 'additive',
  },
  vipUpsell: {
    target: 'building',
    stat: 'income',
    value: 0.12,
    mode: 'multiplicative',
  },
  workerSynergy: {
    target: 'worker',
    stat: 'efficiency',
    value: 0.06,
    mode: 'multiplicative',
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
    effects: [basePassiveEffects.vipUpsell],
  },
  leanOps: {
    id: 'leanOps',
    descriptionKey: 'passive.leanOps',
    effects: [basePassiveEffects.upkeepSaver],
  },
  synergyTraining: {
    id: 'synergyTraining',
    descriptionKey: 'passive.synergyTraining',
    effects: [basePassiveEffects.workerSynergy],
  },
  fastTrack: {
    id: 'fastTrack',
    descriptionKey: 'passive.fastTrack',
    effects: [
      {
        target: 'building',
        stat: 'interval',
        value: -220,
        mode: 'additive',
      },
    ],
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
  guard: {
    id: 'guard',
    nameKey: 'job.guard',
    baseEfficiency: 1,
    skillTreeId: 'guard_tree',
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
    procs: [
      {
        id: 'welcomeCharm_proc',
        trigger: 'onIncomeTick',
        spec: { chance: 0.35, cooldownTicks: 2 },
        effects: [
          {
            target: 'building',
            stat: 'income',
            value: 6,
            mode: 'additive',
          },
        ],
      },
    ],
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
    procs: [
      {
        id: 'vipHandler_proc',
        trigger: 'onVisitorConsume',
        spec: { chance: 0.25, cooldownTicks: 4 },
        effects: [
          {
            target: 'building',
            stat: 'income',
            value: 0.08,
            mode: 'multiplicative',
          },
        ],
      },
    ],
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
    procs: [
      {
        id: 'quickFix_proc',
        trigger: 'onIncomeTick',
        spec: { chance: 0.3, cooldownTicks: 3 },
        effects: [
          {
            target: 'building',
            stat: 'interval',
            value: -120,
            mode: 'additive',
          },
        ],
      },
    ],
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

const guardNodes: Record<string, SkillNode> = {
  perimeterDrill: {
    id: 'perimeterDrill',
    cost: 1,
    maxRank: 3,
    requirements: {
      money: 200,
      reputation: { local: { min: -25 }, regulatoryPressure: { max: 80 } },
    },
    effects: [
      {
        target: 'city',
        stat: 'security',
        value: 0.06,
        mode: 'additive',
      },
    ],
    prerequisites: [],
    visuals: {
      preferredRuleIds: { skillIcon: 'skill_icon_guard' },
      tags: ['guard'],
    },
  },
  nightWatch: {
    id: 'nightWatch',
    cost: 2,
    maxRank: 2,
    requirements: {
      money: 320,
      reputation: {
        premium: { max: 40 },
        regulatoryPressure: { max: 65 },
      },
    },
    effects: [
      {
        target: 'city',
        stat: 'security',
        value: 0.12,
        mode: 'multiplicative',
      },
    ],
    prerequisites: ['perimeterDrill'],
    visuals: {
      preferredRuleIds: { skillIcon: 'skill_icon_patrol' },
      tags: ['guard', 'night'],
    },
    procs: [
      {
        id: 'nightWatch_proc',
        trigger: 'onIncomeTick',
        spec: { chance: 0.25, cooldownTicks: 3 },
        effects: [
          { target: 'building', stat: 'interval', value: -120, mode: 'additive' },
        ],
      },
    ],
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
  guard_tree: {
    id: 'guard_tree',
    jobId: 'guard',
    nodes: guardNodes,
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
  house: {
    id: 'house',
    category: 'hotel',
    baseCost: 120,
    baseVisitorCapacity: 2,
    workerSlots: 0,
    basePassiveIncome: 12,
    baseIncomeInterval: 2500,
    allowedWorkerRoles: [],
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
  shop: {
    id: 'shop',
    category: 'restaurant',
    baseCost: 480,
    baseVisitorCapacity: 5,
    workerSlots: 2,
    basePassiveIncome: 60,
    baseIncomeInterval: 2000,
    allowedWorkerRoles: ['concierge', 'technician'],
    passiveUnlocks: [PASSIVE_DEFINITIONS.fastTrack],
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
  factory: {
    id: 'factory',
    category: 'casino',
    baseCost: 1250,
    baseVisitorCapacity: 10,
    workerSlots: 4,
    basePassiveIncome: 150,
    baseIncomeInterval: 1500,
    allowedWorkerRoles: ['technician'],
    passiveUnlocks: [PASSIVE_DEFINITIONS.synergyTraining],
  },
};

export const BUILDING_PASSIVES_BY_TYPE: Record<string, PassiveInstance[]> = {
  house: [{ passiveId: 'hospitalityTraining', level: 1 }],
  shop: [
    { passiveId: 'fastTrack', level: 1 },
    { passiveId: 'synergyTraining', level: 1 },
  ],
  factory: [{ passiveId: 'vipAmbassador', level: 1 }],
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
  satisfaction: number,
  identity: Visitor['identity']
): Visitor => ({
  id,
  preferences,
  budget,
  patience,
  satisfaction,
  fatigue: 0,
  level: 1,
  experience: 0,
  experienceToNext: 120,
  state: 'arriving',
  timeInCity: 0,
  visuals: { preferredRuleIds: { icon: 'visitor_icon', portrait: 'visitor_portrait' } },
  identity,
});

export const VISITOR_ARCHETYPES: Visitor[] = [
  visitorTemplate(
    'visitor_leisure',
    { luxury: 0.4, priceSensitivity: 0.5, variety: 0.7, discretion: 0.6 },
    350,
    0.6,
    0.6,
    {
      firstName: 'Lina',
      lastName: 'Rives',
      age: 29,
      origin: 'Touriste curieuse',
      title: 'Voyageuse chill',
      motto: 'Ne jamais manquer une bonne vue.',
    }
  ),
  visitorTemplate(
    'visitor_premium',
    { luxury: 0.85, priceSensitivity: 0.2, variety: 0.4, discretion: 0.8 },
    700,
    0.75,
    0.7,
    {
      firstName: 'Malo',
      lastName: 'Dumont',
      age: 41,
      origin: 'Client VIP',
      title: 'Chasseur de suites',
      motto: 'Le confort est un investissement.',
    }
  ),
];

const workerTemplate = (
  id: string,
  job: JobID,
  traits: Trait[],
  identity: Worker['identity']
): Worker => ({
  id,
  identity,
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
    [JOB_DEFINITIONS[job].skillTreeId]: {
      unlockedNodes: (() => {
        const treeId = JOB_DEFINITIONS[job].skillTreeId;
        const starter = Object.values(SKILL_TREES[treeId]?.nodes ?? {})[0];
        if (!starter) return {};
        return { [starter.id]: 1 };
      })(),
    },
  },
  traits,
});

export const WORKER_ROSTER: Worker[] = [
  workerTemplate(
    'worker_alix',
    'concierge',
    [TRAITS[0]],
    {
      firstName: 'Alix',
      lastName: 'Mercier',
      age: 32,
      origin: 'Ancienne hôtesse VIP',
      title: 'Concierge solaire',
      motto: 'Chaque arrivée mérite un sourire.',
    }
  ),
  workerTemplate(
    'worker_jade',
    'technician',
    [TRAITS[1]],
    {
      firstName: 'Jade',
      lastName: 'Bourdin',
      age: 27,
      origin: 'Ex-maintenance événementielle',
      title: 'Technicienne méthodique',
      motto: 'Prévenir plutôt que réparer en urgence.',
    }
  ),
  workerTemplate(
    'worker_salma',
    'guard',
    [TRAITS[0]],
    {
      firstName: 'Salma',
      lastName: 'Derrien',
      age: 35,
      origin: 'Garde itinérante',
      title: 'Patrouilleuse discrète',
      motto: 'Une présence visible suffit souvent à calmer les ardeurs.',
    }
  ),
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
