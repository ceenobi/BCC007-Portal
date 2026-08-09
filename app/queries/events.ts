import { getEvent, getEvents} from "~/.server/actions/event-data";
import type { EventData, UsePaginateProps } from "~/types";
export type EventQueryResult = {
  events: EventData[];
  meta: UsePaginateProps;
};

export const getEventsQuery = (request: Request) => {
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page")) || 1;
  const limit = Number(url.searchParams.get("limit")) || 10;
  const query = url.searchParams.get("query") || undefined;
  const status = url.searchParams.get("status") || undefined;
  const eventType = url.searchParams.get("eventType") || undefined;
  const startDate = url.searchParams.get("startDate") || undefined;
  const endDate = url.searchParams.get("endDate") || undefined;
  return {
    queryKey: [
      "events",
      page,
      limit,
      query,
      status,
      eventType,
      startDate,
      endDate,
    ],
    queryFn: async () => {
      const response = await getEvents({
        request,
        page,
        limit,
        query,
        status,
        eventType,
        startDate,
        endDate,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to fetch events");
      }
      const data = await response.json();
      return data.body as EventQueryResult;
    },
  };
};

export const getEventQuery = (request: Request, eventId: string) => {
  return {
    queryKey: ["event", eventId],
    queryFn: async () => {
      const response = await getEvent(request, { eventId });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to fetch event");
      }
      const data = await response.json();
      return data.body as EventData;
    },
  };
};


