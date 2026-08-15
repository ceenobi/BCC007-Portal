import {
  RiCheckboxCircleFill,
  RiErrorWarningFill,
  RiLoader4Fill,
} from "@remixicon/react";
import { useNavigate, useSearchParams } from "react-router";
import { PaystackService } from "~/.server/services/paystack.service";
import { PageSection, PageWrapper } from "~/components/provider/page-wrapper";
import ActionBtn from "~/components/ui/action-btn";
import { AlertBox } from "~/components/ui/alert-box";
import {
  authenticatedMiddleware,
  userContext,
} from "~/middleware/auth.middleware";
import type { SessionUser } from "~/types";
import { buildSeoMeta } from "~/lib/seo";
import type { Route } from "./+types/route";
export const middleware = [authenticatedMiddleware];

export function meta({}: Route.MetaArgs) {
  return [
    ...buildSeoMeta({
      title: "Payment status - BCC007",
      description:
        "Confirming your payment on the BCC007 alumni platform.",
      path: "/payments/verify",
      noindex: true,
    }),
  ];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const user = context.get(userContext);
  if (!user) {
    throw Response.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }
  const url = new URL(request.url);
  const reference = url.searchParams.get("reference");

  if (!reference) {
    return {
      user,
      reference: null,
      status: false,
      error: "No reference provided.",
    };
  }

  try {
    const result = await PaystackService.verifyPayment({ reference }, {
      id: user._id,
    } as any);
    return { user, reference, status: result.status, error: null };
  } catch (error: any) {
    return {
      user,
      reference,
      status: false,
      error:
        error.message || "We could not verify this payment. Please try again.",
    };
  }
}

export default function PaymentsVerify({ loaderData }: Route.ComponentProps) {
  const data = loaderData as {
    user: SessionUser;
    reference: string | null;
    status: boolean;
    error: string | null;
  };
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reference = data.reference ?? searchParams.get("reference");

  return (
    <PageWrapper>
      <PageSection index={0} className="w-full max-w-xl mx-auto p-6">
        {!reference ? (
          <div className="p-8 sm:p-12 text-center space-y-6">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-warning/20 blur-2xl rounded-full animate-pulse" />
              <div className="relative w-24 h-24 bg-warning/10 rounded-full flex items-center justify-center mx-auto border border-warning/40">
                <RiErrorWarningFill className="text-warning w-12 h-12" />
              </div>
            </div>
            <div className="space-y-3">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Missing payment reference
              </h1>
              <p className="text-base text-muted-foreground">
                We couldn't find a payment to confirm.
              </p>
            </div>
            <div className="pt-4">
              <ActionBtn
                text="Go to Dashboard"
                type="button"
                classname="w-full sm:w-auto px-10 rounded-md font-medium btn"
                onClick={() => navigate("/dashboard")}
              />
            </div>
          </div>
        ) : (
          <div className="relative">
            <div className="px-6 py-3 flex items-center justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-mainBlue animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-mainBlue dark:text-lightBlue">
                Payment {data.status ? "Confirmed" : "Verification"}
              </span>
            </div>

            <div className="p-3 sm:px-12 space-y-4">
              <div className="min-h-6">
                {data.error && (
                  <AlertBox
                    showAlert
                    title="Payment Error"
                    description={data.error}
                    variant="destructive"
                  />
                )}
              </div>

              {data.status ? (
                <div className="text-center space-y-4">
                  <div className="relative inline-block">
                    <div className="absolute inset-0 bg-success/20 blur-xl rounded-full" />
                    <div className="relative w-20 h-20 bg-success/10 rounded-3xl rotate-12 flex items-center justify-center mx-auto border border-success/40">
                      <RiCheckboxCircleFill className="text-success w-10 h-10 -rotate-12" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-foreground">
                      Payment Confirmed
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed text-balance">
                      Thank you, {data.user.name}. Your payment of{" "}
                      <span className="font-medium text-foreground">
                        {reference}
                      </span>{" "}
                      has been recorded successfully. A confirmation email is on
                      its way.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <div className="relative inline-block">
                    <div className="absolute inset-0 bg-warning/10 blur-xl rounded-full" />
                    <div className="relative w-20 h-20 bg-warning/10 rounded-3xl rotate-12 flex items-center justify-center mx-auto border border-warning/40">
                      <RiLoader4Fill className="text-warning w-10 h-10 -rotate-12 animate-spin" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-foreground">
                      Verifying payment
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      We're confirming your transaction with our payment
                      provider. This page will refresh in a moment.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex flex-col items-center gap-4 pt-2">
                <ActionBtn
                  text="Go to Dashboard"
                    type="button"
                    size="lg"
                  classname="w-full sm:w-auto px-10 rounded-md font-medium btn"
                  onClick={() => navigate("/dashboard/payments")}
                />
              </div>
            </div>
          </div>
        )}
      </PageSection>
    </PageWrapper>
  );
}
