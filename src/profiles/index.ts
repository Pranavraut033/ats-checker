import { ATSProfile, SkillAliases } from "../types/config";

export const defaultSkillAliases: SkillAliases = {
  // ponytail: "node" split from javascript — Node.js runtime !== JS language
  javascript: ["js"],
  node: ["node.js", "nodejs"],
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
  // ML / data science
  pytorch: ["torch"],
  tensorflow: ["tf"],
  "scikit-learn": ["sklearn"],
  pandas: [],
  numpy: [],
  fastapi: [],
  flask: [],
  django: [],
  // data / infra
  kafka: [],
  redis: [],
  elasticsearch: ["elastic"],
  spark: ["apache spark"],
  // common pure-letter tech skills (no symbol chars)
  accessibility: ["a11y"],
  frontend: ["front-end"],
  backend: ["back-end"],
  security: ["cybersecurity"],
  testing: ["unittest", "pytest"],
  microservices: [],
  agile: ["scrum"],
  blockchain: [],
  devops: [],
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
