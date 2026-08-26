// @vitest-environment happy-dom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Sessions from "./sessions";

const mockSubmit = vi.fn();
type MockFetcher = { state: string; data: unknown; submit: typeof mockSubmit };
// SessionRow calls useFetcher() once per row (two rows here). Return one
// STABLE fetcher per row slot so state survives re-renders.
const rowFetchers: MockFetcher[] = [
  { state: "idle", data: undefined, submit: mockSubmit },
  { state: "idle", data: undefined, submit: mockSubmit },
];
let fetcherCallCount = 0;

vi.mock("react-router", () => ({
  useFetcher: () => rowFetchers[fetcherCallCount++ % rowFetchers.length],
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { toast } from "sonner";

const sessions = [
  {
    id: "s1",
    token: "tok-current",
    userAgent: "MacBook Chrome",
    ipAddress: "1.2.3.4",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "s2",
    token: "tok-other",
    userAgent: "Windows Firefox",
    ipAddress: "5.6.7.8",
    updatedAt: new Date().toISOString(),
  },
];

beforeEach(() => {
  fetcherCallCount = 0;
  for (const f of rowFetchers) {
    f.state = "idle";
    f.data = undefined;
  }
  vi.mocked(toast.success).mockClear();
  vi.mocked(toast.error).mockClear();
  mockSubmit.mockClear();
});

afterEach(cleanup);

describe("Sessions", () => {
  it("renders every session with device and IP, flagging the current one", () => {
    render(<Sessions sessions={sessions} currentSessionId="s1" />);

    expect(screen.getByText("MacBook Chrome")).toBeInTheDocument();
    expect(screen.getByText("Windows Firefox")).toBeInTheDocument();
    expect(screen.getByText("Current")).toBeInTheDocument();
    expect(screen.getAllByText("1.2.3.4").length).toBeGreaterThan(0);
  });

  it("does not offer revoke for the current session but does for others", () => {
    render(<Sessions sessions={sessions} currentSessionId="s1" />);

    const revokeButtons = screen.getAllByRole("button", { name: /revoke/i });
    expect(revokeButtons).toHaveLength(1);
  });

  it("submits revoke-session intent with the session token on click", async () => {
    const user = userEvent.setup();
    render(<Sessions sessions={sessions} currentSessionId="s1" />);

    await user.click(screen.getByRole("button", { name: /revoke/i }));

    expect(mockSubmit).toHaveBeenCalledWith(
      { intent: "revoke-session", token: "tok-other" },
      expect.objectContaining({ method: "post" }),
    );
  });

  it("shows a success toast when revocation succeeds", async () => {
    const view = render(<Sessions sessions={sessions} currentSessionId="s1" />);
    // One stable fetcher per row; the revoked session (s2) is the second row.
    expect(rowFetchers[1].data).toBeUndefined();
    rowFetchers[1].data = { success: true, message: "Session revoked" };
    view.rerender(<Sessions sessions={sessions} currentSessionId="s1" />);

    // Only the revoked row's fetcher resolved — exactly one toast.
    await waitFor(() => expect(toast.success).toHaveBeenCalledTimes(1));
    expect(toast.success).toHaveBeenCalledWith("Session revoked");
  });

  it("shows an inline AlertBox error when revocation fails", async () => {
    const view = render(<Sessions sessions={sessions} currentSessionId="s1" />);
    expect(rowFetchers[1].data).toBeUndefined();
    rowFetchers[1].data = { success: false, message: "Token expired" };
    view.rerender(<Sessions sessions={sessions} currentSessionId="s1" />);

    // Only the revoked row renders the alert — not one per row.
    await waitFor(() =>
      expect(screen.getAllByText("Token expired")).toHaveLength(1),
    );
    expect(toast.success).not.toHaveBeenCalled();
  });
});
