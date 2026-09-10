import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("~/.server/utils/health", () => ({
	getHealthStatus: vi.fn(),
}));

vi.mock("~/.server/services/better-auth", () => ({
	auth: { api: { getSession: vi.fn() } },
}));

vi.mock("~/.server/actions/global-search", () => ({
	globalSearch: vi.fn(),
}));

vi.mock("~/.server/actions/bank-data", () => ({
	resolveBankAccount: vi.fn(),
}));

vi.mock("~/.server/services/notification.service", () => ({
	NotificationService: {
		getUnreadCount: vi.fn(),
		getNotifications: vi.fn(),
		markAsRead: vi.fn(),
	},
}));

vi.mock("~/.server/services/paystack.service", () => ({
	PaystackService: {
		verifyWebhookSignature: vi.fn(),
		handleWebhook: vi.fn(),
	},
}));

vi.mock("~/.server/actions/payment", () => ({
	getUserPayments: vi.fn(),
	getGroupPayments: vi.fn(),
	getUserPaymentReports: vi.fn(),
	getGroupPaymentReports: vi.fn(),
}));

vi.mock("~/.server/actions/announcement-data", () => ({
	getAnnouncements: vi.fn(),
}));

vi.mock("~/.server/actions/event-data", () => ({
	getUpcomingEvents: vi.fn(),
}));

import { getAnnouncements } from "~/.server/actions/announcement-data";
import { resolveBankAccount } from "~/.server/actions/bank-data";
import { getUpcomingEvents } from "~/.server/actions/event-data";
import { globalSearch } from "~/.server/actions/global-search";
import {
	getGroupPaymentReports,
	getGroupPayments,
	getUserPaymentReports,
	getUserPayments,
} from "~/.server/actions/payment";
import { auth } from "~/.server/services/better-auth";
import { NotificationService } from "~/.server/services/notification.service";
import { PaystackService } from "~/.server/services/paystack.service";
import { getHealthStatus } from "~/.server/utils/health";
import { action as resolveAction } from "~/routes/api.banks.resolve";
import { action as globalSearchAction } from "~/routes/api.global-search";
import { loader as healthLoader } from "~/routes/api.health";
import {
	action as notificationsAction,
	loader as notificationsLoader,
} from "~/routes/api.notifications.$";
import { action as webhookAction } from "~/routes/api.paystack.webhook";
import { loader as paymentUserLoader } from "~/routes/api.payment.user.get";
import { loader as paymentGroupLoader } from "~/routes/api.payment.group.get";
import { loader as paymentUserReportLoader } from "~/routes/api.payment.user.report.get";
import { loader as paymentGroupReportLoader } from "~/routes/api.payment.group.report.get";
import { loader as announcementLoader } from "~/routes/api.announcement.get";
import { loader as upcomingEventsLoader } from "~/routes/api.event.upcoming.get";

const getSessionMock = vi.mocked(auth.api.getSession);
const getHealthStatusMock = vi.mocked(getHealthStatus);
const globalSearchMock = vi.mocked(globalSearch);
const resolveBankAccountMock = vi.mocked(resolveBankAccount);
const getUserPaymentsMock = vi.mocked(getUserPayments);
const getGroupPaymentsMock = vi.mocked(getGroupPayments);
const getUserPaymentReportsMock = vi.mocked(getUserPaymentReports);
const getGroupPaymentReportsMock = vi.mocked(getGroupPaymentReports);
const getAnnouncementsMock = vi.mocked(getAnnouncements);
const getUpcomingEventsMock = vi.mocked(getUpcomingEvents);

const session = () => ({
	user: { id: "u1", name: "Ada", email: "ada@example.com" },
});

const post = (url: string, body?: unknown) =>
	new Request(url, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: body === undefined ? undefined : JSON.stringify(body),
	});

