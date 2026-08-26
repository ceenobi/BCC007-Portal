// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockSubmit = vi.fn();

vi.mock("react-router", () => ({
  useFetcher: () => ({
    state: "idle",
    data: undefined,
    submit: mockSubmit,
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
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const fetchMock = vi.fn(async () =>
  new Response(
    JSON.stringify({
      success: true,
      body: { accountName: "ADA OBI" },
    }),
    { status: 200 },
  ),
);
vi.stubGlobal("fetch", fetchMock);

import type { PaystackBank } from "~/.server/services/paystack.service";
import type { BankDetails } from "~/types";
import BankInfo from "./bank-info";

const banks = [
  {
    name: "GTBank",
    code: "058",
  },
] as unknown as PaystackBank[];

beforeEach(() => {
  fetchMock.mockClear();
});

afterEach(cleanup);

describe("BankInfo auto-verification", () => {
  const setupWithBankPrefilled = () =>
    render(
      <BankInfo
        activeForm="bank-form"
        user={{ _id: "u1" } as never}
        setActiveForm={vi.fn()}
        bankDetails={
          {
            bank: "GTBank",
            bankCode: "058",
            bankAccountNumber: "",
            bankAccountName: "",
          } as unknown as BankDetails
        }
        banks={banks}
      />,
    );

  it("auto-verifies once a full 10-digit account number is entered", async () => {
    setupWithBankPrefilled();

    const input = screen.getByPlaceholderText("Account number");
    fireEvent.change(input, { target: { value: "0123456789" } });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1), {
      timeout: 3000,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/banks/resolve",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ accountNumber: "0123456789", bankCode: "058" }),
      }),
    );

    await waitFor(
      () => expect(screen.getByText("ADA OBI")).toBeInTheDocument(),
      { timeout: 3000 },
    );
  });

  it("does not verify until the account number reaches 10 digits", async () => {
    setupWithBankPrefilled();

    const input = screen.getByPlaceholderText("Account number");
    fireEvent.change(input, { target: { value: "012345678" } });
    await new Promise((r) => setTimeout(r, 900));

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
