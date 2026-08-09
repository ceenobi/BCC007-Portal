import type { MiddlewareFunction, RouterContextProvider } from "react-router";
import { createContext, redirect } from "react-router";
import type { Permission } from "~/lib/constants";
import { hasPermission } from "~/lib/rbac";
import type { SessionUser } from "~/types";

export const userContext = createContext<SessionUser | null>(null);
export const cookieContext = createContext<string>("");

function toSessionUser(user: {
  id: string;
  [key: string]: unknown;
}): SessionUser {
  const { id, ...rest } = user;
  return { _id: id, ...rest } as unknown as SessionUser;
}


export const guestOnlyMiddleware: MiddlewareFunction = async (
  { request },
  next,
) => {
  const { pathname } = new URL(request.url);
  const normalizedPath = pathname.replace(/\.data$/, "");
  // verify-email needs the authenticated session user, so it is NOT guest-only.
  if (normalizedPath === "/auth/verify-email") {
    return await next();
  }
  const { getSession } = await import("~/.server/actions/auth");
  const session = await getSession(request);
  if (session) {
    return redirect("/");
  }
  return await next();
};


export const authenticatedMiddleware: MiddlewareFunction = async (
  { request, context },
  next,
) => {
  const { getSession } = await import("~/.server/actions/auth");
  const session = await getSession(request);

  if (!session) {
    return redirect("/auth/login");
  }

  const { user } = session;
  const { pathname } = new URL(request.url);
  const normalizedPath = pathname.replace(/\.data$/, "");

  // 1. Email Verification Check
  if (!user?.emailVerified && normalizedPath !== "/auth/verify-email") {
    return redirect("/auth/verify-email");
  }

  // 2. Onboarding Check
  const isOnboardingRoute = normalizedPath.startsWith("/onboarding");
  if (user.emailVerified && !user.isOnboarded && !isOnboardingRoute) {
    return redirect("/onboarding");
  }
  context.set(userContext, toSessionUser(user));
  context.set(cookieContext, request.headers.get("Cookie") || "");

  return await next();
};


export const sessionMiddleware: MiddlewareFunction = async (
  { request, context },
  next,
) => {
  const { getSession } = await import("~/.server/actions/auth");
  const session = await getSession(request);
  if (session) {
    // better-auth returns id, but SessionUser uses _id (MongoDB convention)
    context.set(userContext, toSessionUser(session.user));
    context.set(cookieContext, request.headers.get("Cookie") || "");
  }
  return await next();
};

/**
 * Middleware factory for permission-based route guards.
 * Throws a 403 Forbidden Response if the user does not have the required permission.
 * Designed to be used in the middleware array: `export const middleware = [requirePermission("MANAGE_COHORTS")]`
 *
 * Requires `authenticatedMiddleware` to have run first so `userContext` is populated.
 *
 * @param scope - Optional. Restrict to `"action"` (POST/PUT/PATCH/DELETE) or `"loader"` (GET) only.
 */
export function requirePermission(
  permission: Permission,
  scope?: "action" | "loader",
) {
  return async function permissionMiddleware(
    {
      request,
      context,
    }: { request: Request; context: Readonly<RouterContextProvider> },
    next: () => Promise<Response>,
  ) {
    if (scope) {
      const isAction = !["GET", "HEAD"].includes(request.method);
      if (scope === "action" && !isAction) return await next();
      if (scope === "loader" && isAction) return await next();
    }

    const user = context.get(userContext);

    if (!user || !hasPermission(user.role, permission)) {
      throw Response.json(
        {
          success: false,
          message: `Access denied. Requires '${permission}' permission.`,
        },
        { status: 403 },
      );
    }
    return await next();
  };
}