describe("GET /api/health (api.health loader)", () => {
	afterEach(() => vi.clearAllMocks());

	it("returns 200 when health is ok", async () => {
		getHealthStatusMock.mockResolvedValue({
			status: "ok",
			timestamp: new Date().toISOString(),
			uptime: 1,
			environment: "test",
			memory: { rss: 1, heapUsed: 1, heapTotal: 1 },
			checks: {
				database: { status: "ok", state: "connected" },
				redis: { status: "ok", ping: "PONG" },
			},
		} as never);
		const res = await healthLoader({
			request: new Request("http://localhost/api/health"),
		} as never);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.status).toBe("ok");
	});

	it("returns 503 when health is down", async () => {
		getHealthStatusMock.mockResolvedValue({
			status: "down",
			timestamp: new Date().toISOString(),
			uptime: 1,
			environment: "test",
			memory: { rss: 1, heapUsed: 1, heapTotal: 1 },
			checks: {
				database: { status: "down", state: "disconnected" },
				redis: { status: "down", ping: null },
			},
		} as never);
		const res = await healthLoader({
			request: new Request("http://localhost/api/health"),
		} as never);
		expect(res.status).toBe(503);
	});
});

describe("POST /api/global-search (api.global-search action)", () => {
	afterEach(() => vi.clearAllMocks());

	it("rejects non-POST methods with 405", async () => {
		const res = await globalSearchAction({
			request: new Request("http://localhost/api/global-search", {
				method: "GET",
			}),
		} as never);
		expect(res.status).toBe(405);
	});

	it("rejects invalid JSON with 400", async () => {
		const res = await globalSearchAction({
			request: new Request("http://localhost/api/global-search", {
				method: "POST",
				body: "not-json",
			}),
		} as never);
		expect(res.status).toBe(400);
	});

	it("delegates the query to globalSearch", async () => {
		globalSearchMock.mockResolvedValue(
			Response.json({ success: true, body: { query: "ada", sections: [] } }),
		);
		const res = await globalSearchAction({
			request: post("http://localhost/api/global-search", { query: "ada" }),
		} as never);
		expect(res.status).toBe(200);
		expect(globalSearchMock).toHaveBeenCalledWith(expect.any(Request), {
			query: "ada",
		});
	});
});

describe("POST /api/banks/resolve (api.banks.resolve action)", () => {
	afterEach(() => vi.clearAllMocks());

	it("rejects non-POST methods with 405", async () => {
		const res = await resolveAction({
			request: new Request("http://localhost/api/banks/resolve"),
		} as never);
		expect(res.status).toBe(405);
	});

	it("rejects an invalid account number with 400", async () => {
		const res = await resolveAction({
			request: post("http://localhost/api/banks/resolve", {
				accountNumber: "123",
				bankCode: "",
			}),
		} as never);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.success).toBe(false);
	});

	it("delegates a valid payload to resolveBankAccount", async () => {
		resolveBankAccountMock.mockResolvedValue(
			Response.json({ success: true, body: { accountName: "Ada" } }),
		);
		const res = await resolveAction({
			request: post("http://localhost/api/banks/resolve", {
				accountNumber: "0123456789",
				bankCode: "044",
			}),
		} as never);
		expect(res.status).toBe(200);
		expect(resolveBankAccountMock).toHaveBeenCalled();
	});
});

describe("GET /api/notifications/* (api.notifications.$ loader)", () => {
	afterEach(() => vi.clearAllMocks());

	it("returns 401 without a session", async () => {
		getSessionMock.mockResolvedValue(null as never);
		const res = await notificationsLoader({
			request: new Request("http://localhost/api/notifications"),
		} as never);
		expect(res.status).toBe(401);
	});

	it("returns the unread count for /unread-count", async () => {
		getSessionMock.mockResolvedValue(session() as never);
		vi.mocked(NotificationService.getUnreadCount).mockResolvedValue(3);
		const res = await notificationsLoader({
			request: new Request("http://localhost/api/notifications/unread-count"),
		} as never);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.count).toBe(3);
	});

	it("fetches paginated notifications with default page and limit", async () => {
		getSessionMock.mockResolvedValue(session() as never);
		vi.mocked(NotificationService.getNotifications).mockResolvedValue({
			notifications: [],
			total: 0,
			page: 1,
			limit: 20,
			totalPages: 0,
		} as never);
		const res = await notificationsLoader({
			request: new Request("http://localhost/api/notifications"),
		} as never);
		expect(res.status).toBe(200);
		expect(NotificationService.getNotifications).toHaveBeenCalledWith(
			"u1",
			1,
			20,
		);
	});
});

