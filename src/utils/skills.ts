import { SkillAliases } from "../types/config";
import { unique } from "./text";

export function normalizeSkill(skill: string, aliases: SkillAliases): string {
  const normalized = skill.trim().toLowerCase();
  for (const [canonical, aliasList] of Object.entries(aliases)) {
    if (canonical.toLowerCase() === normalized) {
      return canonical.toLowerCase();
    }
    if (aliasList.some((alias) => alias.toLowerCase() === normalized)) {
      return canonical.toLowerCase();
    }
  }
  return normalized;
}

export function normalizeSkills(skills: string[], aliases: SkillAliases): string[] {
  return unique(skills.map((skill) => normalizeSkill(skill, aliases)));
}

export function skillMatched(candidate: string, targetSkills: Set<string>, aliases: SkillAliases): boolean {
  const normalizedCandidate = normalizeSkill(candidate, aliases);
  if (targetSkills.has(normalizedCandidate)) {
    return true;
  }
  for (const alias of Object.values(aliases)) {
    if (alias.map((value) => value.toLowerCase()).includes(normalizedCandidate)) {
      return true;
    }
  }
  return false;
}
