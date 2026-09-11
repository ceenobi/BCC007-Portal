import {
	Outlet,
	useLocation,
	useNavigate,
	useOutletContext,
} from "react-router";
import {
	finalizeTransfer,
	initiateTransfer,
	retryTransfer,
} from "~/.server/actions/transfer";
import { PageSection, PageWrapper } from "~/components/provider/page-wrapper";
import NotFound from "~/components/ui/not-found";
import Search from "~/components/ui/search";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import Filter from "~/features/transfers/filter";
import InitiateTransfer from "~/features/transfers/initiate-transfer";
import TransferList from "~/features/transfers/transfer-list";
import TransferSkeleton from "~/features/transfers/transfer-skeleton";
import { hasPermission } from "~/lib/rbac";
import { clientAuthenticatedMiddleware } from "~/middleware/client-auth";
import type { TransferQueryResult } from "~/queries/transfers";
import type {
	CreateTransferSchemaType,
	FinalizeTransferSchemaType,
	RetryTransferSchemaType,
	SessionUser,
} from "~/types";
import type { Route } from "./+types/route";

export const clientMiddleware = [clientAuthenticatedMiddleware];

type MemberOption = { _id: string; name: string; image?: string };
type Balance = {
	total: number;
	pending: number;
	balance: number;
	currency: string;
};

export function meta(_args: Route.MetaArgs) {
	return [
		{ title: "Payment Transfers - Payment transfers to member accounts" },
		{
			name: "description",
			content: "Payment Transfers - Payment transfers to member accounts",
		},
	];
}


export async function action({ request }: Route.ActionArgs) {
	if (request.method !== "POST") {
		return Response.json({ message: "Method not allowed" }, { status: 405 });
	}
	let payload: Record<string, unknown>;
	try {
		payload = (await request.json()) as Record<string, unknown>;
	} catch {
		return Response.json(
			{ success: false, message: "Invalid JSON payload" },
			{ status: 400 },
		);
	}
	if (payload.intent === "initiate-transfer") {
		return await initiateTransfer(
			request,
			payload as unknown as CreateTransferSchemaType,
		);
	}
	if (payload.intent === "finalize-transfer") {
		return await finalizeTransfer(
			request,
			payload as unknown as FinalizeTransferSchemaType,
		);
	}
	if (payload.intent === "retry-transfer") {
		return await retryTransfer(
			request,
			payload as unknown as RetryTransferSchemaType,
		);
	}
	return Response.json(
		{ success: false, message: "Invalid request" },
		{ status: 400 },
	);
}

export async function clientLoader({
	request,
}: Route.ClientLoaderArgs): Promise<{
	members: MemberOption[];
	balance: Balance;
	transfers: TransferQueryResult;
}> {
	const url = new URL(request.url);
	const [membersRes, balanceRes, transfersRes] = await Promise.all([
		fetch(`/api/member/select`, {
			headers: { Accept: "application/json" },
		}),
		fetch(`/api/transfer/balance/get`, {
			headers: { Accept: "application/json" },
		}),
		fetch(`/api/transfer/user/get?${url.searchParams.toString()}`, {
			headers: { Accept: "application/json" },
		}),
	]);
	const [membersData, balanceData] = await Promise.all([
		membersRes.json().catch(() => ({})),
		balanceRes.json().catch(() => ({})),
	]);
	if (!transfersRes.ok) {
		throw new Response("Failed to load transfers", {
			status: transfersRes.status,
		});
	}
	const transfersData = await transfersRes.json();
	return {
		members: membersData.success ? membersData.body : [],
		balance: balanceData.success
			? (balanceData.body as Balance)
			: { total: 0, pending: 0, balance: 0, currency: "NGN" },
		transfers: transfersData.body as TransferQueryResult,
	};
}

export function HydrateFallback() {
	return (
		<PageWrapper>
			<PageSection index={0} className="space-y-8 px-4 xl:px-8">
				<div className="space-y-2">
					<h1 className="text-xl font-semibold tracking-tight leading-tight text-foreground">
						Transfers
					</h1>
					<p className="leading-snug text-sm text-mainGray dark:text-muted-foreground">
						Payment transfers to member accounts
					</p>
				</div>
			</PageSection>
			<PageSection index={1} className="mt-4 space-y-4 px-4 xl:px-8">
				<TransferSkeleton />
			</PageSection>
		</PageWrapper>
	);
}

export default function Transfers({ loaderData }: Route.ComponentProps) {
	const { members, transfers, balance } = loaderData;
	const { user } = useOutletContext() as { user: SessionUser };
	const isPermitted = hasPermission(user.role, "MANAGE_TRANSFERS");
	const location = useLocation();
	const navigate = useNavigate();
	const currentPage = location.pathname === "/dashboard/transfers";
	const currentTransfer = location.pathname.split("/").filter(Boolean).at(-1);
	const onTransferChange = (value: string | null) => {
		if (value === "" || value === null || value === "transfers") {
			navigate("/dashboard/transfers");
			return;
		}
		navigate(`/dashboard/transfers/${value}`);
	};

	return (
		<PageWrapper>
			<PageSection index={0} className="space-y-8 px-4 xl:px-8">
				<div className="space-y-2">
					<h1 className="text-xl font-semibold tracking-tight leading-tight text-foreground">
						Transfers
					</h1>
					<p className="leading-snug text-sm text-mainGray dark:text-muted-foreground">
						Payment transfers to member accounts
					</p>
				</div>
				<div className="flex justify-between items-center gap-4">
					<div className="flex items-center gap-2">
						<Select value={currentTransfer} onValueChange={onTransferChange}>
							<SelectTrigger className="w-fit text-mainGray dark:text-muted-foreground capitalize text-xs border focus:outline-lightBlue focus:ring-lightBlue">
								<SelectValue placeholder="Transfer History" />
							</SelectTrigger>
							<SelectContent className="rounded-md bg-none">
								{["transfers", "group", "reports"]
									.filter((s) => {
										if (["group", "reports"].includes(s)) {
											return hasPermission(user.role, "MANAGE_PAYMENTS");
										}
										return true;
									})
									.map((p) => (
										<SelectItem
											key={p}
											value={p}
											className="text-xs capitalize"
										>
											{p}
										</SelectItem>
									))}
							</SelectContent>
						</Select>
						{isPermitted &&
							location.pathname === "/dashboard/transfers/group" && (
								<Search
									id="search-members"
									placeholder="Search members..."
									classname="w-fit"
								/>
							)}
					</div>
					<div className="flex items-center gap-2">
						<Filter />
						{isPermitted && (
							<InitiateTransfer members={members} balance={balance} />
						)}
					</div>
				</div>
			</PageSection>
			{currentPage ? (
				<PageSection index={1} className="mt-4 space-y-4 px-4 xl:px-8">
					{transfers?.transfers.length === 0 ? (
						<NotFound
							title="No transfers found"
							message="Your account has not received any transfers yet. Come back later."
						/>
					) : (
						<TransferList transfers={transfers} />
					)}
				</PageSection>
			) : (
				<Outlet context={{ user }} />
			)}
		</PageWrapper>
	);
}
