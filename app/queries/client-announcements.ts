import type { AnnouncementQueryResult } from "./announcements";

export { type AnnouncementQueryResult } from "./announcements";

export const ANNOUNCEMENTS_KEY = "announcements" as const;

export function getAnnouncementsQueryKey(
	page: number,
	limit: number,
	query?: string,
	status?: string,
) {
	return [ANNOUNCEMENTS_KEY, page, limit, query, status] as const;
}

export function getAnnouncementsQuery(searchParams: URLSearchParams) {
	const page = Number(searchParams.get("page")) || 1;
	const limit = Number(searchParams.get("limit")) || 10;
	const query = searchParams.get("query") || undefined;
	const status = searchParams.get("status") || undefined;

	return {
		queryKey: getAnnouncementsQueryKey(page, limit, query, status),
		queryFn: async (): Promise<AnnouncementQueryResult> => {
			const params = new URLSearchParams();
			params.set("page", String(page));
			params.set("limit", String(limit));
			if (query) params.set("query", query);
			if (status) params.set("status", status);

			const res = await fetch(`/api/announcement/get?${params}`, {
				headers: { Accept: "application/json" },
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.message || "Failed to fetch announcements");
			}
			const data = await res.json();
			return data.body as AnnouncementQueryResult;
		},
	};
}
