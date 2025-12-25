import { ATSProfile, SkillAliases } from "../types/config";

export const defaultSkillAliases: SkillAliases = {
  javascript: ["js", "node", "node.js", "nodejs"],
  typescript: ["ts"],
  react: ["reactjs", "react.js"],
  "c++": ["cpp"],
  "c#": ["csharp"],
  python: ["py"],
  sql: ["postgres", "mysql", "sqlite"],
  graphql: ["gql"],
  aws: ["amazon web services"],
  azure: ["microsoft azure"],
  gcp: ["google cloud", "google cloud platform"],
  docker: ["containers"],
  kubernetes: ["k8s"],
  html: ["html5"],
  css: ["css3"],
};

export const softwareEngineerProfile: ATSProfile = {
  name: "software-engineer",
  mandatorySkills: ["javascript", "typescript", "react", "node"],
  optionalSkills: ["graphql", "sql", "docker"],
  minExperience: 3,
};

export const dataScientistProfile: ATSProfile = {
  name: "data-scientist",
  mandatorySkills: ["python", "sql", "statistics"],
  optionalSkills: ["pandas", "numpy", "pytorch", "tensorflow"],
  minExperience: 2,
};

export const productManagerProfile: ATSProfile = {
  name: "product-manager",
  mandatorySkills: ["roadmap", "stakeholder management", "prioritization"],
  optionalSkills: ["a/b testing", "analytics", "sql"],
  minExperience: 3,
};

export const defaultProfiles: ATSProfile[] = [
  softwareEngineerProfile,
  dataScientistProfile,
  productManagerProfile,
];
