import { Outlet } from "react-router";
import { completeTour } from "~/.server/actions/tour";
import Navbar from "~/components/navigation/navbar";
import Sidebar from "~/components/navigation/sidebar";
import { TourProvider } from "~/components/provider/tour";
import useSidebar from "~/hooks/useSidebar";
import {
  authenticatedMiddleware,
  userContext,
} from "~/middleware/auth.middleware";
import type { Route } from "./+types/route";
export const middleware = [authenticatedMiddleware];
const SIDEBAR_COOKIE = "sbarBcc007";

export async function loader({ context, request }: Route.LoaderArgs) {
  const user = context.get(userContext);
  const sidebarCookie = request.headers
    .get("cookie")
    ?.split(";")
    .find((c) => c.trim().startsWith(`${SIDEBAR_COOKIE}=`));
  const sidebarOpen = sidebarCookie
    ? decodeURIComponent(sidebarCookie.split("=")[1]) === "true"
    : false;
  if (!user) {
    throw Response.json(
      {
        success: false,
        message: "Unauthorized",
      },
      { status: 401 },
    );
  }
  return { user, sidebarOpen };
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
  if (payload.intent === "tour-complete") {
    return await completeTour(request);
  }
  return Response.json(
    { success: false, message: "Invalid request" },
    { status: 400 },
  );
}

export default function DashboardLayout({ loaderData }: Route.ComponentProps) {
  const { user, sidebarOpen } = loaderData;
  const { isOpenSidebar, setIsOpenSidebar } = useSidebar(sidebarOpen);

  return (
    <TourProvider user={user}>
      <Navbar user={user} />
      <>
        <Sidebar
          isOpenSidebar={isOpenSidebar}
          setIsOpenSidebar={setIsOpenSidebar}
          user={user}
        />
        <main className={`${isOpenSidebar ? "lg:ml-50" : "lg:ml-12"}`}>
          <Outlet context={{ user }} />
        </main>
      </>
    </TourProvider>
  );
}
