// @vitest-environment happy-dom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RetryTransfer from "./retry-transfer";

const mockSubmit = vi.fn();
const mockReset = vi.fn();
let mockFetcher: {
  state: string;
  data: unknown;
  submit: typeof mockSubmit;
  reset: typeof mockReset;
};

vi.mock("react-router", () => ({
  useFetcher: () => mockFetcher,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { toast } from "sonner";

const failedTransfer = {
  _id: "t1",
  reference: "BCC-TRF-FAILED",
  status: "failed",
} as never;

beforeEach(() => {
  mockFetcher = {
    state: "idle",
    data: undefined,
    submit: mockSubmit,
    reset: mockReset,
  };
  vi.mocked(toast.success).mockClear();
  vi.mocked(toast.error).mockClear();
  mockSubmit.mockClear();
  mockReset.mockClear();
});

afterEach(cleanup);

describe("RetryTransfer", () => {
  it("renders a retry button with accessible label", () => {
    render(<RetryTransfer transfer={failedTransfer} />);
    expect(
      screen.getByRole("button", { name: /retry transfer/i }),
    ).toBeInTheDocument();
  });

  it("submits retry-transfer intent with the original reference on click", async () => {
    const user = userEvent.setup();
    render(<RetryTransfer transfer={failedTransfer} />);

    await user.click(screen.getByRole("button", { name: /retry transfer/i }));

    expect(mockSubmit).toHaveBeenCalledTimes(1);
    expect(mockSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        intent: "retry-transfer",
        reference: "BCC-TRF-FAILED",
      }),
      expect.objectContaining({ action: "/dashboard/transfers" }),
    );
  });

  it("disables the button while submitting", () => {
    mockFetcher.state = "submitting";
    render(<RetryTransfer transfer={failedTransfer} />);
    expect(
      screen.getByRole("button", { name: /retry transfer/i }),
    ).toBeDisabled();
  });

  it("shows success toast and resets the fetcher on success", async () => {
    const view = render(<RetryTransfer transfer={failedTransfer} />);
    mockFetcher.data = { success: true, message: "Retry queued" };
    view.rerender(<RetryTransfer transfer={failedTransfer} />);

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Retry queued"));
    await waitFor(() => expect(mockReset).toHaveBeenCalled());
  });

  it("shows an error toast without resetting the fetcher on failure", async () => {
    const view = render(<RetryTransfer transfer={failedTransfer} />);
    mockFetcher.data = { success: false, message: "Not retryable" };
    view.rerender(<RetryTransfer transfer={failedTransfer} />);

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Not retryable"));
    expect(mockReset).not.toHaveBeenCalled();
  });
});
