import {
  RiCalendarCheckLine,
  RiMapPinLine,
  RiTimeLine,
} from "@remixicon/react";
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
  const title = event ? `Edit Event - ${event.title}` : "Event";

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

  return (
    <>
      <div
        className={cn(
          "grid grid-cols-1 gap-4 lg:gap-8 items-center min-h-[calc(100dvh-100px)] overflow-hidden",
          event.longitude && event.latitude && "md:grid-cols-2",
        )}
      >
        <div className="w-full h-fit max-w-lg mx-auto border shadow rounded-sm dark:bg-mainGray/20 border-gray-200 dark:border-mainGray/30">
          <div className="p-4">
            <h2 className="text-base font-medium text-mainBlack dark:text-white">
              Event - {event.title}
            </h2>
            <StatusBadge status={event.status} />
          </div>
          {event.featuredImage && (
            <ImageBox
              src={event.featuredImage}
              width={761}
              height={350}
              alt={event.title}
              containerClassName="w-full h-[350px]"
              decoding="async"
            />
          )}
          <div className="border-t border-b p-4 space-y-4 hover:shadow">
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
            <p className="mt-0.5 flex items-center gap-1 truncate text-sm text-muted-foreground">
              <RiMapPinLine className="size-3.5" aria-hidden="true" />
              <span className="truncate">
                {event.location || "No location"}
              </span>
            </p>
            <p className=" text-mainGray dark:text-muted-foreground text-sm">
              {event.detail}
            </p>
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
          </div>
          <div className="p-4 flex justify-between gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/dashboard/events")}
            >
              Back
            </Button>
            <div className="flex gap-2 items-center">
              {currentUserId &&
                (event.status === "upcoming" ||
                  event.status === "ongoing") && (
                  <InterestToggle event={event} currentUserId={currentUserId} />
                )}
              {isPermitted && (
                <>
                  {(event.status === "upcoming" ||
                    event.status === "ongoing") && <CancelEvent event={event} />}
                  <DeleteEvent event={event} />
                  <EditEvent event={event} members={members} />
                </>
              )}
            </div>
          </div>
        </div>
        {event.longitude && event.latitude && (
          <PageSection index={1} className="w-full max-w-lg mx-auto">
            <MapLocation location={event.location} title={"Locate event"} />
          </PageSection>
        )}
      </div>
      {isPermitted && <CheckInPanel event={event} />}
    </>
  );
}
