import { Outlet } from "react-router";
import Footer from "~/components/navigation/footer";
import HomeNav from "~/components/navigation/home-nav";
import { sessionMiddleware, userContext } from "~/middleware/auth.middleware";
import type { SessionUser } from "~/types";
import type { Route } from "./+types/_layout";

export const middleware = [sessionMiddleware];

export async function loader({ context }: Route.LoaderArgs) {
  const user = context.get(userContext);
  return { user };
}

export default function HomeLayout({ loaderData }: Route.ComponentProps) {
  const { user } = loaderData as { user: SessionUser | null }
  return (
    <>
      <HomeNav user={user} /> 
      <Outlet context={{ user }} />
      <Footer />
    </>
  );
}
