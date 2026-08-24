import { RiErrorWarningLine } from "@remixicon/react";
import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import { toast } from "sonner";
import {
    cancelSubscription,
    getUserSubscription,
} from "~/.server/actions/payment";
import { PageSection } from "~/components/provider/page-wrapper";
import ActionBtn from "~/components/ui/action-btn";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import Modal from "~/components/ui/modal";
import { Separator } from "~/components/ui/separator";
import type { CancelSubscriptionSchemaType } from "~/types";
import type { Route } from "./+types/route";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "Subscription Settings | BCC007" },
    {
      name: "description",
      content: "Manage your membership BCC007 Subscription.",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const res = await getUserSubscription(request);
  const data = await res.json();
  return {
    sub: data.success ? data.body : null,
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

  if (payload.intent !== "cancel-subscription") {
    return Response.json(
      { success: false, message: "Invalid request" },
      { status: 400 },
    );
  }

  return await cancelSubscription(
    request,
    payload as unknown as CancelSubscriptionSchemaType,
  );
}

type SubscriptionActionData =
  | {
      success?: boolean;
      message?: string;
    }
  | undefined;

export default function Subscription({ loaderData }: Route.ComponentProps) {
  const { sub } = loaderData;
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state === "submitting";
  const actionData = fetcher.data as SubscriptionActionData;

  useEffect(() => {
    if (!actionData) return;
    if (actionData.success) {
      toast.success(
        actionData.message || "Subscription cancelled successfully",
      );
      setIsOpen(false);
    } else {
      toast.error(actionData.message || "Something went wrong");
    }
  }, [actionData]);

  const onConfirmCancel = () => {
    fetcher.submit(
      {
        intent: "cancel-subscription",
        code: sub?.paystackSubscriptionId ?? "",
        token: sub?.paystackEmailToken ?? "",
        reference: sub?.reference,
      },
      {
        method: "post",
        encType: "application/json",
        action: "/dashboard/settings/subscription",
      },
    );
  };

  return (
    <>
      <PageSection index={1} className="space-y-6 px-4 xl:px-8">
        <div className="space-y-0.5">
          <h1 className="text-xl font-semibold tracking-tight leading-tight text-foreground">
            Membership dues
          </h1>
          <p className="text-sm text-muted-foreground">
            Cancel your membership subscription at any time.
          </p>
        </div>
        <Card className="dark:bg-lightGray">
          <CardContent>
            <div className="grid grid-cols-1 px-4 py-6 text-mainGray dark:text-white">
              {!sub ? (
                <p>No subscription found</p>
              ) : (
                <div className="space-y-4">
                  <p>
                    You are currently subscribed to the monthly membership dues
                    plan.
                  </p>
                  <Button
                    variant="destructive"
                    onClick={() => setIsOpen(true)}
                    className="border border-red-500"
                  >
                    Unsubscribe
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </PageSection>
      <Modal isOpen={isOpen} setIsOpen={setIsOpen} title="Membership dues">
        <Separator />
        <div>
          <div className="flex flex-col gap-2 items-center w-full">
            <div className="flex items-center gap-2 bg-red-50 p-2 rounded-full">
              <RiErrorWarningLine size={20} className="text-red-500" />
            </div>
            <div className="text-center">
              <h1 className="text-base font-bold text-mainGray dark:text-white">
                Confirm Cancellation
              </h1>
              <p className="text-sm text-muted-foreground">
                Your monthly levy fees will no longer be auto deducted
              </p>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsOpen(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <ActionBtn
            type="button"
            text="Yes, cancel subscription"
            classname="btn"
            size="sm"
            loading={isSubmitting}
            onClick={onConfirmCancel}
          />
        </div>
      </Modal>
    </>
  );
}