describe("POST /api/notifications (api.notifications.$ action)", () => {
	afterEach(() => vi.clearAllMocks());

	it("returns 401 without a session", async () => {
		getSessionMock.mockResolvedValue(null as never);
		const res = await notificationsAction({
			request: post("http://localhost/api/notifications", {
				intent: "mark-read",
			}),
		} as never);
		expect(res.status).toBe(401);
	});

	it("marks a notification as read", async () => {
		getSessionMock.mockResolvedValue(session() as never);
		vi.mocked(NotificationService.markAsRead).mockResolvedValue(undefined);
		const res = await notificationsAction({
			request: post("http://localhost/api/notifications", {
				intent: "mark-read",
				notificationId: "n1",
			}),
		} as never);
		expect(res.status).toBe(200);
		expect(NotificationService.markAsRead).toHaveBeenCalledWith("u1", "n1");
	});

	it("rejects an unknown intent with 400", async () => {
		getSessionMock.mockResolvedValue(session() as never);
		const res = await notificationsAction({
			request: post("http://localhost/api/notifications", {
				intent: "delete-all",
			}),
		} as never);
		expect(res.status).toBe(400);
	});
});

describe("POST /api/paystack/webhook (api.paystack.webhook action)", () => {
	afterEach(() => vi.clearAllMocks());

	it("rejects non-POST methods with 405", async () => {
		const res = await webhookAction({
			request: new Request("http://localhost/api/paystack/webhook"),
		} as never);
		expect(res.status).toBe(405);
	});

	it("rejects a missing signature with 400", async () => {
		const res = await webhookAction({
			request: post("http://localhost/api/paystack/webhook", {
				event: "charge.success",
			}),
		} as never);
		expect(res.status).toBe(400);
	});

	it("rejects an invalid signature with 401", async () => {
		PaystackService.verifyWebhookSignature = vi.fn(() => false);
		const req = new Request("http://localhost/api/paystack/webhook", {
			method: "POST",
			headers: { "x-paystack-signature": "sig" },
			body: JSON.stringify({ event: "x" }),
		});
		const res = await webhookAction({ request: req } as never);
		expect(res.status).toBe(401);
	});

	it("returns 200 and handles the event when the signature is valid", async () => {
		PaystackService.verifyWebhookSignature = vi.fn(() => true);
		PaystackService.handleWebhook = vi.fn(async () => undefined);
		const req = new Request("http://localhost/api/paystack/webhook", {
			method: "POST",
			headers: { "x-paystack-signature": "sig" },
			body: JSON.stringify({ event: "charge.success", data: { id: 1 } }),
		});
		const res = await webhookAction({ request: req } as never);
		expect(res.status).toBe(200);
		expect(PaystackService.handleWebhook).toHaveBeenCalled();
	});
});

