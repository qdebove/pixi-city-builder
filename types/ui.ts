import { Visitor, Worker } from './data-contract';
import { PersonRole } from './types';

export interface SelectedPersonSnapshot {
  id: string;
  role: PersonRole;
  profile: Visitor | Worker;
}
