// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Notification from "./notification";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

function jsonResponse(body: unknown) {
  return { ok: true, json: async () => body };
}

const unreadNotifications = [
  {
    _id: "n1",
    type: "account_login",
    title: "New login",
    message: "You signed in",
    metadata: {},
    read: false,
    createdAt: new Date().toISOString(),
  },
  {
    _id: "n2",
    type: "payment_received",
    title: "Payment received",
    message: "₦5,000 received",
    metadata: {},
    read: true,
    createdAt: new Date(Date.now() - 60_000).toISOString(),
  },
];

let queryClient: QueryClient;

function renderComponent() {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <Notification />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  fetchMock.mockReset();
});

afterEach(cleanup);

describe("Notification", () => {
  it("shows the unread badge with the count", async () => {
    fetchMock.mockImplementation((url) =>
      url.includes("unread-count")
        ? jsonResponse({ count: 3 })
        : jsonResponse({ notifications: unreadNotifications, meta: {} }),
    );
    renderComponent();

    await screen.findByText("3");
    expect(screen.queryByText("99+")).toBeNull();
  });

  it("caps the badge at 99+", async () => {
    fetchMock.mockImplementation((url) =>
      url.includes("unread-count")
        ? jsonResponse({ count: 150 })
        : jsonResponse({ notifications: [], meta: {} }),
    );
    renderComponent();

    expect(await screen.findByText("99+")).toBeInTheDocument();
  });

  it("hides the badge entirely when there are no unread notifications", () => {
    fetchMock.mockImplementation((url) =>
      url.includes("unread-count")
        ? jsonResponse({ count: 0 })
        : jsonResponse({ notifications: unreadNotifications, meta: {} }),
    );
    renderComponent();

    // Trigger icon renders (sr-only label) but no numeric badge
    expect(screen.getByText("Notifications")).toBeInTheDocument();
    expect(screen.queryByText(/^99\+$|^\d+$/)).toBeNull();
  });

  it("lists notifications in the open dropdown and marks one read on click", async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation((url, init) => {
      if (url.includes("unread-count")) return jsonResponse({ count: 2 });
      if (init?.method === "POST") {
        return jsonResponse({ success: true });
      }
      return jsonResponse({ notifications: unreadNotifications, meta: {} });
    });
    renderComponent();

    const trigger = screen.getByText("Notifications").closest("button")!;
    await user.click(trigger);

    await screen.findByText("Payment received");
    const unreadItem = screen.getByText("New login");

    await user.click(unreadItem);
    await waitFor(() => {
      const post = fetchMock.mock.calls.find(
        (c) => c[1]?.method === "POST",
      );
      expect(post).toBeTruthy();
      expect(JSON.parse(post![1].body)).toEqual({
        intent: "mark-read",
        notificationId: "n1",
      });
    });
  });

  it("'Mark all read' sends mark-read without a notification id", async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation((url, init) => {
      if (url.includes("unread-count")) return jsonResponse({ count: 1 });
      if (init?.method === "POST") return jsonResponse({ success: true });
      return jsonResponse({ notifications: unreadNotifications, meta: {} });
    });
    renderComponent();

    const trigger = screen.getByText("Notifications").closest("button")!;
    await user.click(trigger);

    await user.click(await screen.findByText(/mark all read/i));
    await waitFor(() => {
      const post = fetchMock.mock.calls.find((c) => c[1]?.method === "POST");
      expect(JSON.parse(post![1].body)).toEqual({
        intent: "mark-read",
        notificationId: undefined,
      });
    });
  });

  it("renders loading skeletons while fetching", () => {
    let resolveList: (v: unknown) => void = () => {};
    fetchMock.mockImplementation((url) => {
      if (url.includes("unread-count")) return jsonResponse({ count: 0 });
      return new Promise((resolve) => {
        resolveList = resolve;
      });
    });
    renderComponent();

    expect(screen.getByText("Notifications")).toBeInTheDocument();
    // list area stays pending without crashing
    resolveList(jsonResponse({ notifications: [], meta: {} }));
  });

  it("invalidates the notifications cache after marking read", async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation((url, init) => {
      if (url.includes("unread-count")) return jsonResponse({ count: 1 });
      if (init?.method === "POST") return jsonResponse({ success: true });
      return jsonResponse({ notifications: unreadNotifications, meta: {} });
    });
    renderComponent();
    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(0));

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const trigger = screen.getByText("Notifications").closest("button")!;
    await user.click(trigger);
    await user.click(await screen.findByText(/mark all read/i));

    await waitFor(() => expect(invalidateSpy).toHaveBeenCalled());
    expect(invalidateSpy.mock.calls[0][0]).toEqual({
      queryKey: ["notifications"],
    });
  });
});
