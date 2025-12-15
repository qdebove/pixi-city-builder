import { SkillProc } from '@/types/data-contract';
import rawSkillProcs from './skill-procs.json';

const parsedSkillProcs = (rawSkillProcs as unknown as SkillProc[]).map((proc) => ({
  ...proc,
  spec: proc.spec ?? {},
}));

export const SKILL_PROC_DEFINITIONS: Record<string, SkillProc> = parsedSkillProcs.reduce(
  (acc, proc) => {
    acc[proc.id] = proc;
    return acc;
  },
  {} as Record<string, SkillProc>
);

export const getSkillProc = (id: string): SkillProc | undefined =>
  SKILL_PROC_DEFINITIONS[id];