describe("GET /api/payment/user (api.payment.user.get loader)", () => {
	afterEach(() => vi.clearAllMocks());

	it("rejects non-GET methods with 405", async () => {
		const res = await paymentUserLoader({
			request: new Request("http://localhost/api/payment/user", {
				method: "POST",
			}),
		} as never);
		expect(res.status).toBe(405);
	});

	it("delegates with default page and limit when no params are given", async () => {
		getUserPaymentsMock.mockResolvedValue(
			Response.json({ success: true, message: "ok", body: {} }),
		);
		const req = new Request("http://localhost/api/payment/user");
		const res = await paymentUserLoader({ request: req } as never);
		expect(res.status).toBe(200);
		expect(getUserPaymentsMock).toHaveBeenCalledWith({
			request: req,
			page: 1,
			limit: 10,
			query: undefined,
			paymentStatus: undefined,
			paymentType: undefined,
			startDate: undefined,
			endDate: undefined,
		});
	});

	it("forwards query params to the delegate", async () => {
		getUserPaymentsMock.mockResolvedValue(
			Response.json({ success: true, message: "ok", body: {} }),
		);
		const req = new Request(
			"http://localhost/api/payment/user?page=2&limit=25&query=owo&paymentStatus=paid&paymentType=onetime&startDate=2024-01-01&endDate=2024-12-31",
		);
		const res = await paymentUserLoader({ request: req } as never);
		expect(res.status).toBe(200);
		expect(getUserPaymentsMock).toHaveBeenCalledWith({
			request: req,
			page: 2,
			limit: 25,
			query: "owo",
			paymentStatus: "paid",
			paymentType: "onetime",
			startDate: "2024-01-01",
			endDate: "2024-12-31",
		});
	});
});

describe("GET /api/payment/group (api.payment.group.get loader)", () => {
	afterEach(() => vi.clearAllMocks());

	it("rejects non-GET methods with 405", async () => {
		const res = await paymentGroupLoader({
			request: new Request("http://localhost/api/payment/group", {
				method: "POST",
			}),
		} as never);
		expect(res.status).toBe(405);
	});

	it("delegates with default page and limit when no params are given", async () => {
		getGroupPaymentsMock.mockResolvedValue(
			Response.json({ success: true, message: "ok", body: {} }),
		);
		const req = new Request("http://localhost/api/payment/group");
		const res = await paymentGroupLoader({ request: req } as never);
		expect(res.status).toBe(200);
		expect(getGroupPaymentsMock).toHaveBeenCalledWith({
			request: req,
			page: 1,
			limit: 10,
			query: undefined,
			paymentStatus: undefined,
			paymentType: undefined,
			startDate: undefined,
			endDate: undefined,
		});
	});

	it("forwards query params to the delegate", async () => {
		getGroupPaymentsMock.mockResolvedValue(
			Response.json({ success: true, message: "ok", body: {} }),
		);
		const req = new Request(
			"http://localhost/api/payment/group?page=2&limit=25&query=owo&paymentStatus=paid&paymentType=onetime&startDate=2024-01-01&endDate=2024-12-31",
		);
		const res = await paymentGroupLoader({ request: req } as never);
		expect(res.status).toBe(200);
		expect(getGroupPaymentsMock).toHaveBeenCalledWith({
			request: req,
			page: 2,
			limit: 25,
			query: "owo",
			paymentStatus: "paid",
			paymentType: "onetime",
			startDate: "2024-01-01",
			endDate: "2024-12-31",
		});
	});
});

describe("GET /api/payment/user/report (api.payment.user.report.get loader)", () => {
	afterEach(() => vi.clearAllMocks());

	it("rejects non-GET methods with 405", async () => {
		const res = await paymentUserReportLoader({
			request: new Request("http://localhost/api/payment/user/report", {
				method: "POST",
			}),
		} as never);
		expect(res.status).toBe(405);
	});

	it("delegates with undefined filters when no params are given", async () => {
		getUserPaymentReportsMock.mockResolvedValue(
			Response.json({ success: true, message: "ok", body: {} }),
		);
		const req = new Request("http://localhost/api/payment/user/report");
		const res = await paymentUserReportLoader({ request: req } as never);
		expect(res.status).toBe(200);
		expect(getUserPaymentReportsMock).toHaveBeenCalledWith({
			request: req,
			period: undefined,
			paymentStatus: undefined,
			paymentType: undefined,
		});
	});

	it("forwards query params to the delegate", async () => {
		getUserPaymentReportsMock.mockResolvedValue(
			Response.json({ success: true, message: "ok", body: {} }),
		);
		const req = new Request(
			"http://localhost/api/payment/user/report?period=monthly&paymentStatus=paid&paymentType=onetime",
		);
		const res = await paymentUserReportLoader({ request: req } as never);
		expect(res.status).toBe(200);
		expect(getUserPaymentReportsMock).toHaveBeenCalledWith({
			request: req,
			period: "monthly",
			paymentStatus: "paid",
			paymentType: "onetime",
		});
	});
});

