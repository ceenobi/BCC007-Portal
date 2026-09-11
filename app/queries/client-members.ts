import type { MembersQueryResult } from "./members";

export { type MembersQueryResult } from "./members";

export const MEMBERS_KEY = "members" as const;

export function getMembersQueryKey(
	page: number,
	limit: number,
	query?: string,
) {
	return [MEMBERS_KEY, page, limit, query] as const;
}

export function getMembersQuery(searchParams: URLSearchParams) {
	const page = Number(searchParams.get("page")) || 1;
	const limit = Number(searchParams.get("limit")) || 10;
	const query = searchParams.get("query") || undefined;

	return {
		queryKey: getMembersQueryKey(page, limit, query),
		queryFn: async (): Promise<MembersQueryResult> => {
			const params = new URLSearchParams();
			params.set("page", String(page));
			params.set("limit", String(limit));
			if (query) params.set("query", query);

			const res = await fetch(`/api/member/get?${params}`, {
				headers: { Accept: "application/json" },
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.message || "Failed to fetch members");
			}
			const data = await res.json();
			return data.body as MembersQueryResult;
		},
	};
}
