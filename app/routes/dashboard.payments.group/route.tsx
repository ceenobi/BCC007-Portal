import { dehydrate } from "@tanstack/react-query";
import { Suspense } from "react";
import { Await } from "react-router";
import { PageSection } from "~/components/provider/page-wrapper";
import DataError from "~/components/ui/data-error";
import NotFound from "~/components/ui/not-found";
import { getQueryClientRsc } from "~/lib/getQueryClient";
import { requirePermission } from "~/middleware/auth.middleware";
import { getGroupPaymentsQuery } from "~/queries/payments";
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

export async function loader({ request }: Route.LoaderArgs) {
	const queryClient = getQueryClientRsc();
	const payments = queryClient.ensureQueryData(getGroupPaymentsQuery(request));
	return {
		dehydratedState: dehydrate(queryClient),
		payments,
	};
}

export default function GroupPayment({ loaderData }: Route.ComponentProps) {
	const { payments } = loaderData;
	return (
		<PageSection index={1} className="mt-4 space-y-4 px-4 xl:px-8">
			<Suspense fallback={<PaymentsSkeleton />}>
				<Await resolve={payments} errorElement={<DataError />}>
					{(resolvedPayments) => (
						<>
							{resolvedPayments?.payments.length === 0 ? (
								<NotFound
									title="No payments found"
									message="Payments have not been made yet. Come back later."
								/>
							) : (
								<PaymentsList payments={resolvedPayments} />
							)}
						</>
					)}
				</Await>
			</Suspense>
		</PageSection>
	);
}
