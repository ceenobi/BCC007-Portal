import {
  RiCalendarCheckLine,
  RiGroupLine,
  RiMapPinLine,
  RiTimeLine,
} from "@remixicon/react";
import { Link } from "react-router";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
import Paginate from "~/components/ui/paginate";
import usePaginate from "~/hooks/usePaginate";
import { getOptimizedImageUrl } from "~/lib/cloudinary";
import { statusConfig, typeConfig } from "~/lib/constants";
import { cn, formatEventDate, formatEventTime, getInitials } from "~/lib/utils";
import type { EventQueryResult } from "~/queries/events";
import type { EventData } from "~/types";

function StatusBadge({ status }: { status: EventData["status"] }) {
  const config = statusConfig[status] ?? statusConfig.upcoming;
  return (
    <Badge className={cn("shrink-0 gap-1.5", config.className)}>
      <span
        className={cn("size-1.5 shrink-0 rounded-full", config.dotClassName)}
      />
      <span className="truncate">{config.label}</span>
    </Badge>
  );
}

function EventCard({ event, index }: { event: EventData; index: number }) {
  const { Icon } = typeConfig[event.eventType] ?? typeConfig.other;
  const organizerName = event.organizer?.name as string | undefined;
  const organizerImage = event.organizer?.image as string | undefined;
  const interestedCount = event.interestedMembers?.length ?? 0;
  const featured = getOptimizedImageUrl(event.featuredImage, 640, 360);

  return (
    <Link to={`/dashboard/events/${event._id}`}>
      <Card
        className="h-50 group relative overflow-hidden hover:shadow-sm border hover:border-mainGray/50 transition-[border-color,box-shadow] duration-300 animate-in fade-in slide-in-from-bottom-3"
        style={{ animationDelay: `${index * 100}ms` }}
      >
        <div className="absolute inset-0 z-0 w-full h-full dark:bg-lightGray opacity-60" />
        {featured && (
          <img
            src={featured}
            alt={event.title}
            className="absolute top-0 z-0 opacity-10 w-full object-cover "
          />
        )}

        {/*<div className="absolute top-0 z-0 w-full flex h-full items-center justify-center bg-muted/40 text-muted-foreground/50">
      <Icon className="size-9" aria-hidden="true" />

      </div>*/}
        <CardContent className="relative z-10 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3
                title={event.title}
                className="truncate text-sm font-semibold text-foreground"
              >
                {event.title}
              </h3>
              <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                <RiMapPinLine
                  className="size-3.5 shrink-0"
                  aria-hidden="true"
                />
                <span className="truncate">
                  {event.location || "No location"}
                </span>
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <StatusBadge status={event.status} />
              {/*<DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`More options for ${event.title}`}
                  >
                    <RiMore2Line />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    render={<Link to={`/dashboard/events/${event._id}`} />}
                    className="text-xs cursor-pointer"
                  >
                    <RiEye2Line />
                    View
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    render={<Link to={`/dashboard/events/${event._id}/edit`} />}
                    className="text-xs cursor-pointer"
                  >
                    <RiEditLine />
                    Edit
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>*/}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs font-medium text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Icon className="size-3.5" aria-hidden="true" />
              {typeConfig[event.eventType]?.label ?? "Other"}
            </span>
            <span className="inline-flex items-center gap-1">
              <RiCalendarCheckLine className="size-3.5" aria-hidden="true" />
              {formatEventDate(event.date)}
            </span>
            <span className="inline-flex items-center gap-1">
              <RiTimeLine className="size-3.5" aria-hidden="true" />
              {formatEventTime(event.time)}
            </span>
          </div>

          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {event.detail}
          </p>

          <div className="flex items-center justify-between border-t border-border/60 pt-3">
            <div className="flex min-w-0 items-center gap-2">
              <Avatar className="size-6 shrink-0 ring-1 ring-foreground/10">
                <AvatarImage
                  src={getOptimizedImageUrl(organizerImage, 24)}
                  alt={organizerName ?? "Organizer"}
                />
                <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
                  {getInitials(organizerName) || "?"}
                </AvatarFallback>
              </Avatar>
              <span className="truncate text-xs font-medium text-foreground">
                {organizerName || "Unassigned"}
              </span>
            </div>
            <span
              title="Interested members"
              className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground"
            >
              <RiGroupLine className="size-3.5" aria-hidden="true" />
              {interestedCount}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function EventsList({ events }: { events: EventQueryResult }) {
  const {
    handlePageChange,
    handleLimitChange,
    totalPages,
    hasMore,
    currentPage,
    limit: pageLimit,
  } = usePaginate({
    totalPages: events.meta?.totalPages || 1,
    hasMore: events.meta?.hasMore || false,
    currentPage: events.meta?.currentPage || 1,
  });
  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {events.events.map((event, index) => (
          <EventCard key={event._id} event={event} index={index} />
        ))}
      </div>
      <Paginate
        totalPages={totalPages}
        hasMore={hasMore}
        handlePageChange={handlePageChange}
        onLimitChange={handleLimitChange}
        currentPage={currentPage}
        limit={pageLimit}
      />
    </>
  );
}
