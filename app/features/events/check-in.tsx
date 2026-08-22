import {
  RiUserFollowLine,
  RiUserUnfollowLine,
} from "@remixicon/react";
import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { getOptimizedImageUrl } from "~/lib/cloudinary";
import { getInitials } from "~/lib/utils";
import type { EventData } from "~/types";

export default function CheckInPanel({ event }: { event: EventData }) {
  const members = Array.isArray(event.interestedMembers)
    ? event.interestedMembers
    : [];
  const initialCheckedIn = Array.isArray(event.checkedInMembers)
    ? event.checkedInMembers.map((m) =>
        String((m as { _id?: string })?._id ?? m),
      )
    : [];
  const [checkedInIds, setCheckedInIds] = useState<string[]>(initialCheckedIn);
  const [pendingMemberId, setPendingMemberId] = useState<string | null>(null);
  const fetcher = useFetcher();

  const actionData = fetcher.data as
    | {
        success?: boolean;
        message?: string;
        body?: { checkedIn: boolean; count: number };
      }
    | undefined;

  useEffect(() => {
    setCheckedInIds(initialCheckedIn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event._id]);

  useEffect(() => {
    if (!actionData || !pendingMemberId) return;
    if (actionData.success && actionData.body) {
      setCheckedInIds((prev) =>
        actionData.body!.checkedIn
          ? [...new Set([...prev, pendingMemberId])]
          : prev.filter((id) => id !== pendingMemberId),
      );
    } else {
      toast.error(actionData.message || "Something went wrong");
    }
    setPendingMemberId(null);
  }, [actionData, pendingMemberId]);

  const toggle = (memberId: string) => {
    setPendingMemberId(memberId);
    fetcher.submit(
      { intent: "toggle-check-in", eventId: event._id, memberId },
      {
        method: "post",
        encType: "application/json",
        action: `/dashboard/events/${event._id}`,
      },
    );
  };

  const isCheckedIn = (id: string) => checkedInIds.includes(id);

  return (
    <div className="rounded-sm border shadow-sm">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <h3 className="text-sm font-medium">Check-in</h3>
        <span className="text-xs text-muted-foreground">
          {checkedInIds.length}/{members.length} checked in
        </span>
      </div>
      {members.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">
          No members have indicated interest yet.
        </p>
      ) : (
        <ul className="divide-y divide-border/60">
          {members.map((member) => {
            const memberId = String(
              (member as { _id?: string })?._id ?? member,
            );
            const name =
              (member as { name?: string }).name ?? "Member";
            const image = (member as { image?: string }).image;
            const checked = isCheckedIn(memberId);
            const busy =
              fetcher.state === "submitting" && pendingMemberId === memberId;
            return (
              <li
                key={memberId}
                className="flex items-center gap-3 px-4 py-2.5"
              >
                <Avatar className="size-7 shrink-0 ring-1 ring-foreground/10">
                  <AvatarImage
                    src={getOptimizedImageUrl(image, 28)}
                    alt={name}
                  />
                  <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
                    {getInitials(name)}
                  </AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                  {name}
                </span>
                <Button
                  variant={checked ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggle(memberId)}
                  disabled={busy}
                  aria-pressed={checked}
                >
                  {checked ? (
                    <RiUserUnfollowLine />
                  ) : (
                    <RiUserFollowLine />
                  )}
                  {checked ? "Checked in" : "Check in"}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
