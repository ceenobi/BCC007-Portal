import {
  RiArrowLeftLine,
  RiCalendarCheckLine,
  RiCloseCircleLine,
  RiDeleteBin3Line,
  RiErrorWarningLine,
  RiMapPinLine,
  RiMore2Fill,
  RiTimeLine,
} from "@remixicon/react";
import { formatDistanceToNowStrict } from "date-fns";
import { useState } from "react";
import { useNavigate, useOutletContext } from "react-router";
import {
  cancelEvent,
  deleteEvent,
  toggleEventCheckIn,
  toggleEventInterest,
  updateEvent,
} from "~/.server/actions/event-data";
import { getMembersForSelect } from "~/.server/actions/member";
import { PageSection } from "~/components/provider/page-wrapper";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { ImageBox } from "~/components/ui/image-box";
import MapLocation from "~/components/ui/map-location";
import NotFound from "~/components/ui/not-found";
import { getOptimizedImageUrl } from "~/lib/cloudinary";
import { statusConfig, typeConfig } from "~/lib/constants";
import { getQueryClientRsc } from "~/lib/getQueryClient";
import { cn, formatEventDate, formatEventTime, getInitials } from "~/lib/utils";
import { requirePermission, userContext } from "~/middleware/auth.middleware";
import { getEventQuery } from "~/queries/events";
import type { EventData, UpdateEventSchemaType } from "~/types";
import type { Route } from "./+types/route";
import CancelEvent from "../../features/events/cancel-event";
import CheckInPanel from "../../features/events/check-in";
import DeleteEvent from "../../features/events/delete-event";
import EditEvent from "../../features/events/edit-event";
import InterestToggle from "../../features/events/interest-toggle";

export const middleware = [requirePermission("MANAGE_EVENTS", "action")];

export function meta({ loaderData }: Route.MetaArgs) {
  const event = loaderData?.event;
  const title = event ? `${event.title} - BCC007` : "Event";

  return [
    { title },
    {
      name: "description",
      content: "Event - Manage BCC007 Team events",
    },
  ];
}

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const { eventId } = params;
  if (!eventId) {
    throw new Error("Event ID is required");
  }
  const membersRes = await getMembersForSelect(request);
  const membersData = await membersRes.json().catch(() => ({}));
  const queryClient = getQueryClientRsc();
  const event = await queryClient
    .ensureQueryData(getEventQuery(request, eventId))
    .catch(() => null);
  const currentUser = context.get(userContext);
  return {
    event,
    members: membersData.success ? membersData.body : [],
    currentUserId: currentUser?._id ?? null,
  };
}

export async function action({ request, params }: Route.ActionArgs) {
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
  if (payload.intent === "update-event") {
    return await updateEvent(
      request,
      payload as unknown as UpdateEventSchemaType,
      params.eventId ?? "",
    );
  }
  if (payload.intent === "delete-event") {
    return await deleteEvent(request, payload as { eventId: string });
  }
  if (payload.intent === "toggle-interest") {
    return await toggleEventInterest(request, payload as { eventId: string });
  }
  if (payload.intent === "toggle-check-in") {
    return await toggleEventCheckIn(
      request,
      payload as { eventId: string; memberId: string },
    );
  }
  if (payload.intent === "cancel-event") {
    return await cancelEvent(request, payload as { eventId: string });
  }
  return Response.json(
    { success: false, message: "Invalid request" },
    { status: 400 },
  );
}

export default function EventDetails({ loaderData }: Route.ComponentProps) {
  const { event, members, currentUserId } = loaderData;
  const { isPermitted } = useOutletContext() as { isPermitted: boolean };

  return (
    <div className="mx-4">
      <PageSection index={0}>
        {event ? (
          <Event
            event={event}
            isPermitted={isPermitted}
            members={members}
            currentUserId={currentUserId}
          />
        ) : (
          <NotFound
            title="No event found"
            message="Unable to find the event."
          />
        )}
      </PageSection>
    </div>
  );
}

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

