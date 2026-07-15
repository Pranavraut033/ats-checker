/**
 * English keyword registry (the library's default). Re-exported as its own
 * subpath so language packs are imported uniformly:
 *
 *   import en from "@pranavraut033/ats-checker/en";
 *   analyzeResume({ ..., config: { keywordRegistry: en } });
 */
import { defaultKeywordRegistry } from "../../profiles";

import type { KeywordRegistry } from "../../types/config";

const en: KeywordRegistry = defaultKeywordRegistry;

export default en;
export { en as keywordRegistry };
