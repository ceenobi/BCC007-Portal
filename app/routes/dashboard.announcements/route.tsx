import { dehydrate } from "@tanstack/react-query";
import { Suspense } from "react";
import { Await, useOutletContext } from "react-router";
import {
    createAnnouncement,
    deleteAnnouncement,
    updateAnnouncement,
} from "~/.server/actions/announcement-data";
import { PageSection, PageWrapper } from "~/components/provider/page-wrapper";
import DataError from "~/components/ui/data-error";
import NotFound from "~/components/ui/not-found";
import Search from "~/components/ui/search";
import { getQueryClientRsc } from "~/lib/getQueryClient";
import { hasPermission } from "~/lib/rbac";
import { requirePermission } from "~/middleware/auth.middleware";
import { getAnnouncementsQuery } from "~/queries/announcements";
import type {
    CreateAnnouncementSchemaType,
    SessionUser,
    UpdateAnnouncementSchemaType,
} from "~/types";
import AnnouncementsList from "../../features/announcements/announcements-list";
import AnnouncementsSkeleton from "../../features/announcements/announcements-skeleton";
import CreateAnnouncement from "../../features/announcements/create-announcement";
import Filter from "../../features/announcements/filter";
import type { Route } from "./+types/route";

export const middleware = [requirePermission("MANAGE_ANNOUNCEMENTS", "action")];

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "Announcements - Manage BCC007 Team announcements" },
    {
      name: "description",
      content: "Announcements - Manage BCC007 Team announcements",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const queryClient = getQueryClientRsc();
  const announcements = queryClient.ensureQueryData(getAnnouncementsQuery(request));
  return {
    dehydratedState: dehydrate(queryClient),
    announcements,
  };
}

export async function action({ request }: Route.ActionArgs) {
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
  if (payload.intent === "create-announcement") {
    return await createAnnouncement(
      request,
      payload as unknown as CreateAnnouncementSchemaType,
    );
  }
  if (payload.intent === "update-announcement") {
    return await updateAnnouncement(
      request,
      payload as unknown as UpdateAnnouncementSchemaType & {
        announcementId?: string;
      },
    );
  }
  if (payload.intent === "delete-announcement") {
    return await deleteAnnouncement(request, {
      announcementId: payload.announcementId as string,
    });
  }
  return Response.json(
    { success: false, message: "Invalid request" },
    { status: 400 },
  );
}

export default function Announcements({ loaderData }: Route.ComponentProps) {
  const { announcements } = loaderData;
  const { user } = useOutletContext() as { user: SessionUser };
  const isPermitted = hasPermission(user.role, "MANAGE_ANNOUNCEMENTS");

  return (
    <PageWrapper>
      <PageSection index={0} className="space-y-8 px-4 xl:px-8">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight leading-tight text-foreground">
            Announcements
          </h1>
          <p className="leading-snug text-sm text-mainGray dark:text-muted-foreground">
            Broadcast messages to all group members.
          </p>
        </div>
        <div className="flex justify-between items-center gap-4">
          <Search
            id="search-announcements"
            placeholder="Search announcements..."
            classname="w-fit"
          />
          <div className="flex items-center gap-2">
            <Filter />
            {isPermitted && <CreateAnnouncement />}
          </div>
        </div>
      </PageSection>
      <PageSection index={1} className="mt-4 space-y-4 px-4 xl:px-8">
        <Suspense fallback={<AnnouncementsSkeleton />}>
          <Await resolve={announcements} errorElement={<DataError />}>
            {(resolvedAnnouncements) => (
              <>
                {resolvedAnnouncements?.announcements.length === 0 ? (
                  <NotFound
                    title="No announcements found"
                    message="Announcements have not been added yet. Come back later."
                  />
                ) : (
                  <AnnouncementsList
                    announcements={resolvedAnnouncements}
                    canManage={isPermitted}
                  />
                )}
              </>
            )}
          </Await>
        </Suspense>
      </PageSection>
    </PageWrapper>
  );
}
