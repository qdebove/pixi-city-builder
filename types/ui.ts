import {
  JobID,
  Visitor,
  Worker,
  WorkerShiftAssignment,
} from './data-contract';
import { EventSeverity } from './events';
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

export type NotificationSeverity = EventSeverity;

export type NotificationAction =
  | { type: 'focus-building'; buildingId: string }
  | { type: 'show-debt' }
  | { type: 'show-satisfaction' };

export interface GameNotification {
  id: string;
  title: string;
  message: string;
  severity: NotificationSeverity;
  createdAt: number;
  expiresAt: number;
  actionLabel?: string;
  action?: NotificationAction;
}
