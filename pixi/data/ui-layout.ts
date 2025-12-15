import layoutData from './ui-layout.json';

export type MenuTabConfig = {
  id: string;
  label: string;
  description: string;
  layout?: 'vertical' | 'grid';
};

export type SkillPanelConfig = {
  id: string;
  title: string;
  description: string;
  source: 'workerTrees' | 'visitorTraits' | 'buildingPassives';
  accent: 'emerald' | 'amber' | 'violet';
};

export type RecruitmentPanelConfig = {
  id: string;
  title: string;
  description: string;
  content: 'candidates' | 'signals';
};

export type UILayoutConfig = {
  menuTabs: MenuTabConfig[];
  skillPanels: SkillPanelConfig[];
  recruitmentPanels: RecruitmentPanelConfig[];
};

export const MENU_LAYOUT: UILayoutConfig = layoutData;
