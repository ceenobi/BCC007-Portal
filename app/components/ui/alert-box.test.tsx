// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { AlertBox } from "./alert-box";

afterEach(cleanup);

describe("AlertBox", () => {
  it("shows the alert when showAlert is true", () => {
    render(
      <AlertBox showAlert title="Error" description="Something went wrong" />,
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("renders nothing when showAlert is false", () => {
    render(
      <AlertBox
        showAlert={false}
        title="Error"
        description="Something went wrong"
      />,
    );
    expect(screen.queryByText("Something went wrong")).toBeNull();
  });

  it("hides after dismissal and re-shows when resetKey signals a new event", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <AlertBox
        showAlert
        resetKey={1}
        title="Error"
        description="Invalid credentials"
      />,
    );

    await user.click(screen.getByRole("button", { name: "close-alert" }));
    expect(screen.queryByText("Invalid credentials")).toBeNull();

    // Second failed attempt: showAlert stays true (persistent fetcher data),
    // only resetKey advances.
    rerender(
      <AlertBox
        showAlert
        resetKey={2}
        title="Error"
        description="Invalid credentials"
      />,
    );
    expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
  });

  it("keeps the alert hidden when dismissed without a new resetKey", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <AlertBox
        showAlert
        resetKey={1}
        title="Error"
        description="Invalid credentials"
      />,
    );

    await user.click(screen.getByRole("button", { name: "close-alert" }));
    rerender(
      <AlertBox
        showAlert
        resetKey={1}
        title="Error"
        description="Invalid credentials"
      />,
    );
    expect(screen.queryByText("Invalid credentials")).toBeNull();
  });

  it("re-shows on a false→true transition without resetKey", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <AlertBox showAlert={true} title="Error" description="Boom" />,
    );

    await user.click(screen.getByRole("button", { name: "close-alert" }));
    expect(screen.queryByText("Boom")).toBeNull();

    rerender(<AlertBox showAlert={false} title="Error" description="Boom" />);
    rerender(<AlertBox showAlert={true} title="Error" description="Boom" />);
    expect(screen.getByText("Boom")).toBeInTheDocument();
  });
});
