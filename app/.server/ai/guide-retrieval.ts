import { helpdeskKnowledgeBase } from "~/lib/guide";

export interface GuideHit {
  id: string;
  title: string;
  category: string;
  content: string;
  score: number;
}

const TITLE_WEIGHT = 6;
const KEYWORD_WEIGHT = 5;
const CATEGORY_WEIGHT = 3;
const CONTENT_WEIGHT = 1;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean);
}

function hasTerm(haystackTokens: string[], term: string): boolean {
  return haystackTokens.some(
    (token) => token === term || token.includes(term) || term.includes(token),
  );
}

/**
 * Keyword fallback — used when Vector is disabled or query fails.
 * Scores every article in the support guide against the query and returns the
 * best matches. Token overlap is weighted toward titles, keywords and
 * categories so a short query like "forgot password" lands on the right
 * article before generic terms ("how to", "step") can.
 */
export function searchGuideKeyword(query: string, limit = 3): GuideHit[] {
  const terms = tokenize(query);
  if (terms.length === 0) return [];

  const results: GuideHit[] = [];

  for (const article of helpdeskKnowledgeBase) {
    const titleTokens = tokenize(article.title);
    const keywordTokens = article.keywords.flatMap(tokenize);
    const categoryTokens = tokenize(article.category);
    const contentTokens = tokenize(article.content);

    let score = 0;
    for (const term of terms) {
      if (hasTerm(titleTokens, term)) score += TITLE_WEIGHT;
      if (hasTerm(keywordTokens, term)) score += KEYWORD_WEIGHT;
      if (hasTerm(categoryTokens, term)) score += CATEGORY_WEIGHT;
      if (hasTerm(contentTokens, term)) score += CONTENT_WEIGHT;
    }

    if (score > 0) {
      results.push({
        id: article.id,
        title: article.title,
        category: article.category,
        content: article.content.trim(),
        score,
      });
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

// Backward compat — sync keyword search
export const searchGuide = searchGuideKeyword;

/**
 * Async Vector-first search: tries Upstash Vector (semantic `data` query),
 * falls back to keyword on miss/error or when unconfigured.
 * Use this in `tools.ts` / agent for RAG.
 */
export async function searchGuideVector(query: string, limit = 3): Promise<GuideHit[]> {
  if (!query?.trim()) return [];
  try {
    const { queryGuideVector: vectorQuery, isVectorEnabled } = await import("./vector");
    if (isVectorEnabled()) {
      const hits = await vectorQuery(query, limit);
      if (hits && hits.length > 0) return hits;
      // Empty vector result → fall through to keyword to avoid dead end
      if (hits !== null) return searchGuideKeyword(query, limit);
    }
  } catch {
    // import or Vector error → fallback
  }
  return searchGuideKeyword(query, limit);
}

/**
 * Renders the top guide hits into a compact prompt-friendly block that the
 * agent can cite verbatim. Keeps the guide the single source of truth.
 */
export function formatGuideHits(hits: GuideHit[]): string {
  if (hits.length === 0) {
    return "No matching guide articles were found for the user's question.";
  }
  return hits
    .map(
      (hit, index) =>
        `[${index + 1}] ${hit.title} (${hit.category})\n${hit.content}`,
    )
    .join("\n\n---\n\n");
}
