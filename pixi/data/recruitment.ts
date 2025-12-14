import { Worker } from '@/types/data-contract';

export const computeWorkerCost = (worker: Worker): number => {
  return 300 + worker.stats.efficiency * 180 + worker.level * 90;
};
