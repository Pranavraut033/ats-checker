/**
 * German keyword registry — canonical terms stay in English (so scoring/profiles
 * keep working unchanged); German aliases let resumes/job descriptions written in
 * German match the same canonical skills.
 *
 *   import de from "@pranavraut033/ats-checker/de";
 *   analyzeResume({ ..., config: { keywordRegistry: de } });
 *
 * ponytail: de pack ships a seed set, not exhaustive — grow on demand.
 */
import type { KeywordRegistry } from "../../types/config";

const de: KeywordRegistry = [
  // technical
  { canonical: "javascript", aliases: ["js"], category: "technical" },
  { canonical: "python", aliases: [], category: "technical" },
  { canonical: "java", aliases: [], category: "technical" },
  { canonical: "machine learning", aliases: ["maschinelles lernen"], category: "technical" },
  // tools
  { canonical: "excel", aliases: ["microsoft excel"], category: "tool" },
  { canonical: "git", aliases: [], category: "tool" },
  // engineering concepts
  { canonical: "frontend", aliases: ["frontend-entwicklung"], category: "concept" },
  { canonical: "backend", aliases: ["backend-entwicklung"], category: "concept" },
  { canonical: "testing", aliases: ["softwaretests"], category: "concept" },
  { canonical: "security", aliases: ["sicherheit"], category: "concept" },
  { canonical: "agile", aliases: ["agile methoden"], category: "concept" },
  { canonical: "project management", aliases: ["projektmanagement"], category: "concept" },
  { canonical: "quality assurance", aliases: ["qualitätssicherung", "qualitaetssicherung"], category: "concept" },
  // domain — product / data
  { canonical: "analytics", aliases: ["datenanalyse"], category: "domain" },
  { canonical: "roadmap", aliases: ["fahrplan"], category: "domain" },
  // domain — finance / accounting
  { canonical: "financial analysis", aliases: ["finanzanalyse"], category: "domain" },
  { canonical: "budgeting", aliases: ["budgetierung"], category: "domain" },
  { canonical: "payroll", aliases: ["gehaltsabrechnung", "lohnbuchhaltung"], category: "domain" },
  { canonical: "auditin g", aliases: ["wirtschaftsprüfung", "wirtschaftspruefung"], category: "domain" },
  // domain — sales
  { canonical: "account management", aliases: ["kundenbetreuung"], category: "domain" },
  { canonical: "crm", aliases: ["kundenbeziehungsmanagement"], category: "domain" },
  { canonical: "customer retention", aliases: ["kundenbindung"], category: "domain" },
  // domain — human resources
  { canonical: "recruiting", aliases: ["personalbeschaffung", "rekrutierung"], category: "domain" },
  { canonical: "onboarding", aliases: ["einarbeitung"], category: "domain" },
  { canonical: "employee relations", aliases: ["mitarbeiterbeziehungen"], category: "domain" },
  // domain — healthcare
  { canonical: "patient care", aliases: ["patientenversorgung"], category: "domain" },
  // domain — legal
  { canonical: "contract review", aliases: ["vertragsprüfung", "vertragspruefung"], category: "domain" },
  { canonical: "regulatory compliance", aliases: ["compliance", "regulatorische konformität"], category: "domain" },
  // domain — operations / logistics
  { canonical: "supply chain management", aliases: ["lieferkettenmanagement"], category: "domain" },
  { canonical: "inventory management", aliases: ["bestandsverwaltung"], category: "domain" },
  // domain — customer service
  { canonical: "customer support", aliases: ["kundensupport", "kundendienst"], category: "domain" },
  // soft skills
  { canonical: "communication", aliases: ["kommunikation"], category: "soft" },
  { canonical: "leadership", aliases: ["führung", "fuehrung"], category: "soft" },
  { canonical: "teamwork", aliases: ["teamarbeit"], category: "soft" },
  { canonical: "problem solving", aliases: ["problemlösung", "problemloesung"], category: "soft" },
  { canonical: "time management", aliases: ["zeitmanagement"], category: "soft" },
  { canonical: "critical thinking", aliases: ["kritisches denken"], category: "soft" },
  { canonical: "adaptability", aliases: ["anpassungsfähigkeit", "anpassungsfaehigkeit"], category: "soft" },
  { canonical: "negotiation", aliases: ["verhandlungsgeschick"], category: "soft" },
  { canonical: "attention to detail", aliases: ["detailgenauigkeit"], category: "soft" },
  // marketing
  { canonical: "branding", aliases: ["markenbildung"], category: "marketing" },
  { canonical: "digital marketing", aliases: ["digitales marketing"], category: "marketing" },
  { canonical: "content marketing", aliases: ["content-marketing"], category: "marketing" },
  { canonical: "market research", aliases: ["marktforschung"], category: "marketing" },
];

export default de;
export { de as keywordRegistry };
