import { Index } from "@upstash/vector";
import { env } from "../config/keys";
import { helpdeskKnowledgeBase } from "~/lib/guide";
import type { GuideHit } from "./guide-retrieval";

// Single index holds all guide articles; data + metadata enable filtering.
export const VECTOR_INDEX_NAME = "bcc007-guide";

// Lazy singleton — avoids throwing during build when env missing.
let _index: Index | null = null;
let _enabled: boolean | null = null;

export function isVectorEnabled(): boolean {
	if (_enabled !== null) return _enabled;
	_enabled = Boolean(
		env.upstashVector.restUrl && env.upstashVector.restToken,
	);
	return _enabled;
}

export function getVectorIndex(): Index | null {
	if (!isVectorEnabled()) return null;
	if (_index) return _index;
	_index = new Index({
		url: env.upstashVector.restUrl,
		token: env.upstashVector.restToken,
	});
	return _index;
}

// For tests — reset singleton
export function __resetVectorForTest() {
	_index = null;
	_enabled = null;
}

export type SeedResult = { upserted: number; alreadySeeded: boolean };

/**
 * Upserts helpdeskKnowledgeBase into Vector.
 * Uses `data` field so Vector's managed embedding (bge-m3 etc.) embeds raw text.
 * Idempotent — re-upserting same ids overwrites.
 */
export async function seedGuideIndex(opts?: {
	dryRun?: boolean;
}): Promise<SeedResult> {
	const index = getVectorIndex();
	if (!index) throw new Error("Vector not configured — missing UPSTASH_VECTOR_REST_URL/TOKEN");

	const info = await (index as unknown as { info: () => Promise<{ vectorCount?: number }> }).info?.();
	const alreadySeeded = Boolean(info && (info.vectorCount ?? 0) >= helpdeskKnowledgeBase.length);

	if (opts?.dryRun) return { upserted: 0, alreadySeeded };

	const vectors = helpdeskKnowledgeBase.map((a) => ({
		id: a.id,
		data: `${a.title}\n\nCategory: ${a.category}\nKeywords: ${a.keywords.join(", ")}\n\n${a.content}`,
		metadata: {
			title: a.title,
			category: a.category,
			keywords: a.keywords.join(","),
		},
	}));

	// Batch upsert in chunks of 100 (Vector limit)
	try {
		for (let i = 0; i < vectors.length; i += 100) {
			const chunk = vectors.slice(i, i + 100);
			await index.upsert(chunk as never);
		}
	} catch (e: unknown) {
		const msg = e instanceof Error ? e.message : String(e);
		if (msg.includes("Embedding data") || msg.includes("embedding model")) {
			throw new Error(
				`Vector index "${VECTOR_INDEX_NAME}" has no managed embedding model. Recreate it in Upstash Console as Dense + Model "BAAI/bge-m3" (1024 dims, cosine) or "BAAI/bge-large-en-v1.5", then rerun. Original: ${msg}`,
			);
		}
		throw e;
	}
	return { upserted: vectors.length, alreadySeeded };
}

export async function queryGuideVector(
	query: string,
	limit = 3,
): Promise<GuideHit[] | null> {
	const index = getVectorIndex();
	if (!index) return null;
	try {
		const res = await index.query({
			data: query,
			topK: limit,
			includeMetadata: true,
			includeData: true,
		} as never);
		if (!res || res.length === 0) return [];
		return res.map((r: unknown) => {
			const item = r as {
				id?: string | number;
				score?: number;
				metadata?: Record<string, unknown>;
				data?: string;
			};
			const meta = (item.metadata ?? {}) as Record<string, string>;
			return {
				id: String(item.id ?? meta.id ?? ""),
				title: meta.title ?? String(item.id ?? ""),
				category: meta.category ?? "",
				content: (item.data as string) ?? "",
				score: typeof item.score === "number" ? item.score : 0,
			} satisfies GuideHit;
		});
	} catch (err) {
		console.warn("[vector] query failed, falling back to keyword search", err);
		return null;
	}
}
