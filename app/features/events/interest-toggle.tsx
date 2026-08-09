import { RiHeart3Fill, RiHeart3Line } from "@remixicon/react";
import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import type { EventData } from "~/types";

export default function InterestToggle({
  event,
  currentUserId,
}: {
  event: EventData;
  currentUserId: string;
}) {
  const members = Array.isArray(event.interestedMembers)
    ? event.interestedMembers
    : [];
  const isInitiallyInterested = members.some(
    (m) => String((m as { _id?: string })?._id ?? m) === currentUserId,
  );
  const [interested, setInterested] = useState(isInitiallyInterested);
  const [count, setCount] = useState(members.length);
  const fetcher = useFetcher();

  const actionData = fetcher.data as
    | { success?: boolean; message?: string; body?: { interested: boolean; count: number } }
    | undefined;

  useEffect(() => {
    setInterested(isInitiallyInterested);
    setCount(members.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event._id]);

  useEffect(() => {
    if (!actionData) return;
    if (actionData.success && actionData.body) {
      setInterested(actionData.body.interested);
      setCount(actionData.body.count);
    } else {
      toast.error(actionData.message || "Something went wrong");
    }
  }, [actionData]);

  const toggle = () => {
    fetcher.submit(
      { intent: "toggle-interest", eventId: event._id },
      {
        method: "post",
        encType: "application/json",
        action: `/dashboard/events/${event._id}`,
      },
    );
  };

  return (
    <Button
      variant={interested ? "default" : "outline"}
      size="sm"
      onClick={toggle}
      disabled={fetcher.state === "submitting"}
      aria-pressed={interested}
    >
      {interested ? <RiHeart3Fill /> : <RiHeart3Line />}
      {interested ? "Interested" : "I'm interested"}
      <span className="text-xs opacity-70">({count})</span>
    </Button>
  );
}
