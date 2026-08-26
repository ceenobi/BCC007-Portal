// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockSubmit = vi.fn();
const mockNavigate = vi.fn();
const mockFetcher = {
  state: "idle",
  data: undefined as unknown,
  error: undefined as unknown,
  submit: mockSubmit,
};

vi.mock("react-router", () => ({
  useFetcher: () => ({
    ...mockFetcher,
    Form: ({
      children,
      onSubmit,
    }: {
      children: React.ReactNode;
      onSubmit: unknown;
    }) => (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (typeof onSubmit === "function") onSubmit(e);
        }}
      >
        {children}
      </form>
    ),
  }),
  useNavigate: () => mockNavigate,
  useSearchParams: () => [new URLSearchParams("token=tok-123")],
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("~/components/provider/page-wrapper", () => ({
  PageSection: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("~/components/ui/action-btn", () => ({
  default: ({ text }: { text: string }) => (
    <button type="submit">{text}</button>
  ),
}));

vi.mock("~/components/ui/form-box", () => ({
  FormBox: ({
    id,
    name,
    register,
  }: {
    id: string;
    name: string;
    register: (name_: string) => {
      ref: (el: HTMLInputElement | null) => void;
      onChange: (e: unknown) => void;
      onBlur: (e: unknown) => void;
      name: string;
    };
  }) => {
    const { ref, onChange, onBlur } = register(name);
    return (
      <input id={id} name={name} ref={ref} onChange={onChange} onBlur={onBlur} />
    );
  },
}));

import { toast } from "sonner";
import ResetPassword, { ErrorBoundary } from "./route";

beforeEach(() => {
  mockFetcher.state = "idle";
  mockFetcher.data = undefined;
  mockFetcher.error = undefined;
  mockNavigate.mockClear();
  mockSubmit.mockClear();
  vi.mocked(toast.success).mockClear();
  vi.mocked(toast.error).mockClear();
});

afterEach(cleanup);

async function fillAndSubmit(
  user: ReturnType<typeof userEvent.setup>,
): Promise<ReturnType<typeof render>> {
  const view = render(<ResetPassword />);
  const input = document.querySelector("#newPassword") as HTMLInputElement;
  fireEvent.change(input, { target: { value: "NewSecure123!" } });
  await user.click(screen.getByRole("button", { name: /reset/i }));
  return view;
}

describe("ResetPassword", () => {
  it("submits the new password with the token from the URL", async () => {
    const user = userEvent.setup();
    await fillAndSubmit(user);

    expect(mockSubmit).toHaveBeenCalledWith(
      { newPassword: "NewSecure123!" },
      expect.objectContaining({
        method: "post",
        action: "/auth/reset-password?token=tok-123",
        encType: "application/json",
      }),
    );
  });

  it("navigates to /auth/login with replace after a successful reset", async () => {
    const user = userEvent.setup();
    const view = await fillAndSubmit(user);

    mockFetcher.data = { success: true, message: "Password reset successful" };
    view.rerender(<ResetPassword />);

    expect(mockNavigate).toHaveBeenCalledWith("/auth/login", {
      replace: true,
    });
  });

  it("shows the inline AlertBox when the action reports failure", async () => {
    const user = userEvent.setup();
    const view = await fillAndSubmit(user);

    // Regression: better-auth failures used to land in the router's error
    // channel; now they arrive as actionData and must surface here.
    mockFetcher.data = { success: false, message: "Invalid token" };
    view.rerender(<ResetPassword />);

    await waitFor(() =>
      expect(screen.getByText("Invalid token")).toBeInTheDocument(),
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("renders the server message via ErrorBoundary for error-channel responses", () => {
    // Regression: raw non-2xx action responses land in the router's error
    // channel — the boundary must surface them instead of failing silently.
    const errorResponse = Object.assign(new Error("ErrorResponse"), {
      status: 400,
      statusText: "Bad Request",
      data: { message: "Invalid token", code: "INVALID_TOKEN" },
    });
    render(<ErrorBoundary error={errorResponse} params={{}} />);

    expect(screen.getByText("Invalid token")).toBeInTheDocument();
  });

  it("shows a generic message in ErrorBoundary when data has no message", () => {
    const errorResponse = Object.assign(new Error("ErrorResponse"), {
      status: 500,
      data: null,
    });
    render(<ErrorBoundary error={errorResponse} params={{}} />);

    expect(
      screen.getByText("Something went wrong. Please try again."),
    ).toBeInTheDocument();
  });
});