function Event({
  event,
  isPermitted,
  members,
  currentUserId,
}: {
  event: EventData;
  isPermitted: boolean;
  members: Array<{ _id: string; name: string; image?: string }>;
  currentUserId: string | null;
}) {
  const navigate = useNavigate();
  const { Icon } = typeConfig[event.eventType] ?? typeConfig.other;
  const organizerName = event.organizer?.name as string | undefined;
  const organizerImage = event.organizer?.image as string | undefined;
  const hasCoords = Boolean(event.longitude && event.latitude);
  const canModerate = event.status === "upcoming" || event.status === "ongoing";
  const interestedMembers = Array.isArray(event.interestedMembers)
    ? event.interestedMembers
    : [];
  const interestedCount = interestedMembers.length;
  const spotsLeft =
    typeof event.capacity === "number"
      ? Math.max(event.capacity - interestedCount, 0)
      : null;

  const [cancelOpen, setCancelOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const parsedDate = new Date(event.date);
  const dateDistance = Number.isNaN(parsedDate.getTime())
    ? null
    : formatDistanceToNowStrict(parsedDate, { addSuffix: true });

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/dashboard/events");
  };

  return (
    <>
      <div
        className={cn(
          "grid grid-cols-1 gap-4 lg:gap-8 items-center min-h-[calc(100dvh-100px)]",
          hasCoords && "md:grid-cols-2",
        )}
      >
        <div className="w-full mx-auto max-w-lg">
          {(event.status === "cancelled" || event.status === "completed") && (
            <div
              role="status"
              className={cn(
                "mb-4 flex items-start gap-2 rounded-sm border px-3 py-2 text-sm",
                event.status === "cancelled"
                  ? "border-destructive/40 bg-destructive/10 text-destructive"
                  : "border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400",
              )}
            >
              {event.status === "cancelled" ? (
                <RiErrorWarningLine size={16} className="mt-0.5 shrink-0" />
              ) : (
                <RiCalendarCheckLine size={16} className="mt-0.5 shrink-0" />
              )}
              <span>
                {event.status === "cancelled"
                  ? "This event was cancelled."
                  : "This event has ended."}
              </span>
            </div>
          )}
          <div className="h-fit w-full max-w-lg overflow-hidden border shadow rounded-sm dark:bg-mainGray/20 border-gray-200 dark:border-mainGray/30">
            <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 p-4 pb-3">
              <h2 className="text-lg font-semibold tracking-tight text-mainBlack sm:text-xl dark:text-white">
                {event.title}
              </h2>
              <StatusBadge status={event.status} />
            </div>
            {event.featuredImage ? (
              <ImageBox
                src={event.featuredImage}
                width={761}
                height={350}
                alt={event.title}
                containerClassName="w-full h-[350px]"
                decoding="async"
              />
            ) : (
              <div
                aria-hidden="true"
                className="flex h-[220px] w-full items-center justify-center bg-muted/50 dark:bg-mainGray/20"
              >
                <Icon
                  size={56}
                  className="text-muted-foreground/40"
                  aria-hidden="true"
                />
              </div>
            )}
            <div className="space-y-4 border-y p-4">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  {typeConfig[event.eventType]?.label ?? "Other"}
                </li>
                <li className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <RiCalendarCheckLine
                    className="size-4 shrink-0"
                    aria-hidden="true"
                  />
                  <span>{formatEventDate(event.date)}</span>
                  {dateDistance && (
                    <span className="text-xs text-muted-foreground/80">
                      · {dateDistance}
                    </span>
                  )}
                </li>
                <li className="flex items-center gap-2">
                  <RiTimeLine className="size-4 shrink-0" aria-hidden="true" />
                  {formatEventTime(event.time)}
                </li>
              </ul>
              {hasCoords && event.location ? (
                <a
                  href="#event-map"
                  title={event.location}
                  className="group flex items-start gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <RiMapPinLine
                    className="mt-0.5 size-4 shrink-0"
                    aria-hidden="true"
                  />
                  <span className="truncate underline-offset-2 group-hover:underline">
                    {event.location}
                  </span>
                </a>
              ) : (
                <p
                  title={event.location || undefined}
                  className="flex items-start gap-2 truncate text-sm text-muted-foreground"
                >
                  <RiMapPinLine
                    className="mt-0.5 size-4 shrink-0"
                    aria-hidden="true"
                  />
                  <span className="truncate">{event.location || "No location"}</span>
                </p>
              )}
              {event.detail && (
                <p className="text-sm leading-relaxed whitespace-pre-line text-mainGray dark:text-muted-foreground">
                  {event.detail}
                </p>
              )}
              <div className="flex items-center justify-between gap-2">
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
                    Organized by {organizerName || "Unassigned"}
                  </span>
                </div>
                {interestedCount > 0 && (
                  <span className="shrink-0 text-xs font-medium text-muted-foreground">
                    {interestedCount} going
                    {spotsLeft !== null &&
                      (spotsLeft > 0 ? ` · ${spotsLeft} left` : " · Full")}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 p-4">
              <Button
                variant="outline"
                size="sm"
                onClick={goBack}
                className="gap-1.5"
              >
                <RiArrowLeftLine className="size-4" aria-hidden="true" />
                Back
              </Button>
              <div className="flex items-center gap-2">
                {currentUserId && canModerate && (
                  <InterestToggle event={event} currentUserId={currentUserId} />
                )}
                {isPermitted && <EditEvent event={event} members={members} />}
                {isPermitted && (
                  <>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="outline"
                            size="sm"
                            aria-label="More actions"
                          >
                            <RiMore2Fill
                              className="size-4"
                              aria-hidden="true"
                            />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end">
                        {canModerate && (
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setCancelOpen(true)}
                          >
                            <RiCloseCircleLine aria-hidden="true" />
                            Cancel event
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDeleteOpen(true)}
                        >
                          <RiDeleteBin3Line aria-hidden="true" />
                          Delete event
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    {canModerate && (
                      <CancelEvent
                        event={event}
                        open={cancelOpen}
                        onOpenChange={setCancelOpen}
                      />
                    )}
                    <DeleteEvent
                      event={event}
                      open={deleteOpen}
                      onOpenChange={setDeleteOpen}
                    />
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        {(hasCoords || isPermitted) && (
          <div
            className={cn(
              "mx-auto w-full space-y-4",
              hasCoords ? "max-w-lg" : "max-w-none",
            )}
          >
            {hasCoords && (
              <PageSection index={1} className="w-full max-w-lg mx-auto">
                <div id="event-map" className="scroll-mt-24">
                  <MapLocation location={event.location} title={"Locate event"} />
                </div>
              </PageSection>
            )}
            {isPermitted && <CheckInPanel event={event} />}
          </div>
        )}
      </div>
    </>
  );
}
