import { ResolvedATSConfig, RuleContext } from "../../types/config";
import { ParsedJobDescription, ParsedResume, ResumeSection } from "../../types/parser";
import { containsTableLikeStructure } from "../../utils/text";

interface RuleEvaluationInput {
  resume: ParsedResume;
  job: ParsedJobDescription;
  breakdown?: RuleContext["breakdown"];
  matchedKeywords?: string[];
  overusedKeywords?: string[];
}

export interface RuleEvaluationResult {
  totalPenalty: number;
  warnings: string[];
}

export class RuleEngine {
  constructor(private readonly config: ResolvedATSConfig) {}

  private applySectionPenalties(resume: ParsedResume): RuleEvaluationResult {
    const requiredSections: ResumeSection[] = ["summary", "experience", "skills", "education"];
    let totalPenalty = 0;
    const warnings: string[] = [];

    const penaltyBySection: Record<ResumeSection, number> = {
      summary: this.config.sectionPenalties.missingSummary,
      experience: this.config.sectionPenalties.missingExperience,
      skills: this.config.sectionPenalties.missingSkills,
      education: this.config.sectionPenalties.missingEducation,
      projects: 0,
      certifications: 0,
    };

    for (const section of requiredSections) {
      if (!resume.detectedSections.includes(section)) {
        const penalty = penaltyBySection[section] ?? 0;
        totalPenalty += penalty;
        warnings.push(`${section} section missing (penalty ${penalty})`);
      }
    }
    return { totalPenalty, warnings };
  }

  private applyDefaultRules(input: RuleEvaluationInput): RuleEvaluationResult {
    let totalPenalty = 0;
    const warnings: string[] = [];

    const sectionResult = this.applySectionPenalties(input.resume);
    totalPenalty += sectionResult.totalPenalty;
    warnings.push(...sectionResult.warnings);

    if (containsTableLikeStructure(input.resume.raw)) {
      totalPenalty += 8;
      warnings.push("Detected table-like or columnar formatting (penalty 8)");
    }

    if (input.overusedKeywords && input.overusedKeywords.length > 0) {
      const penalty = input.overusedKeywords.length * this.config.keywordDensity.overusePenalty;
      totalPenalty += penalty;
      warnings.push(`Keyword stuffing detected for: ${input.overusedKeywords.join(", ")} (penalty ${penalty})`);
    }

    if (input.resume.detectedSections.length < 3) {
      totalPenalty += 5;
      warnings.push("Few recognizable sections found (penalty 5)");
    }

    return { totalPenalty, warnings };
  }

  evaluate(input: RuleEvaluationInput): RuleEvaluationResult {
    const defaultResult = this.applyDefaultRules(input);
    let totalPenalty = defaultResult.totalPenalty;
    const warnings = [...defaultResult.warnings];

    for (const rule of this.config.rules) {
      const context: RuleContext = {
        resume: input.resume,
        job: input.job,
        weights: this.config.weights,
        keywordDensity: this.config.keywordDensity,
        breakdown: input.breakdown,
        matchedKeywords: input.matchedKeywords,
        overusedKeywords: input.overusedKeywords,
      };
      if (rule.condition(context)) {
        totalPenalty += rule.penalty;
        if (rule.warning) {
          warnings.push(rule.warning);
        }
      }
    }

    return { totalPenalty, warnings };
  }
}
