import { dehydrate } from "@tanstack/react-query";
import { Suspense } from "react";
import {
  Await,
  Outlet,
  useLocation,
  useNavigate,
  useOutletContext,
} from "react-router";
import { getMembersForSelect } from "~/.server/actions/member";
import {
  finalizeTransfer,
  getAvailableBalance,
  initiateTransfer,
  retryTransfer,
} from "~/.server/actions/transfer";
import { PageSection, PageWrapper } from "~/components/provider/page-wrapper";
import DataError from "~/components/ui/data-error";
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
import { getQueryClientRsc } from "~/lib/getQueryClient";
import { hasPermission } from "~/lib/rbac";
import { getUserTransfersQuery } from "~/queries/transfers";
import type {
  CreateTransferSchemaType,
  FinalizeTransferSchemaType,
  RetryTransferSchemaType,
  SessionUser,
} from "~/types";
import type { Route } from "./+types/route";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Payment Transfers - Payment transfers to member accounts" },
    {
      name: "description",
      content: "Payment Transfers - Payment transfers to member accounts",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const [membersRes, balanceRes] = await Promise.all([
    getMembersForSelect(request),
    getAvailableBalance(request),
  ]);
  const [membersData, balanceData] = await Promise.all([
    membersRes.json().catch(() => ({})),
    balanceRes.json().catch(() => ({})),
  ]);
  const queryClient = getQueryClientRsc();
  const transfers = queryClient.ensureQueryData(getUserTransfersQuery(request));
  return {
    members: membersData.success ? membersData.body : [],
    balance: balanceData.success
      ? (balanceData.body as {
          total: number;
          pending: number;
          balance: number;
          currency: string;
        })
      : { total: 0, pending: 0, balance: 0, currency: "NGN" },
    dehydratedState: dehydrate(queryClient),
    transfers,
  };
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
      <>
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
            <Suspense fallback={<TransferSkeleton />}>
              <Await resolve={transfers} errorElement={<DataError />}>
                {(resolvedTransfers) => (
                  <>
                    {resolvedTransfers?.transfers.length === 0 ? (
                      <NotFound
                        title="No transfers found"
                        message="Your account has not received any transfers yet. Come back later."
                      />
                    ) : (
                      <TransferList transfers={resolvedTransfers} />
                    )}
                  </>
                )}
              </Await>
            </Suspense>
          </PageSection>
        ) : (
          <Outlet context={{ user }} />
        )}
      </>
    </PageWrapper>
  );
}
