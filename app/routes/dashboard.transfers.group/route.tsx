import { dehydrate } from "@tanstack/react-query";
import { Suspense } from "react";
import { Await } from "react-router";
import { PageSection } from "~/components/provider/page-wrapper";
import DataError from "~/components/ui/data-error";
import NotFound from "~/components/ui/not-found";
import { getQueryClientRsc } from "~/lib/getQueryClient";
import { requirePermission } from "~/middleware/auth.middleware";
import { getGroupTransfersQuery } from "~/queries/transfers";
import TransferSkeleton from "~/features/transfers/transfer-skeleton";
import TransferList from "~/features/transfers/transfer-list";
import type { Route } from "./+types/route";

export const middleware = [requirePermission("MANAGE_TRANSFERS")];

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Group Transfers - Manage BCC007 Team transfers" },
    {
      name: "description",
      content: "Group Transfers - Manage BCC007 Team transfers",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const queryClient = getQueryClientRsc();
  const transfers = queryClient.ensureQueryData(getGroupTransfersQuery(request));
  return {
    dehydratedState: dehydrate(queryClient),
    transfers,
  };
}

export default function TransfersGroup({ loaderData }: Route.ComponentProps) {
   const { transfers } = loaderData;
  return (
    <PageSection index={1} className="mt-4 space-y-4 px-4 xl:px-8">
      <Suspense fallback={<TransferSkeleton />}>
        <Await resolve={transfers} errorElement={<DataError />}>
          {(resolvedTransfers) => (
            <>
              {resolvedTransfers?.transfers.length === 0 ? (
                <NotFound
                  title="No transfers found"
                  message="Transfers have not been made yet. Come back later."
                />
              ) : (
                <TransferList transfers={resolvedTransfers} />
              )}
            </>
          )}
        </Await>
      </Suspense>
    </PageSection>
  );
}