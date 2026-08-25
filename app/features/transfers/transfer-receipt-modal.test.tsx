// @vitest-environment happy-dom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TransferReceiptModal from "./transfer-receipt-modal";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockInvoice = vi.fn();
vi.mock("~/lib/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("~/lib/utils")>();
  return {
    ...actual,
    transferReceiptInvoice: (...args: unknown[]) => mockInvoice(...args),
  };
});

import { toast } from "sonner";

const transferBase = {
  _id: "t1",
  reference: "BCC-TRF-OK",
  status: "success",
  amount: 250000,
  fee: 1000,
  currency: "NGN",
  transferCode: "TRF_88",
  reason: "Project payment",
  createdAt: new Date("2026-01-15T10:00:00Z").toISOString(),
  userId: { name: "Ada Obi" },
}

const successfulTransfer = transferBase as never

const failedTransfer = {
  ...transferBase,
  _id: "t2",
  reference: "BCC-TRF-FAIL",
  status: "failed",
} as never

beforeEach(() => {
  mockInvoice.mockReset();
  vi.mocked(toast.error).mockClear();
});

afterEach(cleanup);

describe("TransferReceiptModal", () => {
  it("shows the empty state when no transfer is selected and blocks download", () => {
    render(
      <TransferReceiptModal transfer={null} isOpen setIsOpen={vi.fn()} />,
    );

    expect(screen.getAllByText(/no transfer selected/i).length).toBeGreaterThan(
      0,
    );
    expect(screen.getByRole("button", { name: /download receipt/i })).toBeDisabled();
  });

  it("renders recipient, reference, amounts and status for a successful transfer", () => {
    render(
      <TransferReceiptModal
        transfer={successfulTransfer}
        isOpen
        setIsOpen={vi.fn()}
      />,
    );

    expect(screen.getByText("Ada Obi")).toBeInTheDocument();
    expect(screen.getByText("BCC-TRF-OK")).toBeInTheDocument();
    expect(screen.getByText(/success/i)).toBeInTheDocument();
    // Amount and fee rendered via formatMoney
    const amounts = screen
      .getAllByText(/[₦]?[0-9][0-9,.]+/)
      .map((n) => n.textContent);
    expect(amounts.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("TRF_88")).toBeInTheDocument();
    expect(screen.getByText("Project payment")).toBeInTheDocument();
    // No warning banner on success
    expect(
      screen.queryByText(/only available for successful transfers/i),
    ).toBeNull();
  });

  it("warns and disables download for non-successful transfers", () => {
    render(
      <TransferReceiptModal
        transfer={failedTransfer}
        isOpen
        setIsOpen={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/only available for successful transfers/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /download receipt/i })).toBeDisabled();
  });

  it("generates the invoice on download click", async () => {
    const user = userEvent.setup();
    render(
      <TransferReceiptModal
        transfer={successfulTransfer}
        isOpen
        setIsOpen={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /download receipt/i }));
    await waitFor(() =>
      expect(mockInvoice).toHaveBeenCalledWith(successfulTransfer),
    );
  });

  it("toasts an error when invoice generation fails", async () => {
    const user = userEvent.setup();
    mockInvoice.mockRejectedValue(new Error("pdf blew up"));
    render(
      <TransferReceiptModal
        transfer={successfulTransfer}
        isOpen
        setIsOpen={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /download receipt/i }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to generate receipt. Please try again.",
      ),
    );
  });

  it("closes via the close button", async () => {
    const setIsOpen = vi.fn();
    const user = userEvent.setup();
    render(
      <TransferReceiptModal
        transfer={successfulTransfer}
        isOpen
        setIsOpen={setIsOpen}
      />,
    );

    await user.click(screen.getAllByRole("button", { name: /^close$/i })[0]);
    expect(setIsOpen).toHaveBeenCalledWith(false);
  });
});
