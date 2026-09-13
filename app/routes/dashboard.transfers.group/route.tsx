import { PageSection } from "~/components/provider/page-wrapper";
import NotFound from "~/components/ui/not-found";
import { getQueryClient } from "~/lib/getQueryClient";
import { requirePermission } from "~/middleware/auth.middleware";
import {
	clientAuthenticatedMiddleware,
	clientRequirePermission,
} from "~/middleware/client-auth";
import { getTransfersGroupQuery } from "~/queries/client-transfers";
import type { TransferQueryResult } from "~/queries/client-transfers";
import TransferList from "../../features/transfers/transfer-list";
import TransferSkeleton from "../../features/transfers/transfer-skeleton";
import type { Route } from "./+types/route";

export const middleware = [requirePermission("MANAGE_TRANSFERS")];

export const clientMiddleware = [
	clientAuthenticatedMiddleware,
	clientRequirePermission("MANAGE_TRANSFERS"),
];

export function meta(_args: Route.MetaArgs) {
	return [
		{ title: "Group Transfers - Manage BCC007 Team transfers" },
		{
			name: "description",
			content: "Group Transfers - Manage BCC007 Team transfers",
		},
	];
}

export async function clientLoader({
	request,
}: Route.ClientLoaderArgs): Promise<{ transfers: TransferQueryResult }> {
	const searchParams = new URLSearchParams(new URL(request.url).search);
	const queryClient = getQueryClient();
	await queryClient.prefetchQuery(getTransfersGroupQuery(searchParams));
	const transfers = queryClient.getQueryData(
		getTransfersGroupQuery(searchParams).queryKey,
	) as TransferQueryResult;
	return { transfers };
}

export function HydrateFallback() {
	return (
		<PageSection index={1} className="mt-4 space-y-4 px-4 xl:px-8">
			<TransferSkeleton />
		</PageSection>
	);
}

export default function TransfersGroup({ loaderData }: Route.ComponentProps) {
	const { transfers } = loaderData;
	return (
		<PageSection index={1} className="mt-4 space-y-4 px-4 xl:px-8">
			{transfers?.transfers.length === 0 ? (
				<NotFound
					title="No transfers found"
					message="Transfers have not been made yet. Come back later."
				/>
			) : (
				<TransferList transfers={transfers} />
			)}
		</PageSection>
	);
}
