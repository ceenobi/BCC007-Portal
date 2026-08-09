import { getMembers } from "~/.server/actions/member";
import type { SessionUser, UsePaginateProps } from "~/types";

export type MembersQueryResult = {
  members: SessionUser[];
  meta: UsePaginateProps;
};

export const getMembersQuery = (request: Request) => {
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page")) || 1;
  const limit = Number(url.searchParams.get("limit")) || 10;
  const query = url.searchParams.get("query") || undefined;
  return {
    queryKey: ["members", page, limit, query],
    queryFn: async () => {
      const response = await getMembers({
        request,
        page,
        limit,
        query,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to fetch members");
      }
      const data = await response.json();
      return data.body as MembersQueryResult;
    },
  };
};
