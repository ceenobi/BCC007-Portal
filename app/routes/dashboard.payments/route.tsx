import { dehydrate } from "@tanstack/react-query";
import { Suspense } from "react";
import {
    Await,
    Outlet,
    useLocation,
    useNavigate,
    useOutletContext,
} from "react-router";
import { getUpcomingEvents } from "~/.server/actions/event-data";
import {
    cancelSubscription,
    initializePayment,
    verifyPayment,
} from "~/.server/actions/payment";
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
import { getQueryClientRsc } from "~/lib/getQueryClient";
import { hasPermission } from "~/lib/rbac";
import { getUserPaymentsQuery } from "~/queries/payments";
import type {
    CancelSubscriptionSchemaType,
    InitializePaymentSchemaType,
    SessionUser,
    VerifyPaymentSchemaType,
} from "~/types";
import Filter from "../../features/payments/filter";
import NewPayment from "../../features/payments/new-payment";
import PaymentsList from "../../features/payments/payment-list";
import PaymentsSkeleton from "../../features/payments/payments-skeleton";
import type { Route } from "./+types/route";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Your Payments - Manage BCC007 Team payments" },
    {
      name: "description",
      content: "Your Payments - Manage BCC007 Team payments",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const eventsRes = await getUpcomingEvents(request);
  const eventsData = await eventsRes.json().catch(() => ({}));
  const queryClient = getQueryClientRsc();
  const payments = queryClient.ensureQueryData(getUserPaymentsQuery(request));
  return {
    events: eventsData.success ? eventsData.body : [],
    dehydratedState: dehydrate(queryClient),
    payments,
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

  switch (payload.intent) {
    case "initialize-payment":
      return await initializePayment(
        request,
        payload as unknown as InitializePaymentSchemaType,
      );
    case "verify-payment":
      return await verifyPayment(
        request,
        payload as unknown as VerifyPaymentSchemaType,
      );
    case "cancel-subscription":
      return await cancelSubscription(
        request,
        payload as unknown as CancelSubscriptionSchemaType,
      );
    default:
      return Response.json(
        { success: false, message: "Invalid request" },
        { status: 400 },
      );
  }
}

export default function Payments({ loaderData }: Route.ComponentProps) {
  const { events, payments } = loaderData;
  const { user } = useOutletContext() as { user: SessionUser };
  const location = useLocation();
  const navigate = useNavigate();
  const currentPage = location.pathname === "/dashboard/payments";
  const currentPayment = location.pathname.split("/").filter(Boolean).at(-1);
  const onPaymentChange = (value: string | null) => {
    if (value === "" || value === null || value === "payments") {
      navigate("/dashboard/payments");
      return;
    }
    navigate(`/dashboard/payments/${value}`);
  };

  return (
    <PageWrapper>
      <>
        <PageSection index={0} className="space-y-8 px-4 xl:px-8">
          <div className="space-y-2">
            <h1 className="text-xl font-semibold tracking-tight leading-tight text-foreground">
            Payments
            </h1>
            <p className="leading-snug text-sm text-mainGray dark:text-muted-foreground">
              View your payment history and manage your payments.
            </p>
          </div>
          <div className="flex justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Select value={currentPayment} onValueChange={onPaymentChange}>
                <SelectTrigger className="w-fit text-mainGray dark:text-muted-foreground capitalize text-xs border focus:outline-lightBlue focus:ring-lightBlue">
                  <SelectValue placeholder="Payment History" />
                </SelectTrigger>
                <SelectContent className="rounded-md bg-none">
                  {["payments", "group", "reports"]
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
              <Search
                id="search-payments"
                placeholder="Search payments..."
                classname="w-fit"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter />
              <NewPayment events={events} />
            </div>
          </div>
        </PageSection>
        {currentPage ? (
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
        ) : (
          <Outlet context={{ user }} />
        )}
      </>
    </PageWrapper>
  );
}
