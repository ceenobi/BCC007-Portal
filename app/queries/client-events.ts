import type { EventQueryResult } from "./events";

export { type EventQueryResult } from "./events";

export type MemberForSelect = {
	_id: string;
	name: string;
	email: string;
	image?: string;
};

export const EVENTS_KEY = "events" as const;

export function getEventsQueryKey(
	page: number,
	limit: number,
	query?: string,
	status?: string,
	eventType?: string,
	startDate?: string,
	endDate?: string,
) {
	return [EVENTS_KEY, page, limit, query, status, eventType, startDate, endDate] as const;
}

export function getEventsQuery(searchParams: URLSearchParams) {
	const page = Number(searchParams.get("page")) || 1;
	const limit = Number(searchParams.get("limit")) || 10;
	const query = searchParams.get("query") || undefined;
	const status = searchParams.get("status") || undefined;
	const eventType = searchParams.get("eventType") || undefined;
	const startDate = searchParams.get("startDate") || undefined;
	const endDate = searchParams.get("endDate") || undefined;

	return {
		queryKey: getEventsQueryKey(page, limit, query, status, eventType, startDate, endDate),
		queryFn: async (): Promise<EventQueryResult> => {
			const params = new URLSearchParams();
			params.set("page", String(page));
			params.set("limit", String(limit));
			if (query) params.set("query", query);
			if (status) params.set("status", status);
			if (eventType) params.set("eventType", eventType);
			if (startDate) params.set("startDate", startDate);
			if (endDate) params.set("endDate", endDate);

			const res = await fetch(`/api/event/get?${params}`, {
				headers: { Accept: "application/json" },
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.message || "Failed to fetch events");
			}
			const data = await res.json();
			return data.body as EventQueryResult;
		},
	};
}

export const MEMBERS_SELECT_KEY = "members_select" as const;

export function getMembersSelectQueryKey() {
	return [MEMBERS_SELECT_KEY] as const;
}

export function getMembersSelectQuery() {
	return {
		queryKey: getMembersSelectQueryKey(),
		queryFn: async (): Promise<MemberForSelect[]> => {
			const res = await fetch("/api/member/select", {
				headers: { Accept: "application/json" },
			});
			const data = await res.json().catch(() => ({}));
			if (!data.success) return [];
			const raw = data.body as MemberForSelect[];
			return raw.map((m) => ({ ...m, image: m.image ?? undefined }));
		},
	};
}
