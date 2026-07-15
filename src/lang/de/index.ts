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
  { canonical: "typescript", aliases: [], category: "technical" },
  {
    canonical: "machine learning",
    aliases: ["maschinelles lernen"],
    category: "technical",
  },
  {
    canonical: "deep learning",
    aliases: ["tiefes lernen"],
    category: "technical",
  },
  {
    canonical: "natural language processing",
    aliases: ["computerlinguistik", "sprachverarbeitung"],
    category: "technical",
  },
  {
    canonical: "computer vision",
    aliases: ["bildverarbeitung", "maschinelles sehen"],
    category: "technical",
  },
  {
    canonical: "web development",
    aliases: ["webentwicklung"],
    category: "technical",
  },
  {
    canonical: "full stack development",
    aliases: ["full-stack-entwicklung"],
    category: "technical",
  },
  {
    canonical: "data engineering",
    aliases: ["datenengineering", "dateningenieurwesen"],
    category: "technical",
  },
  {
    canonical: "embedded systems",
    aliases: ["eingebettete systeme"],
    category: "technical",
  },
  { canonical: "linux", aliases: [], category: "technical" },
  {
    canonical: "bash scripting",
    aliases: ["shell-skripting"],
    category: "technical",
  },
  // tools
  { canonical: "excel", aliases: ["microsoft excel"], category: "tool" },
  { canonical: "git", aliases: [], category: "tool" },
  { canonical: "postgresql", aliases: [], category: "tool" },
  { canonical: "mysql", aliases: [], category: "tool" },
  { canonical: "docker", aliases: ["container"], category: "tool" },
  { canonical: "kubernetes", aliases: [], category: "tool" },
  { canonical: "aws", aliases: ["amazon web services"], category: "tool" },
  { canonical: "azure", aliases: ["microsoft azure"], category: "tool" },
  {
    canonical: "google cloud platform",
    aliases: ["google cloud"],
    category: "tool",
  },
  { canonical: "jira", aliases: [], category: "tool" },
  { canonical: "confluence", aliases: [], category: "tool" },
  { canonical: "tableau", aliases: [], category: "tool" },
  { canonical: "power bi", aliases: [], category: "tool" },
  { canonical: "salesforce", aliases: [], category: "tool" },
  { canonical: "sap", aliases: [], category: "tool" },
  { canonical: "google analytics", aliases: [], category: "tool" },
  // engineering concepts
  {
    canonical: "frontend",
    aliases: ["frontend-entwicklung"],
    category: "concept",
  },
  {
    canonical: "backend",
    aliases: ["backend-entwicklung"],
    category: "concept",
  },
  { canonical: "testing", aliases: ["softwaretests"], category: "concept" },
  {
    canonical: "unit testing",
    aliases: ["unittests", "modultests"],
    category: "concept",
  },
  { canonical: "security", aliases: ["sicherheit"], category: "concept" },
  {
    canonical: "application security",
    aliases: ["anwendungssicherheit"],
    category: "concept",
  },
  { canonical: "agile", aliases: ["agile methoden"], category: "concept" },
  { canonical: "scrum", aliases: [], category: "concept" },
  { canonical: "kanban", aliases: [], category: "concept" },
  { canonical: "devops", aliases: [], category: "concept" },
  {
    canonical: "ci/cd",
    aliases: ["kontinuierliche integration", "kontinuierliche bereitstellung"],
    category: "concept",
  },
  {
    canonical: "cloud computing",
    aliases: ["cloud-computing"],
    category: "concept",
  },
  {
    canonical: "system design",
    aliases: ["systemdesign"],
    category: "concept",
  },
  {
    canonical: "code review",
    aliases: ["codeüberprüfung", "codeueberpruefung"],
    category: "concept",
  },
  { canonical: "ux design", aliases: ["nutzererfahrung"], category: "concept" },
  {
    canonical: "ui design",
    aliases: ["benutzeroberflächendesign", "benutzeroberflaechendesign"],
    category: "concept",
  },
  {
    canonical: "project management",
    aliases: ["projektmanagement"],
    category: "concept",
  },
  {
    canonical: "program management",
    aliases: ["programmmanagement"],
    category: "concept",
  },
  {
    canonical: "change management",
    aliases: ["veränderungsmanagement", "veraenderungsmanagement"],
    category: "concept",
  },
  {
    canonical: "risk management",
    aliases: ["risikomanagement"],
    category: "concept",
  },
  {
    canonical: "quality assurance",
    aliases: ["qualitätssicherung", "qualitaetssicherung"],
    category: "concept",
  },
  {
    canonical: "documentation",
    aliases: ["dokumentation"],
    category: "concept",
  },
  {
    canonical: "requirements gathering",
    aliases: ["anforderungsanalyse"],
    category: "concept",
  },
  // domain — product / data
  { canonical: "analytics", aliases: ["datenanalyse"], category: "domain" },
  { canonical: "roadmap", aliases: ["fahrplan"], category: "domain" },
  {
    canonical: "product management",
    aliases: ["produktmanagement"],
    category: "domain",
  },
  {
    canonical: "product strategy",
    aliases: ["produktstrategie"],
    category: "domain",
  },
  {
    canonical: "stakeholder management",
    aliases: ["stakeholder-management"],
    category: "domain",
  },
  // domain — finance / accounting
  {
    canonical: "financial analysis",
    aliases: ["finanzanalyse"],
    category: "domain",
  },
  {
    canonical: "financial modeling",
    aliases: ["finanzmodellierung"],
    category: "domain",
  },
  { canonical: "budgeting", aliases: ["budgetierung"], category: "domain" },
  { canonical: "forecasting", aliases: ["prognose"], category: "domain" },
  {
    canonical: "payroll",
    aliases: ["gehaltsabrechnung", "lohnbuchhaltung"],
    category: "domain",
  },
  {
    canonical: "auditing",
    aliases: ["wirtschaftsprüfung", "wirtschaftspruefung"],
    category: "domain",
  },
  { canonical: "general ledger", aliases: ["hauptbuch"], category: "domain" },
  {
    canonical: "mergers and acquisitions",
    aliases: ["fusionen und übernahmen", "fusionen und uebernahmen"],
    category: "domain",
  },
  { canonical: "fintech", aliases: ["finanztechnologie"], category: "domain" },
  // domain — sales
  {
    canonical: "account management",
    aliases: ["kundenbetreuung"],
    category: "domain",
  },
  {
    canonical: "crm",
    aliases: ["kundenbeziehungsmanagement"],
    category: "domain",
  },
  {
    canonical: "customer retention",
    aliases: ["kundenbindung"],
    category: "domain",
  },
  {
    canonical: "business development",
    aliases: ["geschäftsentwicklung", "geschaeftsentwicklung"],
    category: "domain",
  },
  {
    canonical: "lead generation",
    aliases: ["leadgenerierung"],
    category: "domain",
  },
  {
    canonical: "saas",
    aliases: ["software als dienstleistung"],
    category: "domain",
  },
  {
    canonical: "e-commerce",
    aliases: ["elektronischer handel"],
    category: "domain",
  },
  // domain — human resources
  {
    canonical: "recruiting",
    aliases: ["personalbeschaffung", "rekrutierung"],
    category: "domain",
  },
  { canonical: "onboarding", aliases: ["einarbeitung"], category: "domain" },
  {
    canonical: "employee relations",
    aliases: ["mitarbeiterbeziehungen"],
    category: "domain",
  },
  {
    canonical: "performance management",
    aliases: ["leistungsmanagement"],
    category: "domain",
  },
  {
    canonical: "diversity and inclusion",
    aliases: ["vielfalt und inklusion"],
    category: "domain",
  },
  {
    canonical: "employee engagement",
    aliases: ["mitarbeiterengagement"],
    category: "domain",
  },
  // domain — healthcare
  {
    canonical: "patient care",
    aliases: ["patientenversorgung"],
    category: "domain",
  },
  {
    canonical: "clinical documentation",
    aliases: ["klinische dokumentation"],
    category: "domain",
  },
  {
    canonical: "clinical trials",
    aliases: ["klinische studien"],
    category: "domain",
  },
  // domain — legal
  {
    canonical: "contract review",
    aliases: ["vertragsprüfung", "vertragspruefung"],
    category: "domain",
  },
  {
    canonical: "regulatory compliance",
    aliases: ["compliance", "regulatorische konformität"],
    category: "domain",
  },
  {
    canonical: "due diligence",
    aliases: ["sorgfaltspflicht"],
    category: "domain",
  },
  { canonical: "gdpr", aliases: ["dsgvo"], category: "domain" },
  {
    canonical: "intellectual property",
    aliases: ["geistiges eigentum"],
    category: "domain",
  },
  // domain — education
  {
    canonical: "curriculum development",
    aliases: ["lehrplanentwicklung"],
    category: "domain",
  },
  {
    canonical: "lesson planning",
    aliases: ["unterrichtsplanung"],
    category: "domain",
  },
  // domain — operations / logistics
  {
    canonical: "supply chain management",
    aliases: ["lieferkettenmanagement"],
    category: "domain",
  },
  {
    canonical: "inventory management",
    aliases: ["bestandsverwaltung"],
    category: "domain",
  },
  { canonical: "procurement", aliases: ["beschaffung"], category: "domain" },
  { canonical: "logistics", aliases: ["logistik"], category: "domain" },
  { canonical: "manufacturing", aliases: ["fertigung"], category: "domain" },
  {
    canonical: "quality control",
    aliases: ["qualitätskontrolle", "qualitaetskontrolle"],
    category: "domain",
  },
  // domain — customer service
  {
    canonical: "customer support",
    aliases: ["kundensupport", "kundendienst"],
    category: "domain",
  },
  {
    canonical: "customer success",
    aliases: ["kundenerfolg"],
    category: "domain",
  },
  // soft skills
  { canonical: "communication", aliases: ["kommunikation"], category: "soft" },
  {
    canonical: "leadership",
    aliases: ["führung", "fuehrung"],
    category: "soft",
  },
  { canonical: "teamwork", aliases: ["teamarbeit"], category: "soft" },
  {
    canonical: "problem solving",
    aliases: ["problemlösung", "problemloesung"],
    category: "soft",
  },
  {
    canonical: "time management",
    aliases: ["zeitmanagement"],
    category: "soft",
  },
  {
    canonical: "critical thinking",
    aliases: ["kritisches denken"],
    category: "soft",
  },
  {
    canonical: "adaptability",
    aliases: ["anpassungsfähigkeit", "anpassungsfaehigkeit"],
    category: "soft",
  },
  {
    canonical: "negotiation",
    aliases: ["verhandlungsgeschick"],
    category: "soft",
  },
  {
    canonical: "attention to detail",
    aliases: ["detailgenauigkeit"],
    category: "soft",
  },
  { canonical: "mentoring", aliases: ["coaching"], category: "soft" },
  {
    canonical: "organization",
    aliases: ["organisationsfähigkeit", "organisationsfaehigkeit"],
    category: "soft",
  },
  {
    canonical: "public speaking",
    aliases: ["öffentliches sprechen", "oeffentliches sprechen"],
    category: "soft",
  },
  {
    canonical: "strategic thinking",
    aliases: ["strategisches denken"],
    category: "soft",
  },
  { canonical: "empathy", aliases: ["empathie"], category: "soft" },
  // marketing
  {
    canonical: "seo",
    aliases: ["suchmaschinenoptimierung"],
    category: "marketing",
  },
  { canonical: "branding", aliases: ["markenbildung"], category: "marketing" },
  {
    canonical: "campaign management",
    aliases: ["kampagnenmanagement"],
    category: "marketing",
  },
  {
    canonical: "digital marketing",
    aliases: ["digitales marketing"],
    category: "marketing",
  },
  {
    canonical: "content marketing",
    aliases: ["content-marketing"],
    category: "marketing",
  },
  {
    canonical: "social media marketing",
    aliases: ["social-media-marketing"],
    category: "marketing",
  },
  {
    canonical: "email marketing",
    aliases: ["e-mail-marketing"],
    category: "marketing",
  },
  {
    canonical: "market research",
    aliases: ["marktforschung"],
    category: "marketing",
  },
  {
    canonical: "marketing automation",
    aliases: ["marketing-automatisierung"],
    category: "marketing",
  },
  {
    canonical: "brand awareness",
    aliases: ["markenbekanntheit"],
    category: "marketing",
  },
];

export default de;
export { de as keywordRegistry };
