import {
  JobID,
  Visitor,
  Worker,
  WorkerShiftAssignment,
} from './data-contract';
import { PersonRole } from './types';

export interface SelectedPersonSnapshot {
  id: string;
  role: PersonRole;
  profile: Visitor | Worker;
}

export interface WorkerScheduleSlotSnapshot {
  startHour: number;
  endHour: number;
  label: string;
  assignment: WorkerShiftAssignment;
}

export interface WorkerScheduleSnapshot {
  workerId: string;
  name: string;
  primaryJob: JobID;
  secondaryJobs: JobID[];
  currentAssignment: WorkerShiftAssignment;
  currentSlotIndex: number;
  fatigue: number;
  hunger: number;
  morale: number;
  efficiencyModifier: number;
  cautionLabel?: string;
  slots: WorkerScheduleSlotSnapshot[];
}
