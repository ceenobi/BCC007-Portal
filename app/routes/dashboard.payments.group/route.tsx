import { PageSection } from "~/components/provider/page-wrapper";
import NotFound from "~/components/ui/not-found";
import { getQueryClient } from "~/lib/getQueryClient";
import { requirePermission } from "~/middleware/auth.middleware";
import { clientRequirePermission } from "~/middleware/client-auth";
import { getPaymentsGroupQuery } from "~/queries/client-payments";
import type { PaymentQueryResult } from "~/queries/client-payments";
import PaymentsList from "../../features/payments/payment-list";
import PaymentsSkeleton from "../../features/payments/payments-skeleton";
import type { Route } from "./+types/route";

export const middleware = [requirePermission("MANAGE_PAYMENTS")];

export function meta(_args: Route.MetaArgs) {
	return [
		{ title: "Group Payments - Manage BCC007 Team payments" },
		{
			name: "description",
			content: "Group Payments - Manage BCC007 Team payments",
		},
	];
}

export const clientMiddleware = [clientRequirePermission("MANAGE_PAYMENTS")];

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
	const searchParams = new URLSearchParams(new URL(request.url).search);
	const queryClient = getQueryClient();
	await queryClient.prefetchQuery(getPaymentsGroupQuery(searchParams));
	const payments = queryClient.getQueryData(
		getPaymentsGroupQuery(searchParams).queryKey,
	) as PaymentQueryResult;
	return { payments };
}

export function HydrateFallback() {
	return (
		<PageSection index={1} className="mt-4 space-y-4 px-4 xl:px-8">
			<PaymentsSkeleton />
		</PageSection>
	);
}

export default function GroupPayment({ loaderData }: Route.ComponentProps) {
	const { payments } = loaderData;
	return (
		<PageSection index={1} className="mt-4 space-y-4 px-4 xl:px-8">
			{payments?.payments.length === 0 ? (
				<NotFound
					title="No payments found"
					message="Payments have not been made yet. Come back later."
				/>
			) : (
				<PaymentsList payments={payments} />
			)}
		</PageSection>
	);
}
