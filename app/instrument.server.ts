import * as Sentry from "@sentry/react-router";

Sentry.init({
	dsn: process.env.SENTRY_DSN,
	enabled: process.env.NODE_ENV === "production",
	environment: process.env.NODE_ENV || "production",
	tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
});
