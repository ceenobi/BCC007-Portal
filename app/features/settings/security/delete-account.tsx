import { RiAlertFill } from "@remixicon/react";
import { useEffect } from "react";
import { useFetcher } from "react-router";
import { toast } from "sonner";
import ActionBtn from "~/components/ui/action-btn";
import { AlertBox } from "~/components/ui/alert-box";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import type { SessionUser } from "~/types";

export default function DeleteAccount({ user }: { user: SessionUser }) {
  const fetcher = useFetcher();

  const actionData = fetcher.data as
    { success?: boolean; message?: string; body?: any } | undefined;

  useEffect(() => {
    if (actionData?.success) {
      toast.success(actionData.message || "Account delete request successful");
    }
  }, [actionData]);

  return (
    <Card className=" border border-red-300 dark:border-red-900 dark:bg-red-400/10 dark:text-red-50">
      <CardHeader>
        <div className="flex items-center gap-2 mb-1">
          <RiAlertFill size={18} className="text-red-500" />
          <CardTitle className="font-semibold">Danger Zone</CardTitle>
        </div>
        <span className="text-sm">Irreversible and destructive actions.</span>
        <CardDescription className="mt-4">
          <AlertBox
            showAlert={fetcher.data && !fetcher.data?.success}
            title="Error"
            description={
              fetcher.data?.message || "An error occurred. Please try again."
            }
            variant="destructive"
          />
          <div className="flex flex-col gap-4 md:flex-row justify-between items-center">
            <div>
              <h1 className="text-lightGray font-medium dark:text-white">
                Delete your account
              </h1>
              <p className="text-xs text-muted-foreground">
                Permanently delete your account and all of its data. This action
                cannot be undone.
              </p>
            </div>
            <ActionBtn
              text="Delete Account"
              type="submit"
              loading={fetcher.state !== "idle"}
              onClick={() => {
                fetcher.submit(
                  { id: user._id, intent: "delete-account" },
                  {
                    method: "post",
                    action: "/dashboard/settings/security",
                    encType: "application/json",
                  },
                );
              }}
              classname="w-full sm:w-auto text-xs border border-red-400 bg-destructive/10 dark:bg-red-300/30 hover:bg-red-500/70 hover:dark:bg-red-500/30 text-mainBlack dark:text-white"
            />
          </div>
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
