import {
  RiMacbookLine,
  RiMapPinLine,
  RiSmartphoneLine,
  RiTimeLine,
} from "@remixicon/react";
import { useEffect } from "react";
import { useFetcher } from "react-router";
import { toast } from "sonner";
import { AlertBox } from "~/components/ui/alert-box";
import { Button } from "~/components/ui/button";
import { Card, CardHeader, CardTitle } from "~/components/ui/card";

export default function Sessions({
  sessions,
  currentSessionId,
}: {
  sessions: any[];
  currentSessionId: string | undefined;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold leading-snug text-mainBlack dark:text-white">
        Manage Sessions
      </h2>
      <Card className="dark:bg-lightGray">
        <CardHeader>
          <div className="flex items-center gap-2 mb-1">
            <RiSmartphoneLine size={18} />
            <CardTitle className="text-sm">Active Sessions</CardTitle>
          </div>
        </CardHeader>
        <div className="px-6 pb-6 space-y-4">
          {sessions.map((session: any) => (
            <SessionRow
              key={session.id}
              session={session}
              currentSessionId={currentSessionId}
            />
          ))}
        </div>
      </Card>
    </div>
  );
}

function SessionRow({
  session,
  currentSessionId,
}: {
  session: any;
  currentSessionId: string | undefined;
}) {
  const fetcher = useFetcher();
  const isRevoking = fetcher.state !== "idle";

  const actionData = fetcher.data as
    { success?: boolean; message?: string; body?: any } | undefined;

  useEffect(() => {
    if (actionData?.success) {
      toast.success(actionData.message || "Session revoked successfully");
    }
  }, [actionData]);

  return (
    <>
      <AlertBox
        showAlert={fetcher.data && !fetcher.data?.success}
        title="Error"
        description={
          fetcher.data?.message || "An error occurred. Please try again."
        }
        variant="destructive"
      />
      <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-border/50 group hover:border-mainBlue/30 hover:dark:border-mainGold/30 transition-colors">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-background dark:bg-mainGold/20 rounded-lg border border-border/50 text-muted-foreground dark:text-white group-hover:text-mainBlue group-hover:dark:text-mainGold transition-colors">
            {session.userAgent?.toLowerCase().includes("mac") ||
            session.userAgent?.toLowerCase().includes("windows") ? (
              <RiMacbookLine size={20} />
            ) : (
              <RiSmartphoneLine size={20} />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">
                {session.userAgent || "Unknown Device"}
              </span>
              {session.id === currentSessionId && (
                <span className="bg-mainPurple/10 text-mainPurple text-[10px] font-bold px-2 py-0.5 rounded-full border border-mainPurple/20 uppercase tracking-tighter">
                  Current
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <RiMapPinLine size={10} /> {session.ipAddress || "Unknown IP"}
              </span>
              <span className="flex items-center gap-1">
                <RiTimeLine size={10} /> Last active:{" "}
                {new Date(session.updatedAt).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
        {session.id !== currentSessionId && (
          <Button
            variant="destructive"
            size="sm"
            className="text-xs font-bold"
            onClick={() => {
              fetcher.submit(
                {
                  intent: "revoke-session",
                  token: session.token,
                },
                { method: "post", encType: "application/json" },
              );
            }}
          >
            {isRevoking ? "Revoking…" : "Revoke"}
          </Button>
        )}
      </div>
    </>
  );
}
