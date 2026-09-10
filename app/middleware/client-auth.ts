import { createContext, redirect } from "react-router";
import type {
	DataStrategyResult,
	RouterContextProvider,
} from "react-router";
import type { Permission } from "~/lib/constants";
import { hasPermission } from "~/lib/rbac";
import type { SessionUser } from "~/types";

export const userContext = createContext<SessionUser | null>(null);

/**
 * Mirrors the server `MiddlewareNextFunction<Record<string, DataStrategyResult>>`
 * that React Router passes to client middleware. Client middleware always
 * resolves the matched data strategy results (data or thrown error per route).
 */
type ClientNext = () => Promise<Record<string, DataStrategyResult>>;

/**
 * Tri-state authenticated-user cache seeded from the dashboard layout loader:
 * - `undefined` (unseeded) — the middleware has no client-side signal, so it
 *   defers to the real server guards and passes through.
 * - `SessionUser` — the user is known to be signed in.
 * - `null` — the user is known to be signed out.
 */
let authCache: SessionUser | null | undefined = undefined;

export function seedAuthCache(user: SessionUser | null) {
	authCache = user;
}

export function getAuthCache() {
	return authCache;
}

export function clearAuthCache() {
	authCache = undefined;
}

/**
 * Client-side only UX fast-path for guest-only routes. Real access control
 * remains on the server (`guestOnlyMiddleware`). Only throws optimistic
 * redirects; never blocks when the cache is unseeded.
 */
export const clientGuestOnlyMiddleware = async (
	{
		request,
	}: {
		request: Request;
		context: Readonly<RouterContextProvider>;
	},
	next: ClientNext,
): Promise<Record<string, DataStrategyResult> | void> => {
	const { pathname } = new URL(request.url);
	const normalizedPath = pathname.replace(/\.data$/, "");
	// verify-email needs the authenticated session user, so it is NOT guest-only.
	if (normalizedPath === "/auth/verify-email") {
		return await next();
	}
	if (getAuthCache() != null) {
		throw redirect("/");
	}
	return await next();
};

/**
 * Client-side only UX fast-path for authenticated routes, mirroring the server
 * `authenticatedMiddleware`. When the seeded cache proves sign-in state it
 * optimistically redirects; otherwise it passes through and trusts the server.
 * Sets `userContext` so downstream middleware/loaders can read the user.
 */
export const clientAuthenticatedMiddleware = async (
	{
		request,
		context,
	}: {
		request: Request;
		context: Readonly<RouterContextProvider>;
	},
	next: ClientNext,
): Promise<Record<string, DataStrategyResult> | void> => {
	const user = getAuthCache();

	// Unseeded — trust the server guards.
	if (user === undefined) {
		return await next();
	}

	// Seeded with signed-out — the dashboard server loader will already have
	// redirected to login on the document request, so this only fires on
	// client navigations where the cache is authoritative.
	if (user === null) {
		throw redirect("/auth/login");
	}

	const { pathname } = new URL(request.url);
	const normalizedPath = pathname.replace(/\.data$/, "");

	// 1. Email Verification Check
	if (!user.emailVerified && normalizedPath !== "/auth/verify-email") {
		throw redirect("/auth/verify-email");
	}

	// 2. Onboarding Check
	const isOnboardingRoute = normalizedPath.startsWith("/onboarding");
	if (user.emailVerified && !user.isOnboarded && !isOnboardingRoute) {
		throw redirect("/onboarding");
	}

	context.set(userContext, user);

	return await next();
};

/**
 * Client-side only permission guard factory, mirroring the server
 * `requirePermission`. UX-only: when the seeded cache lacks the permission it
 * throws an optimistic redirect; when unseeded it passes through and trusts
 * the server 403.
 *
 * @param scope - Optional. Restrict to `"action"` (POST/PUT/PATCH/DELETE) or `"loader"` (GET) only.
 */
export function clientRequirePermission(
	permission: Permission,
	scope?: "action" | "loader",
) {
	return async function permissionMiddleware(
		{
			request,
		}: {
			request: Request;
			context: Readonly<RouterContextProvider>;
		},
		next: ClientNext,
	): Promise<Record<string, DataStrategyResult> | void> {
		if (scope) {
			const isAction = !["GET", "HEAD"].includes(request.method);
			if (scope === "action" && !isAction) return await next();
			if (scope === "loader" && isAction) return await next();
		}

		const user = getAuthCache();

		// Unseeded or definitively signed-out — trust the server guards.
		if (user == null) {
			return await next();
		}

		if (!hasPermission(user.role, permission)) {
			throw redirect("/");
		}
		return await next();
	};
}