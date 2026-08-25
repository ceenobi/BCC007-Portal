// @vitest-environment happy-dom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Sessions from "./sessions";

const mockSubmit = vi.fn();
let mockFetcher: {
  state: string;
  data: unknown;
  submit: typeof mockSubmit;
};

vi.mock("react-router", () => ({
  useFetcher: () => mockFetcher,
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
  mockFetcher = { state: "idle", data: undefined, submit: mockSubmit };
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
    let view = render(<Sessions sessions={sessions} currentSessionId="s1" />);
    // The hook is per-row; simulate the second row's fetcher resolving.
    mockFetcher.data = { success: true, message: "Session revoked" };
    view.rerender(<Sessions sessions={sessions} currentSessionId="s1" />);

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Session revoked"),
    );
  });

  it("shows an inline AlertBox error when revocation fails", async () => {
    let view = render(<Sessions sessions={sessions} currentSessionId="s1" />);
    mockFetcher.data = { success: false, message: "Token expired" };
    view.rerender(<Sessions sessions={sessions} currentSessionId="s1" />);

    // Both rows share the mocked fetcher, so the alert renders per row.
    const alerts = await screen.findAllByText("Token expired");
    expect(alerts.length).toBeGreaterThan(0);
    expect(toast.success).not.toHaveBeenCalled();
  });
});
