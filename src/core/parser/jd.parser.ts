import { ResolvedATSConfig, SkillAliases } from "../../types/config";
import {
  ParsedJobDescription,
  ParsedLanguage,
  SkillExperienceRequirement,
} from "../../types/parser";
import { parseLanguageMentions } from "../../utils/languages";
import { normalizeSkill, normalizeSkills } from "../../utils/skills";
import {
  normalizeWhitespace,
  splitLines,
  tokenize,
  unique,
  STOP_WORDS,
  ROLE_NOUNS,
} from "../../utils/text";

// Map any variant found in JD text to a canonical form that also appears in resume text.
// ponytail: German/French degree terms added inline alongside English — same flat list.
const DEGREE_VARIANTS: [RegExp, string][] = [
  [/\b(?:bachelor(?:'s)?|b\.s\.?|bs\.?|bsc\.?|licence)\b/i, "bachelor"],
  [/\b(?:master(?:'s)?|m\.s\.?|ms\.?|msc\.?|diplom)\b/i, "master"],
  [/\b(?:phd|ph\.d\.?|doctorate|doktor|doctorat)\b/i, "phd"],
  [/\bmba\b/i, "mba"],
  [/\bassociate(?:'s)?\b/i, "associate"],
];

// ponytail: line-level regex match — JDs with word-wrap corruption (trigger phrase split
// across two lines, e.g. copy-pasted from a columned layout) silently fall through to the
// unweighted body-keyword bucket instead. See README caveat; upgrade path is LLM-assisted
// section classification if this proves common in practice.
function extractRequiredSkills(lines: string[]): string[] {
  const required: string[] = [];
  for (const line of lines) {
    if (/must|require|required|need/i.test(line)) {
      required.push(...tokenize(line));
    }
  }
  return required;
}

function extractPreferredSkills(lines: string[]): string[] {
  const preferred: string[] = [];
  for (const line of lines) {
    if (/preferred|nice to have|plus/i.test(line)) {
      preferred.push(...tokenize(line));
    }
  }
  return preferred;
}

// Shared with resume.parser.ts's title detection so both sides agree on role vocabulary —
// this is the root cause fix for #1 (JD single-token roleKeywords never matching resume title phrases).
const ROLE_NOUN_RE = new RegExp(`(${ROLE_NOUNS.join("|")})`, "gi");

function extractRoleKeywords(text: string): string[] {
  // ponytail: match every occurrence (not just the first) so multi-role JDs surface all titles.
  const roleMatches = text.match(ROLE_NOUN_RE) ?? [];
  const fallback = roleMatches.length === 0 ? [text.split(/\n/)[0] ?? ""] : [];
  return unique(tokenize([...roleMatches, ...fallback].join(" ")));
}

function extractMinExperience(text: string): number | undefined {
  // ponytail: accept "yrs." and German/French year words alongside "years".
  const match = text.match(
    /(\d{1,2})\+?\s*(?:years?|yrs\.?|jahre?|ans?|années?)/i
  );
  if (!match) return undefined;
  const parsed = Number.parseInt(match[1], 10);
  // ponytail: cap at 60 — realistic max; ignore implausible matches.
  return parsed <= 60 ? parsed : undefined;
}

// Case-preserving mirror of the tech-token pattern in utils/text.ts, so suggestions can quote
// the JD's actual spelling/casing ("JavaScript") instead of the lowercased canonical form.
const SURFACE_TOKEN_RE = /[a-z0-9][a-z0-9.#+\-/]*[a-z0-9#+]/gi;

function collectKeywordSurfaceForms(
  rawText: string,
  aliases: SkillAliases
): Record<string, string> {
  const matches = rawText.match(SURFACE_TOKEN_RE) ?? [];
  const surfaceForms: Record<string, string> = {};
  for (const match of matches) {
    const canonical = normalizeSkill(match, aliases);
    if (!(canonical in surfaceForms)) {
      surfaceForms[canonical] = match;
    }
  }
  return surfaceForms;
}

const LANG_SECTION_RE = /^\s*(?:languages?|sprache|langue)s?\s*[:\-–—]?\s*/i;
const LANG_REQUIREMENT_HINT_RE =
  /\b(fluent|required|must|need|speak|proficient|native|conversational|intermediate|advanced|professional|[abc][12])\b/i;

// A language mention only counts as required if its line carries a requirement/level cue
// or sits in a "Languages:" line — otherwise plain mentions ("our Berlin office") false-positive.
function isLanguageRequired(
  lang: ParsedLanguage,
  jobDescription: string
): boolean {
  return splitLines(jobDescription).some((line) => {
    const lower = line.toLowerCase();
    if (!lower.includes(lang.name)) return false;
    return LANG_SECTION_RE.test(line) || LANG_REQUIREMENT_HINT_RE.test(line);
  });
}

// Matches "N(+)? years [of/in/with] <skill words...>" e.g. "5+ years of Figma experience".
const YEARS_BEFORE_SKILL_RE =
  /(\d{1,2})\+?\s*years?\s*(?:of|in|with)?\s*((?:[a-z0-9][a-z0-9.#+\-/]*\s*){1,4})/gi;
// Matches "<skill words...> N(+)? years" e.g. "React (3+ years)" or "Figma experience: 5 years".
const SKILL_BEFORE_YEARS_RE =
  /((?:[a-z0-9][a-z0-9.#+\-/]*[\s,]*){1,4})\(?(\d{1,2})\+?\s*years?\)?/gi;

// Parse per-skill year requirements ("5+ years of React", "GraphQL (3+ years)") out of the JD,
// gated through the same skillVocab used for required/preferred skill extraction so generic
// filler words ("must", "have", "of") never turn into bogus skill-experience entries.
function extractSkillExperienceRequirements(
  lines: string[],
  skillVocab: Set<string>,
  aliases: SkillAliases
): SkillExperienceRequirement[] {
  const requirements = new Map<string, number>();

  const record = (rawWord: string, years: number) => {
    if (!Number.isFinite(years) || years <= 0 || years > 60) return;
    const canonical = normalizeSkill(rawWord, aliases);
    if (!skillVocab.has(rawWord.toLowerCase()) && !skillVocab.has(canonical))
      return;
    const existing = requirements.get(canonical);
    if (existing === undefined || years > existing) {
      requirements.set(canonical, years);
    }
  };

  for (const line of lines) {
    for (const re of [YEARS_BEFORE_SKILL_RE, SKILL_BEFORE_YEARS_RE]) {
      re.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = re.exec(line))) {
        const years = Number.parseInt(
          re === YEARS_BEFORE_SKILL_RE ? match[1] : match[2],
          10
        );
        const candidateWords = tokenize(
          re === YEARS_BEFORE_SKILL_RE ? match[2] : match[1]
        );
        for (const word of candidateWords) record(word, years);
      }
    }
  }

  return [...requirements.entries()]
    .map(([skill, years]) => ({ skill, years }))
    .sort((a, b) => a.skill.localeCompare(b.skill));
}

// Shared with scorer.ts so resume abbreviations ("B.S.") normalize to the same
// canonical degree names as JD requirements ("bachelor") before comparison.
export function extractDegreeLevels(text: string): string[] {
  const found = new Set<string>();
  for (const [pattern, canonical] of DEGREE_VARIANTS) {
    if (pattern.test(text)) found.add(canonical);
  }
  return [...found];
}

export function parseJobDescription(
  jobDescription: string,
  config: ResolvedATSConfig
): ParsedJobDescription {
  const normalizedText = normalizeWhitespace(jobDescription);
  const lines = splitLines(jobDescription);

  // Build vocab first — used to filter both skill lines AND body tokens
  const skillVocab = new Set<string>();
  for (const [canonical, aliases] of Object.entries(config.skillAliases)) {
    skillVocab.add(canonical.toLowerCase());
    for (const alias of aliases) skillVocab.add(alias.toLowerCase());
  }
  for (const s of config.profile?.mandatorySkills ?? [])
    skillVocab.add(s.toLowerCase());
  for (const s of config.profile?.optionalSkills ?? [])
    skillVocab.add(s.toLowerCase());

  // A skill-like token must be in vocab OR match a tech-symbol pattern:
  //   . # +  → always tech (c#, c++, node.js)
  //   /      → slash-compound: at least one part is 2+ chars AND not a stopword
  //            (rest/graphql ✓, and/or ✗, m/f/d ✗, hours/week ✗)
  //   -      → only via vocab (scikit-learn ✓, berlin-based ✗, work-from-home ✗)
  const isSkillLike = (t: string): boolean => {
    if (skillVocab.has(t)) return true;
    if (/[.#+]/.test(t) && /[a-z]/.test(t)) return true;
    if (t.includes("/"))
      return t.split("/").some((p) => p.length >= 2 && !STOP_WORDS.has(p));
    return false;
  };

  const requiredSkillsRaw = extractRequiredSkills(lines).filter(isSkillLike);
  const preferredSkillsRaw = extractPreferredSkills(lines).filter(isSkillLike);

  const requiredSkills = normalizeSkills(
    requiredSkillsRaw,
    config.skillAliases
  );
  const preferredSkills = normalizeSkills(
    preferredSkillsRaw,
    config.skillAliases
  );

  // Curated keyword list: explicit skills + role keywords + skill-like JD body tokens
  const bodyTokens = tokenize(normalizedText).filter(isSkillLike);
  const roleKeywords = extractRoleKeywords(jobDescription);
  const keywords = unique([
    ...requiredSkills,
    ...preferredSkills,
    ...roleKeywords,
    ...bodyTokens,
  ]);
  const skillExperienceRequirements = extractSkillExperienceRequirements(
    lines,
    skillVocab,
    config.skillAliases
  );

  return {
    raw: jobDescription,
    normalizedText,
    requiredSkills,
    preferredSkills,
    roleKeywords,
    keywords,
    minExperienceYears: extractMinExperience(jobDescription),
    skillExperienceRequirements,
    educationRequirements: extractDegreeLevels(jobDescription),
    keywordSurfaceForms: collectKeywordSurfaceForms(
      jobDescription,
      config.skillAliases
    ),
    // A language only counts as required if its mention carries a requirement/level cue
    // or sits in a "Languages:" line — plain references ("our Berlin office") don't count.
    requiredLanguages: parseLanguageMentions(jobDescription).filter((lang) =>
      isLanguageRequired(lang, jobDescription)
    ),
  };
}
