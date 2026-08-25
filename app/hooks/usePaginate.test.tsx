// @vitest-environment happy-dom
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import usePaginate from "./usePaginate";

const mockNavigate = vi.fn();
let mockParams: URLSearchParams;

vi.mock("react-router", () => ({
  useSearchParams: () => [mockParams],
  useNavigate: () => mockNavigate,
}));

let latest: ReturnType<typeof usePaginate>;

function Probe() {
  latest = usePaginate({ totalPages: 5, hasMore: true, currentPage: 3 });
  return null;
}

beforeEach(() => {
  mockNavigate.mockClear();
});

afterEach(cleanup);

describe("usePaginate", () => {
  it("parses page and limit from search params", () => {
    mockParams = new URLSearchParams("page=3&limit=25");
    render(<Probe />);
    expect(latest.page).toBe(3);
    expect(latest.limit).toBe(25);
  });

  it("falls back to page 1 and limit 10 when params are absent", () => {
    mockParams = new URLSearchParams("");
    render(<Probe />);
    expect(latest.page).toBe(1);
    expect(latest.limit).toBe(10);
  });

  it.each([
    ["first", "1"],
    ["last", "5"],
    ["prev", "2"],
    ["next", "4"],
  ])(
    "handlePageChange(%s) navigates to page %s preserving limit",
    (direction, expectedPage) => {
      mockParams = new URLSearchParams("page=3&limit=25");
      render(<Probe />);

      act(() => latest.handlePageChange(direction));

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      const url = new URL("http://x" + mockNavigate.mock.calls[0][0]);
      expect(url.searchParams.get("page")).toBe(expectedPage);
      expect(url.searchParams.get("limit")).toBe("25");
    },
  );

  it("clamps prev at page 1 and next at the last page", () => {
    mockParams = new URLSearchParams("page=1&limit=10");
    const view = render(<Probe />);

    act(() => latest.handlePageChange("prev"));
    let url = new URL("http://x" + mockNavigate.mock.calls[0][0]);
    expect(url.searchParams.get("page")).toBe("1");

    view.rerender(<Probe />);
    // simulate being on the last page
    mockParams = new URLSearchParams("page=5&limit=10");
    view.rerender(<Probe />);
    act(() => latest.handlePageChange("next"));
    url = new URL("http://x" + mockNavigate.mock.calls[1][0]);
    expect(url.searchParams.get("page")).toBe("5");
  });

  it("ignores unknown directions", () => {
    mockParams = new URLSearchParams("page=3&limit=10");
    render(<Probe />);

    act(() => latest.handlePageChange("sideways" as never));
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("resets to page 1 when the limit changes", async () => {
    const user = userEvent.setup();
    mockParams = new URLSearchParams("page=4&limit=10");
    render(<Probe />);

    await act(async () => latest.handleLimitChange("50"));

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    const url = new URL("http://x" + mockNavigate.mock.calls[0][0]);
    expect(url.searchParams.get("limit")).toBe("50");
    expect(url.searchParams.get("page")).toBe("1");
  });
});
