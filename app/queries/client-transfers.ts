import type { TransferQueryResult, TransferReportData } from "./transfers";

export { type TransferQueryResult, type TransferReportData } from "./transfers";

export type TransferBalance = {
	total: number;
	pending: number;
	balance: number;
	currency: string;
};

export type TransferMemberOption = {
	_id: string;
	name: string;
	image?: string;
};

export const TRANSFERS_USER_KEY = "transfers_user" as const;
export const TRANSFERS_GROUP_KEY = "transfers_group" as const;
export const TRANSFERS_USER_REPORTS_KEY = "transfers_user_reports" as const;
export const TRANSFERS_GROUP_REPORTS_KEY = "transfers_group_reports" as const;
export const TRANSFER_BALANCE_KEY = "transfer_balance" as const;
export const MEMBERS_SELECT_TRANSFERS_KEY = "members_select_transfers" as const;

export function getTransfersQueryKey(
	page: number,
	limit: number,
	transferStatus?: string,
	startDate?: string,
	endDate?: string,
) {
	return [TRANSFERS_USER_KEY, page, limit, transferStatus, startDate, endDate] as const;
}

export function getTransfersQuery(searchParams: URLSearchParams) {
	const page = Number(searchParams.get("page")) || 1;
	const limit = Number(searchParams.get("limit")) || 10;
	const transferStatus = searchParams.get("transferStatus") || undefined;
	const startDate = searchParams.get("startDate") || undefined;
	const endDate = searchParams.get("endDate") || undefined;

	return {
		queryKey: getTransfersQueryKey(page, limit, transferStatus, startDate, endDate),
		queryFn: async (): Promise<TransferQueryResult> => {
			const params = new URLSearchParams();
			params.set("page", String(page));
			params.set("limit", String(limit));
			if (transferStatus) params.set("transferStatus", transferStatus);
			if (startDate) params.set("startDate", startDate);
			if (endDate) params.set("endDate", endDate);

			const res = await fetch(`/api/transfer/user/get?${params}`, {
				headers: { Accept: "application/json" },
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.message || "Failed to fetch transfers");
			}
			const data = await res.json();
			return data.body as TransferQueryResult;
		},
	};
}

export function getTransfersGroupQueryKey(
	page: number,
	limit: number,
	query?: string,
	transferStatus?: string,
	startDate?: string,
	endDate?: string,
) {
	return [TRANSFERS_GROUP_KEY, page, limit, query, transferStatus, startDate, endDate] as const;
}

export function getTransfersGroupQuery(searchParams: URLSearchParams) {
	const page = Number(searchParams.get("page")) || 1;
	const limit = Number(searchParams.get("limit")) || 10;
	const query = searchParams.get("query") || undefined;
	const transferStatus = searchParams.get("transferStatus") || undefined;
	const startDate = searchParams.get("startDate") || undefined;
	const endDate = searchParams.get("endDate") || undefined;

	return {
		queryKey: getTransfersGroupQueryKey(page, limit, query, transferStatus, startDate, endDate),
		queryFn: async (): Promise<TransferQueryResult> => {
			const params = new URLSearchParams();
			params.set("page", String(page));
			params.set("limit", String(limit));
			if (query) params.set("query", query);
			if (transferStatus) params.set("transferStatus", transferStatus);
			if (startDate) params.set("startDate", startDate);
			if (endDate) params.set("endDate", endDate);

			const res = await fetch(`/api/transfer/all/get?${params}`, {
				headers: { Accept: "application/json" },
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.message || "Failed to fetch group transfers");
			}
			const data = await res.json();
			return data.body as TransferQueryResult;
		},
	};
}

export function getTransfersUserReportsQuery(searchParams: URLSearchParams) {
	const period = searchParams.get("period") || undefined;
	const transferStatus = searchParams.get("transferStatus") || undefined;

	return {
		queryKey: [TRANSFERS_USER_REPORTS_KEY, period, transferStatus] as const,
		queryFn: async (): Promise<TransferReportData> => {
			const params = new URLSearchParams();
			if (period) params.set("period", period);
			if (transferStatus) params.set("transferStatus", transferStatus);

			const res = await fetch(`/api/transfer/user/report/get?${params}`, {
				headers: { Accept: "application/json" },
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.message || "Failed to fetch user transfer reports");
			}
			const data = await res.json();
			return data.body as TransferReportData;
		},
	};
}

export function getTransfersGroupReportsQuery(searchParams: URLSearchParams) {
	const period = searchParams.get("period") || undefined;
	const transferStatus = searchParams.get("transferStatus") || undefined;

	return {
		queryKey: [TRANSFERS_GROUP_REPORTS_KEY, period, transferStatus] as const,
		queryFn: async (): Promise<TransferReportData> => {
			const params = new URLSearchParams();
			if (period) params.set("period", period);
			if (transferStatus) params.set("transferStatus", transferStatus);

			const res = await fetch(`/api/transfer/group/report/get?${params}`, {
				headers: { Accept: "application/json" },
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.message || "Failed to fetch group transfer reports");
			}
			const data = await res.json();
			return data.body as TransferReportData;
		},
	};
}

export function getTransferBalanceQueryKey() {
	return [TRANSFER_BALANCE_KEY] as const;
}

const DEFAULT_BALANCE: TransferBalance = {
	total: 0,
	pending: 0,
	balance: 0,
	currency: "NGN",
};

export function getTransferBalanceQuery() {
	return {
		queryKey: getTransferBalanceQueryKey(),
		queryFn: async (): Promise<TransferBalance> => {
			const res = await fetch("/api/transfer/balance/get", {
				headers: { Accept: "application/json" },
			});
			const data = await res.json().catch(() => ({}));
			if (!data.success) return DEFAULT_BALANCE;
			return (data.body as TransferBalance) ?? DEFAULT_BALANCE;
		},
	};
}

export function getMembersSelectForTransfersQueryKey() {
	return [MEMBERS_SELECT_TRANSFERS_KEY] as const;
}

export function getMembersSelectForTransfersQuery() {
	return {
		queryKey: getMembersSelectForTransfersQueryKey(),
		queryFn: async (): Promise<TransferMemberOption[]> => {
			const res = await fetch("/api/member/select", {
				headers: { Accept: "application/json" },
			});
			const data = await res.json().catch(() => ({}));
			if (!data.success) return [];
			return (data.body ?? []) as TransferMemberOption[];
		},
	};
}
