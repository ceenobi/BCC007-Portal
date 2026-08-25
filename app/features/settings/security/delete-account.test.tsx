// @vitest-environment happy-dom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DeleteAccount from "./delete-account";

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

const user = { _id: "u1", email: "a@b.c" } as never;

beforeEach(() => {
  mockFetcher = { state: "idle", data: undefined, submit: mockSubmit };
  vi.mocked(toast.success).mockClear();
  vi.mocked(toast.error).mockClear();
  mockSubmit.mockClear();
});

afterEach(cleanup);

describe("DeleteAccount", () => {
  it("renders the danger zone with an explicit irreversibility warning", () => {
    render(<DeleteAccount user={user} />);

    expect(screen.getByText(/danger zone/i)).toBeInTheDocument();
    expect(
      screen.getByText(/cannot be undone/i),
    ).toBeInTheDocument();
  });

  it("submits delete-account intent with the user id on click", async () => {
    const userEventSetup = userEvent.setup();
    render(<DeleteAccount user={user} />);

    await userEventSetup.click(
      screen.getByRole("button", { name: /delete account/i }),
    );

    expect(mockSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ intent: "delete-account", id: "u1" }),
      expect.anything(),
    );
  });

  it("shows a success toast when the request succeeds", async () => {
    let view = render(<DeleteAccount user={user} />);
    mockFetcher.data = {
      success: true,
      message: "Deletion request received",
    };
    view.rerender(<DeleteAccount user={user} />);

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Deletion request received"),
    );
  });

  it("shows the inline AlertBox on failure", async () => {
    let view = render(<DeleteAccount user={user} />);
    mockFetcher.data = {
      success: false,
      message: "Pending payments must clear first",
    };
    view.rerender(<DeleteAccount user={user} />);

    await screen.findByText("Pending payments must clear first");
    expect(toast.success).not.toHaveBeenCalled();
  });
});
