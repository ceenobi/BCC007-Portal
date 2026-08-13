import { getAnnouncements } from "~/.server/actions/announcement-data";
import type { AnnouncementData, UsePaginateProps } from "~/types";
export type AnnouncementQueryResult = {
  announcements: AnnouncementData[];
  meta: UsePaginateProps;
};

export const getAnnouncementsQuery = (request: Request) => {
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page")) || 1;
  const limit = Number(url.searchParams.get("limit")) || 10;
  const query = url.searchParams.get("query") || undefined;
  const status = url.searchParams.get("status") || undefined;
  return {
    queryKey: ["announcements", page, limit, query, status],
    queryFn: async () => {
      const response = await getAnnouncements({
        request,
        page,
        limit,
        query,
        status,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to fetch announcements");
      }
      const data = await response.json();
      return data.body as AnnouncementQueryResult;
    },
  };
};
