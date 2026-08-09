import {
  RiArrowRightUpLine,
  RiCalendarCheckLine,
  RiMapPinLine,
  RiTimeLine,
} from "@remixicon/react";
import { Link } from "react-router";
import { cn, formatEventDate, formatEventTime } from "~/lib/utils";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { buttonVariants } from "~/components/ui/button";
import { typeConfig } from "~/lib/constants";
import type { EventData } from "~/types";

type UpcomingEventsProps = {
  events: EventData[];
  className?: string;
};

export default function UpcomingEvents({
  events,
  className,
}: UpcomingEventsProps) {
  return (
    <Card className={cn("animate-in fade-in slide-in-from-bottom-3", className)}>
      <CardHeader>
        <CardTitle className="text-sm">Upcoming Events</CardTitle>
        <CardAction>
          <Link
            to="/dashboard/events"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            All events
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-1">
        {events.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No upcoming events
          </p>
        ) : (
          events.map((event) => {
            const config = typeConfig[event.eventType] ?? typeConfig.other;
            return (
              <Link
                key={event._id}
                to={`/dashboard/events/${event._id}`}
                className="group flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50"
              >
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
                >
                  <config.Icon className="size-4.5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground group-hover:text-primary">
                    {event.title}
                  </span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <RiCalendarCheckLine className="size-3" aria-hidden="true" />
                      {formatEventDate(event.date)}
                    </span>
                    {event.time && (
                      <span className="inline-flex items-center gap-1">
                        <RiTimeLine className="size-3" aria-hidden="true" />
                        {formatEventTime(event.time)}
                      </span>
                    )}
                    <span className="inline-flex max-w-full items-center gap-1 truncate">
                      <RiMapPinLine className="size-3 shrink-0" aria-hidden="true" />
                      <span className="truncate">
                        {event.location || "No location"}
                      </span>
                    </span>
                  </span>
                </span>
                <RiArrowRightUpLine
                  className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  aria-hidden="true"
                />
              </Link>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
