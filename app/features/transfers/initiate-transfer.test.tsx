// @vitest-environment happy-dom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import InitiateTransfer from "./initiate-transfer";

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

const members = [
  { _id: "user-1", name: "Ada" },
  { _id: "user-2", name: "Chidi" },
];

const balance = { total: 150000, pending: 0, balance: 150000, currency: "NGN" };

function renderComponent() {
  return render(<InitiateTransfer members={members} balance={balance} />);
}

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

async function openModalAndFillForm(user: ReturnType<
  typeof userEvent.setup
>): Promise<void> {
  await user.click(screen.getByRole("button", { name: /transfer/i }));
  const amount = screen.getByLabelText(/amount/i);
  await user.type(amount, "5000");
}

describe("InitiateTransfer", () => {
  it("opens the modal and shows the available balance formatted", async () => {
    const user = userEvent.setup();
    renderComponent();

    expect(screen.queryByText(/available balance/i)).toBeNull();
    await user.click(screen.getByRole("button", { name: /transfer/i }));

    expect(screen.getByText(/available balance/i)).toBeInTheDocument();
    // 150000 kobo-equivalent major units rendered through formatMoney
    expect(screen.getByText(/150[,.]?000/)).toBeInTheDocument();
  });

  it("does not submit when required fields are missing", async () => {
    const user = userEvent.setup();
    renderComponent();
    await user.click(screen.getByRole("button", { name: /transfer/i }));
    await user.click(screen.getByRole("button", { name: /process transfer/i }));

    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it("submits with initiate-transfer intent and an idempotency key", async () => {
    const user = userEvent.setup();
    renderComponent();
    await openModalAndFillForm(user);

    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Ada" }));
    await user.click(screen.getByRole("button", { name: /process transfer/i }));

    await waitFor(() => expect(mockSubmit).toHaveBeenCalledTimes(1));
    const [payload] = mockSubmit.mock.calls[0];
    expect(payload.intent).toBe("initiate-transfer");
    expect(payload.userId).toBe("user-1");
    expect(payload.amount).toBe(5000);
    expect(payload.idempotencyKey).toEqual(expect.any(String));
  });

  it("keeps a stable idempotency key across re-submissions of the same intent", async () => {
    const user = userEvent.setup();
    renderComponent();
    await openModalAndFillForm(user);
    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Ada" }));

    await user.click(screen.getByRole("button", { name: /process transfer/i }));
    await waitFor(() => expect(mockSubmit).toHaveBeenCalledTimes(1));
    const firstKey = mockSubmit.mock.calls[0][0].idempotencyKey;

    await user.click(screen.getByRole("button", { name: /process transfer/i }));
    await waitFor(() => expect(mockSubmit).toHaveBeenCalledTimes(2));
    expect(mockSubmit.mock.calls[1][0].idempotencyKey).toBe(firstKey);
  });

  it("switches to the OTP phase when the action responds with otp status", async () => {
    const user = userEvent.setup();
    const view = renderComponent();
    await openModalAndFillForm(user);

    mockFetcher.data = {
      success: true,
      message: "OTP sent",
      body: { status: "otp", transferCode: "TC_123" },
    };
    view.rerender(<InitiateTransfer members={members} balance={balance} />);

    await waitFor(() =>
      expect(screen.getByText(/confirm with otp/i)).toBeInTheDocument(),
    );
    expect(mockReset).toHaveBeenCalled(); // fetcher.reset() after phase switch
    expect(
      screen.getByPlaceholderText("6-digit OTP"),
    ).toBeInTheDocument();
  });

  it("disables Confirm until the OTP has exactly 6 digits and submits finalize-transfer intent", async () => {
    const user = userEvent.setup();
    let view = renderComponent();
    await user.click(screen.getByRole("button", { name: /transfer/i }));

    mockFetcher.data = {
      success: true,
      body: { status: "otp", transferCode: "TC_123" },
    };
    view.rerender(<InitiateTransfer members={members} balance={balance} />);
    await screen.findByPlaceholderText("6-digit OTP");

    const confirm = screen.getByRole("button", { name: /confirm otp/i });
    expect(confirm).toBeDisabled();

    const otpInput = screen.getByPlaceholderText("6-digit OTP");
    await user.type(otpInput, "12ab34");
    expect(otpInput).toHaveValue("1234"); // non-digits stripped
    expect(confirm).toBeDisabled();

    await user.type(otpInput, "56");
    expect(confirm).toBeEnabled();
    await user.click(confirm);

    expect(mockSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        intent: "finalize-transfer",
        transferCode: "TC_123",
        otp: "123456",
      }),
      expect.objectContaining({ action: "/dashboard/transfers" }),
    );
    void view;
  });

  it("closes the modal and resets after a successful (non-otp) response", async () => {
    const user = userEvent.setup();
    const view = renderComponent();
    await user.click(screen.getByRole("button", { name: /transfer/i }));
    await openModalAndFillForm(user);

    mockFetcher.data = { success: true, message: "Transfer initiated" };
    view.rerender(<InitiateTransfer members={members} balance={balance} />);

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Transfer initiated"));
    expect(mockReset).toHaveBeenCalled();
    expect(screen.queryByText(/available balance/i)).toBeNull(); // modal closed
  });

  it("shows an error toast on failure without closing the modal", async () => {
    const user = userEvent.setup();
    const view = renderComponent();
    await user.click(screen.getByRole("button", { name: /transfer/i }));

    mockFetcher.data = { success: false, message: "Insufficient balance" };
    view.rerender(<InitiateTransfer members={members} balance={balance} />);

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Insufficient balance"),
    );
    expect(screen.getByText(/available balance/i)).toBeInTheDocument();
  });
});
