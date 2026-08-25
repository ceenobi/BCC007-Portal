// @vitest-environment happy-dom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CreateTicket from "./create-ticket";

const mockSubmit = vi.fn();
const mockReset = vi.fn();
let mockFetcher: {
  state: string;
  data: unknown;
  submit: typeof mockSubmit;
  reset: typeof mockReset;
  Form: (props: { children: React.ReactNode }) => React.ReactElement;
};

vi.mock("react-router", () => ({
  useFetcher: () => mockFetcher,
  useSearchParams: () => [new URLSearchParams(window.location.search)],
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Render FormSelect as a native <select> so tests exercise our component's
// Controller wiring without third-party Select portal internals.
vi.mock("~/components/ui/form-select", () => ({
  FormSelect: ({
    options,
    value,
    onValueChange,
    placeholder,
  }: {
    options: { id: string | number; name: string }[];
    value?: string;
    onValueChange?: (v: string) => void;
    placeholder?: string;
  }) => (
    <select
      aria-label={placeholder}
      value={value ?? ""}
      onChange={(e) => onValueChange?.(e.target.value)}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.id} value={String(o.id)}>
          {o.name}
        </option>
      ))}
    </select>
  ),
}));

import { toast } from "sonner";

function MockForm({
  children,
  onSubmit,
  ...rest
}: React.ComponentProps<"form">) {
  return (
    <form
      {...rest}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.(e);
      }}
    >
      {children}
    </form>
  );
}

beforeEach(() => {
  mockFetcher = {
    state: "idle",
    data: undefined,
    submit: mockSubmit,
    reset: mockReset,
    Form: MockForm,
  };
  window.history.replaceState(null, "", "/dashboard/help-center");
  vi.mocked(toast.success).mockClear();
  mockSubmit.mockClear();
});

afterEach(cleanup);

async function openModal(
  user: ReturnType<typeof userEvent.setup>,
): Promise<void> {
  await user.click(screen.getByRole("button", { name: /create ticket/i }));
  await screen.findByText(/have an issue/i);
}

async function fillAndSubmit(
  user: ReturnType<typeof userEvent.setup>,
): Promise<void> {
  await user.type(screen.getByPlaceholderText(/keep it simple/i), "Login bug");
  await user.type(screen.getByPlaceholderText(/detail the issue/i), "It fails every single time");
  await user.selectOptions(screen.getByLabelText("Category"), "account");
  await user.selectOptions(screen.getByLabelText("Priority"), "high");
  await user.click(
    screen.getAllByRole("button", { name: /create ticket/i }).pop()!,
  );
}

describe("CreateTicket", () => {
  it("opens the modal from the button", async () => {
    const user = userEvent.setup();
    render(<CreateTicket />);
    expect(screen.queryByText(/have an issue/i)).toBeNull();
    await openModal(user);
    expect(screen.getByPlaceholderText(/keep it simple/i)).toBeInTheDocument();
  });

  it("auto-opens when ?create=true is in the URL", async () => {
    window.history.replaceState(null, "", "/dashboard/help-center?create=true");
    render(<CreateTicket />);
    await screen.findByText(/have an issue/i);
    expect(screen.getByPlaceholderText(/keep it simple/i)).toBeInTheDocument();
  });

  it("does not submit when required fields are empty", async () => {
    const user = userEvent.setup();
    render(<CreateTicket />);
    await openModal(user);
    await user.click(
      screen.getAllByRole("button", { name: /create ticket/i }).pop()!,
    );
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it("submits with create-ticket intent and an idempotency key", async () => {
    const user = userEvent.setup();
    render(<CreateTicket />);
    await openModal(user);
    await fillAndSubmit(user);

    await waitFor(() => expect(mockSubmit).toHaveBeenCalledTimes(1));
    const [payload] = mockSubmit.mock.calls[0];
    expect(payload.intent).toBe("create-ticket");
    expect(payload.title).toBe("Login bug");
    expect(payload.idempotencyKey).toEqual(expect.any(String));

    // Second submission of the same intent reuses the key.
    await fillAndSubmit(user);
    await waitFor(() => expect(mockSubmit).toHaveBeenCalledTimes(2));
    expect(mockSubmit.mock.calls[1][0].idempotencyKey).toBe(
      payload.idempotencyKey,
    );
  });

  it("closes the modal and resets on success", async () => {
    const user = userEvent.setup();
    let view = render(<CreateTicket />);
    await openModal(user);
    await fillAndSubmit(user);
    await waitFor(() => expect(mockSubmit).toHaveBeenCalledTimes(1));

    mockFetcher.data = { success: true, message: "Ticket created" };
    view.rerender(<CreateTicket />);

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Ticket created"),
    );
    await waitFor(() =>
      expect(screen.queryByText(/have an issue/i)).toBeNull(),
    );
  });

  it("shows an inline AlertBox on failure and keeps the modal open", async () => {
    const user = userEvent.setup();
    const view = render(<CreateTicket />);
    await openModal(user);

    mockFetcher.data = { success: false, message: "Rate limit exceeded" };
    view.rerender(<CreateTicket />);

    await screen.findByText("Rate limit exceeded");
    expect(screen.getByText(/have an issue/i)).toBeInTheDocument();
  });
});
