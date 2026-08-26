// @vitest-environment happy-dom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AssignTicketModal from "./assign-ticket-modal";

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

const admins = [
  { _id: "admin-1", name: "Ada Admin" },
  { _id: "admin-2", name: "Bode Admin" },
];

const ticketBase = {
  _id: "t1",
  title: "Cannot log in",
  status: "open",
}

const unassignedTicket = ticketBase as never

const assignedTicket = {
  ...ticketBase,
  assignedTo: { _id: "admin-1", name: "Ada Admin" },
} as never

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

describe("AssignTicketModal", () => {
  it("shows the assign trigger for unassigned tickets and change-assignee for assigned ones", () => {
    const view = render(
      <AssignTicketModal ticket={unassignedTicket} admins={admins} />,
    );
    expect(
      screen.getByRole("button", { name: /assign to an admin/i }),
    ).toBeInTheDocument();

    view.rerender(<AssignTicketModal ticket={assignedTicket} admins={admins} />);
    expect(
      screen.getByRole("button", { name: /change assignee/i }),
    ).toBeInTheDocument();
  });

  it("opens with the current assignee preselected and submits assign intent on confirm", async () => {
    const user = userEvent.setup();
    render(<AssignTicketModal ticket={assignedTicket} admins={admins} />);
    await user.click(
      screen.getByRole("button", { name: /change assignee/i }),
    );
    await screen.findByText(/assign "cannot log in" to an admin/i);
    // Preselected admin shown in the closed select
    const trigger = screen.getAllByRole("combobox")[0];
    expect(trigger.textContent).toContain("Ada Admin");

    // Button stays disabled until the assignment actually changes.
    expect(screen.getByRole("button", { name: /^assign$/i })).toBeDisabled();
    await user.click(trigger);
    await user.click(await screen.findByRole("option", { name: "Bode Admin" }));
    await user.click(screen.getByRole("button", { name: /^assign$/i }));
    expect(mockSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        intent: "assign-ticket",
        id: "t1",
        assignedTo: "admin-2",
      }),
      // The route parses request.json() — assert the full request contract.
      {
        method: "post",
        action: "/dashboard/help-center",
        encType: "application/json",
      },
    );
  });

  it("submits a null assignee when unassigning", async () => {
    const user = userEvent.setup();
    render(<AssignTicketModal ticket={assignedTicket} admins={admins} />);
    await user.click(screen.getByRole("button", { name: /change assignee/i }));
    await screen.findByText(/assign "cannot log in" to an admin/i);

    await user.click(screen.getByRole("button", { name: /unassign/i }));
    expect(mockSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        intent: "assign-ticket",
        id: "t1",
        assignedTo: null,
      }),
      {
        method: "post",
        action: "/dashboard/help-center",
        encType: "application/json",
      },
    );
  });

  it("toasts success, closes the modal and resets the fetcher", async () => {
    const user = userEvent.setup();
    let view = render(
      <AssignTicketModal ticket={assignedTicket} admins={admins} />,
    );
    await user.click(screen.getByRole("button", { name: /change assignee/i }));
    await screen.findByText(/assign "cannot log in"/i);

    mockFetcher.data = { success: true, message: "Assigned!" };
    view.rerender(<AssignTicketModal ticket={assignedTicket} admins={admins} />);

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Assigned!"));
    expect(mockReset).toHaveBeenCalled();
    // Success path must actually close the modal, per the test title.
    await waitFor(() =>
      expect(
        screen.queryByText(/assign "cannot log in" to an admin/i),
      ).not.toBeInTheDocument(),
    );
  });

  it("toasts an error without closing on failure", async () => {
    const user = userEvent.setup();
    let view = render(
      <AssignTicketModal ticket={assignedTicket} admins={admins} />,
    );
    await user.click(screen.getByRole("button", { name: /change assignee/i }));
    await screen.findByText(/assign "cannot log in"/i);

    mockFetcher.data = { success: false, message: "Not permitted" };
    view.rerender(<AssignTicketModal ticket={assignedTicket} admins={admins} />);

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Not permitted"),
    );
    expect(screen.getByText(/assign "cannot log in"/i)).toBeInTheDocument();
  });
});
