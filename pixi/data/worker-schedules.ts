import { Worker, WorkerScheduleSlot } from '@/types/data-contract';

const BASE_SLOTS: WorkerScheduleSlot[] = [
  { startHour: 0, endHour: 3, assignment: 'rest', label: 'Repos' },
  { startHour: 3, endHour: 6, assignment: 'rest', label: 'Repos' },
  { startHour: 6, endHour: 9, assignment: 'primary', label: 'Bloc matin' },
  { startHour: 9, endHour: 12, assignment: 'primary', label: 'Bloc matin' },
  { startHour: 12, endHour: 15, assignment: 'service', label: 'Pause & services' },
  { startHour: 15, endHour: 18, assignment: 'primary', label: 'Bloc après-midi' },
  { startHour: 18, endHour: 21, assignment: 'secondary', label: 'Support' },
  { startHour: 21, endHour: 24, assignment: 'rest', label: 'Repos' },
];

export const createDefaultSchedule = (worker: Worker): WorkerScheduleSlot[] => {
  if (worker.jobs.primary === 'guard') {
    return BASE_SLOTS.map((slot, index) =>
      index === 6
        ? { ...slot, assignment: 'primary', label: 'Patrouille soirée' }
        : slot
    );
  }

  return BASE_SLOTS.map((slot) => ({ ...slot }));
};
