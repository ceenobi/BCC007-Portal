import type { PaymentQueryResult } from "./payments";

export { type PaymentQueryResult } from "./payments";

import type { EventData } from "~/types";

export const PAYMENTS_USER_KEY = "payments_user" as const;
export const EVENTS_UPCOMING_KEY = "events_upcoming" as const;

export function getPaymentsQueryKey(
	page: number,
	limit: number,
	query?: string,
	paymentStatus?: string,
	paymentType?: string,
	startDate?: string,
	endDate?: string,
) {
	return [PAYMENTS_USER_KEY, page, limit, query, paymentStatus, paymentType, startDate, endDate] as const;
}

export function getPaymentsQuery(searchParams: URLSearchParams) {
	const page = Number(searchParams.get("page")) || 1;
	const limit = Number(searchParams.get("limit")) || 10;
	const query = searchParams.get("query") || undefined;
	const paymentStatus = searchParams.get("paymentStatus") || undefined;
	const paymentType = searchParams.get("paymentType") || undefined;
	const startDate = searchParams.get("startDate") || undefined;
	const endDate = searchParams.get("endDate") || undefined;

	return {
		queryKey: getPaymentsQueryKey(page, limit, query, paymentStatus, paymentType, startDate, endDate),
		queryFn: async (): Promise<PaymentQueryResult> => {
			const params = new URLSearchParams();
			params.set("page", String(page));
			params.set("limit", String(limit));
			if (query) params.set("query", query);
			if (paymentStatus) params.set("paymentStatus", paymentStatus);
			if (paymentType) params.set("paymentType", paymentType);
			if (startDate) params.set("startDate", startDate);
			if (endDate) params.set("endDate", endDate);

			const res = await fetch(`/api/payment/user/get?${params}`, {
				headers: { Accept: "application/json" },
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.message || "Failed to fetch payments");
			}
			const data = await res.json();
			return data.body as PaymentQueryResult;
		},
	};
}

export function getUpcomingEventsQueryKey() {
	return [EVENTS_UPCOMING_KEY] as const;
}

export function getUpcomingEventsQuery() {
	return {
		queryKey: getUpcomingEventsQueryKey(),
		queryFn: async (): Promise<EventData[]> => {
			const res = await fetch("/api/event/upcoming/get", {
				headers: { Accept: "application/json" },
			});
			const data = await res.json().catch(() => ({}));
			if (!data.success) return [];
			return (data.body ?? []) as EventData[];
		},
	};
}
