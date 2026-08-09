import { dehydrate } from "@tanstack/react-query";
import { Suspense } from "react";
import { Await, useOutletContext } from "react-router";
import { sendInviteCode, updateMemberRole } from "~/.server/actions/auth";
import { PageSection, PageWrapper } from "~/components/provider/page-wrapper";
import DataError from "~/components/ui/data-error";
import NotFound from "~/components/ui/not-found";
import Search from "~/components/ui/search";
import { MembersSkeleton } from "~/components/ui/skeleton-ui";
import { getQueryClientRsc } from "~/lib/getQueryClient";
import { hasPermission } from "~/lib/rbac";
import { requirePermission } from "~/middleware/auth.middleware";
import { getMembersQuery } from "~/queries/members";
import type { SendInviteCodeSchemaType, SessionUser } from "~/types";
import type { Route } from "./+types/route";
import InviteMember from "../../features/members/invite-member";
import MembersList from "../../features/members/members-list";

export const middleware = [requirePermission("MANAGE_MEMBERS", "action")];

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Members - Manage BCC007 Pay members" },
    {
      name: "description",
      content: "Members - Manage BCC007 Pay members",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const queryClient = getQueryClientRsc();
  const members = queryClient.ensureQueryData(getMembersQuery(request));
  return {
    dehydratedState: dehydrate(queryClient),
    members,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const payload = await request.json();
  if (payload.intent === "update-role") {
    return await updateMemberRole(request, payload);
  } else {
    return await sendInviteCode(request, payload as SendInviteCodeSchemaType);
  }
}

export default function Members({ loaderData }: Route.ComponentProps) {
  const { members } = loaderData;
  const { user } = useOutletContext() as { user: SessionUser };
  const isPermitted = hasPermission(user.role, "MANAGE_MEMBERS");
 
  return (
    <PageWrapper>
      <PageSection index={0} className="space-y-8 px-4 xl:px-8">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight leading-tight text-foreground">
            Members
          </h1>
          <p className="leading-snug text-sm text-mainGray dark:text-muted-foreground">
            Current members and their roles.
          </p>
        </div>
        <div className="flex justify-between items-center">
          <Search
            id="search-members"
            placeholder="Search members..."
            classname="w-fit"
          />
          {isPermitted && <InviteMember />}
        </div>
      </PageSection>
      <PageSection index={1} className="mt-4 space-y-4 px-4 xl:px-8">
        <Suspense fallback={<MembersSkeleton />}>
          <Await resolve={members} errorElement={<DataError />}>
            {(resolvedMembers) => (
              <>
                {resolvedMembers?.members.length === 0 ? (
                  <NotFound
                    title="No members found"
                    message="Members have not been added yet. Come back later."
                  />
                ) : (
                  <MembersList members={resolvedMembers} />
                )}
              </>
            )}
          </Await>
        </Suspense>
      </PageSection>
    </PageWrapper>
  );
}
