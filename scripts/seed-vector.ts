#!/usr/bin/env node
// Seed Upstash Vector with helpdeskKnowledgeBase
// Usage: yarn seed:vector [--dry-run]  (requires UPSTASH_VECTOR_REST_URL/TOKEN + existing index e.g. bcc007-guide)
import { seedGuideIndex } from "../app/.server/ai/vector";

const dryRun = process.argv.includes("--dry-run");
console.log(`[seed-vector] dryRun=${dryRun}`);

try {
	const res = await seedGuideIndex({ dryRun });
	console.log(`[seed-vector] ${dryRun ? "dry-run " : ""}upserted=${res.upserted} alreadySeeded=${res.alreadySeeded}`);
	if (!dryRun) console.log("[seed-vector] Done. Create Vector index as dense + managed embedding (bge-m3 or bge-large-en) before running.");
} catch (err) {
	console.error("[seed-vector] Failed:", err);
	console.error("Ensure UPSTASH_VECTOR_REST_URL/TOKEN are set and index exists (e.g. bcc007-guide, 1024 dims, cosine, with embedding model).");
	process.exit(1);
}
