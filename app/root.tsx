import fontCssUrlInter from "@fontsource-variable/inter/wght.css?url";
import fontCssUrl from "@fontsource-variable/manrope/wght.css?url";
import {
	RiArrowGoBackFill,
	RiErrorWarningLine,
	RiHome6Line,
	RiLoopRightFill,
	RiSearchEyeLine,
} from "@remixicon/react";
import * as Sentry from "@sentry/react-router";
import {
	type DehydratedState,
	HydrationBoundary,
	QueryClientProvider,
} from "@tanstack/react-query";
import { Analytics } from "@vercel/analytics/react";
import { lazy, Suspense } from "react";
import {
	isRouteErrorResponse,
	Link,
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
	useMatches,
} from "react-router";
import type { Route } from "./+types/root";
import "./app.css";
import ProgressBar from "./components/provider/progress-bar";
import { ThemeProvider } from "./components/provider/theme";
import ToastProvider from "./components/provider/toast";
import { Button } from "./components/ui/button";
import { TooltipProvider } from "./components/ui/tooltip";
import { getQueryClientRsc } from "./lib/getQueryClient";
import { SITE_LOGO, SITE_NAME } from "./lib/seo";

const AiAssistant = lazy(() =>
	import("./components/ai/ai-assistant").then((m) => ({
		default: m.AiAssistant,
	})),
);
const ThemeToggle = lazy(() =>
	import("./components/provider/theme-toggle").then((m) => ({
		default: m.ThemeToggle,
	})),
);

export const links: Route.LinksFunction = () => [
	// Fonts are self-hosted via @fontsource (same-origin), so no third-party
	// preconnects are needed. Preload the font CSS to kick off parsing early.
	{
		rel: "preload",
		as: "style",
		href: fontCssUrl,
	},
	{
		rel: "stylesheet",
		href: fontCssUrl,
	},
	{
		rel: "preload",
		as: "style",
		href: fontCssUrlInter,
	},
	{
		rel: "stylesheet",
		href: fontCssUrlInter,
	},
	{
		rel: "icon",
		href: SITE_LOGO,
		sizes: "any",
	},
	{
		rel: "apple-touch-icon",
		href: SITE_LOGO,
	},
	{
		rel: "manifest",
		href: "/manifest.webmanifest",
	},
];

export const meta: Route.MetaFunction = () => [
	{ name: "theme-color", content: "#020617" },
	{ property: "og:site_name", content: SITE_NAME },
];

export function Layout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<script
					dangerouslySetInnerHTML={{
						__html: `try{var e="BCC007Theme",t=localStorage.getItem(e)||"system",n=window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.remove("light","dark"),document.documentElement.classList.add("dark"===t||"system"===t&&n?"dark":"light")}catch(e){}`,
					}}
				/>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<meta name="mobile-web-app-capable" content="yes" />
				<meta name="apple-mobile-web-app-status-bar-style" content="default" />
				<Meta />
				<Links />
			</head>
			<body>
				<ProgressBar />
				<ToastProvider />
				<TooltipProvider>
					<ThemeProvider defaultTheme="system" storageKey="BCC007Theme">
						{children}
					</ThemeProvider>
				</TooltipProvider>
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	);
}

export default function App() {
	const queryClient = getQueryClientRsc();
	const matches = useMatches();
	const dehydratedState = matches.reduce(
		(acc, match) => {
			const state = (match.loaderData as any)
				?.dehydratedState as DehydratedState;
			if (state) {
				return {
					...acc,
					queries: [...(acc?.queries || []), ...(state.queries || [])],
					mutations: [...(acc?.mutations || []), ...(state.mutations || [])],
				};
			}
			return acc;
		},
		{ queries: [], mutations: [] } as DehydratedState,
	);

	if (import.meta.env.DEV && dehydratedState.queries.length > 0) {
		console.log(
			"Global Hydration State merged for queries:",
			dehydratedState.queries.map((q) => q.queryKey),
		);
	}
	return (
		<>
			<Analytics />
			<QueryClientProvider client={queryClient}>
				<HydrationBoundary state={dehydratedState}>
					<Outlet />
					<Suspense fallback={null}>
						<ThemeToggle />
						<AiAssistant />
					</Suspense>
				</HydrationBoundary>
			</QueryClientProvider>
		</>
	);
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
	let is404 = false;
	let message = "Oops!";
	let details = "An unexpected error occurred.";
	let stack: string | undefined;

	if (isRouteErrorResponse(error)) {
		is404 = error.status === 404;
		message = is404 ? "Page not found" : `${error.status} ${error.statusText}`;
		details = is404
			? "The page you're looking for doesn't exist or has been moved."
			: error.statusText || details;
	} else if (error && error instanceof Error) {
		details = error.message;
		if (import.meta.env.DEV) {
			stack = error.stack;
		}
		Sentry.captureException(error);
	}

	return (
		<main className="relative min-h-dvh flex flex-col items-center justify-center px-4">
			{/* Background pattern */}
			<div className="absolute inset-0 z-0 opacity-50 h-full w-full bg-white dark:bg-bgDark bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff14_1px,transparent_1px),linear-gradient(to_bottom,#ffffff14_1px,transparent_1px)] bg-size-[6rem_4rem]" />

			<div className="relative z-10 flex flex-col items-center text-center max-w-lg">
				{/* Icon */}
				<div
					className={`mb-6 size-16 rounded-full flex items-center justify-center ${
						is404
							? "bg-mainBlue/10 dark:bg-darkBlue/10"
							: "bg-destructive/20 dark:bg-destructive/30"
					}`}
				>
					{is404 ? (
						<RiSearchEyeLine
							size={32}
							className="text-lightBlue dark:text-darkBlue"
						/>
					) : (
						<RiErrorWarningLine size={32} className="text-destructive" />
					)}
				</div>

				{/* Message */}
				<h1 className="mt-2 text-2xl font-bold tracking-tight text-mainDark dark:text-white">
					{message}
				</h1>
				<p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-sm">
					{details}
				</p>

				{/* Actions */}
				<div className="mt-8 flex items-center gap-3">
					<Link to="/">
						<Button
							variant="outline"
							className="rounded-sm border-border bg-white dark:bg-transparent hover:bg-muted"
						>
							<RiHome6Line size={16} />
							Go home
						</Button>
					</Link>
					{!is404 && (
						<Button
							variant="default"
							onClick={() => window.location.reload()}
							className="rounded-sm border border-mainBlue bg-white dark:bg-mainBlue text-mainBlack dark:text-white hover:bg-mainBlue hover:text-white hover:dark:bg-mainBlue/30"
						>
							<RiLoopRightFill size={16} />
							Try again
						</Button>
					)}
				</div>

				{/* Dev stack trace */}
				{stack && (
					<details className="mt-8 w-full text-left">
						<summary className="cursor-pointer text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors select-none">
							<span className="inline-flex items-center gap-1.5">
								<RiArrowGoBackFill size={12} className="rotate-90" />
								Stack trace
							</span>
						</summary>
						<pre className="mt-3 w-full max-h-72 overflow-auto rounded-md border border-border bg-card dark:bg-accentBlack/60 p-4 text-[11px] leading-relaxed text-muted-foreground">
							<code>{stack}</code>
						</pre>
					</details>
				)}
			</div>
		</main>
	);
}
