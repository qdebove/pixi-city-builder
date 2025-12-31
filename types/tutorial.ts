export type TutorialStepId = 'route' | 'pleasure' | 'assign' | 'finance' | 'debt';

export interface TutorialStep {
  id: TutorialStepId;
  title: string;
  description: string;
  reward: number;
}

export interface TutorialProgress {
  currentIndex: number;
  completed: TutorialStepId[];
}