describe("GET /api/payment/group/report (api.payment.group.report.get loader)", () => {
	afterEach(() => vi.clearAllMocks());

	it("rejects non-GET methods with 405", async () => {
		const res = await paymentGroupReportLoader({
			request: new Request("http://localhost/api/payment/group/report", {
				method: "POST",
			}),
		} as never);
		expect(res.status).toBe(405);
	});

	it("delegates with undefined filters when no params are given", async () => {
		getGroupPaymentReportsMock.mockResolvedValue(
			Response.json({ success: true, message: "ok", body: {} }),
		);
		const req = new Request("http://localhost/api/payment/group/report");
		const res = await paymentGroupReportLoader({ request: req } as never);
		expect(res.status).toBe(200);
		expect(getGroupPaymentReportsMock).toHaveBeenCalledWith({
			request: req,
			period: undefined,
			paymentStatus: undefined,
			paymentType: undefined,
		});
	});

	it("forwards query params to the delegate", async () => {
		getGroupPaymentReportsMock.mockResolvedValue(
			Response.json({ success: true, message: "ok", body: {} }),
		);
		const req = new Request(
			"http://localhost/api/payment/group/report?period=monthly&paymentStatus=paid&paymentType=onetime",
		);
		const res = await paymentGroupReportLoader({ request: req } as never);
		expect(res.status).toBe(200);
		expect(getGroupPaymentReportsMock).toHaveBeenCalledWith({
			request: req,
			period: "monthly",
			paymentStatus: "paid",
			paymentType: "onetime",
		});
	});
});

describe("GET /api/announcements (api.announcement.get loader)", () => {
	afterEach(() => vi.clearAllMocks());

	it("rejects non-GET methods with 405", async () => {
		const res = await announcementLoader({
			request: new Request("http://localhost/api/announcements", {
				method: "POST",
			}),
		} as never);
		expect(res.status).toBe(405);
	});

	it("delegates with default page and limit when no params are given", async () => {
		getAnnouncementsMock.mockResolvedValue(
			Response.json({ success: true, message: "ok", body: {} }),
		);
		const req = new Request("http://localhost/api/announcements");
		const res = await announcementLoader({ request: req } as never);
		expect(res.status).toBe(200);
		expect(getAnnouncementsMock).toHaveBeenCalledWith({
			request: req,
			page: 1,
			limit: 10,
			query: undefined,
			status: undefined,
		});
	});

	it("forwards query params to the delegate", async () => {
		getAnnouncementsMock.mockResolvedValue(
			Response.json({ success: true, message: "ok", body: {} }),
		);
		const req = new Request(
			"http://localhost/api/announcements?page=2&limit=25&query=owo&status=published",
		);
		const res = await announcementLoader({ request: req } as never);
		expect(res.status).toBe(200);
		expect(getAnnouncementsMock).toHaveBeenCalledWith({
			request: req,
			page: 2,
			limit: 25,
			query: "owo",
			status: "published",
		});
	});
});

describe("GET /api/events/upcoming (api.event.upcoming.get loader)", () => {
	afterEach(() => vi.clearAllMocks());

	it("rejects non-GET methods with 405", async () => {
		const res = await upcomingEventsLoader({
			request: new Request("http://localhost/api/events/upcoming", {
				method: "POST",
			}),
		} as never);
		expect(res.status).toBe(405);
	});

	it("delegates the request directly to getUpcomingEvents", async () => {
		getUpcomingEventsMock.mockResolvedValue(
			Response.json({ success: true, message: "ok", body: {} }),
		);
		const req = new Request("http://localhost/api/events/upcoming");
		const res = await upcomingEventsLoader({ request: req } as never);
		expect(res.status).toBe(200);
		expect(getUpcomingEventsMock).toHaveBeenCalledWith(req);
	});
});
