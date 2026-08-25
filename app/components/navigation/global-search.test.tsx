// @vitest-environment happy-dom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import GlobalSearch from "./global-search";

const mockNavigate = vi.fn();

vi.mock("react-router", () => ({
  useNavigate: () => mockNavigate,
}));

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

const adminUser = { id: "u1", role: "super_admin" } as never;

function sectionsResponse(sections: unknown[]) {
  return {
    ok: true,
    json: async () => ({ success: true, body: { sections } }),
  };
}

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /search/i }));
  return screen.getByPlaceholderText(/search members/i);
}

beforeEach(() => {
  fetchMock.mockReset();
  mockNavigate.mockClear();
});

afterEach(cleanup);

describe("GlobalSearch", () => {
  it("opens via the search button, Cmd/Ctrl+K, and /", async () => {
    const user = userEvent.setup();
    render(<GlobalSearch user={adminUser} />);

    await user.click(screen.getByRole("button", { name: /search/i }));
    expect(screen.getByPlaceholderText(/search members/i)).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByPlaceholderText(/search members/i)).toBeNull(),
    );

    await user.keyboard("{Control>}{k}{/Control}");
    expect(screen.getByPlaceholderText(/search members/i)).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByPlaceholderText(/search members/i)).toBeNull(),
    );
    await user.keyboard("/");
    expect(screen.getByPlaceholderText(/search members/i)).toBeInTheDocument();
  });

  it("shows nav items for short queries without hitting the API", async () => {
    const user = userEvent.setup();
    render(<GlobalSearch user={adminUser} />);
    const input = await openDialog(user);

    await user.type(input, "t");

    // super_admin sees the transfers entry among nav items
    const rows = screen.getAllByRole("button");
    expect(
      rows.some((row) => row.textContent?.includes("Transfers")),
    ).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("excludes the transfers nav item for unauthorized roles", async () => {
    const user = userEvent.setup();
    render(<GlobalSearch user={{ id: "u2", role: "member" } as never} />);
    const input = await openDialog(user);

    await user.type(input, "a");

    const rows = screen.getAllByRole("button");
    expect(rows.some((row) => row.textContent?.includes("Transfers"))).toBe(
      false,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("debounces search requests and queries with trimmed input", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(sectionsResponse([]));
    render(<GlobalSearch user={adminUser} />);
    const input = await openDialog(user);

    // Typing continuously keeps resetting the 350ms debounce.
    await user.type(input, "  ada ");
    expect(fetchMock).not.toHaveBeenCalled(); // not yet, mid-debounce

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1), {
      timeout: 2000,
    });
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({ query: "ada" });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("aborts an in-flight request when the query changes", async () => {
    const user = userEvent.setup();
    let firstSignal: AbortSignal | undefined;
    fetchMock.mockImplementation((_url, init) => {
      firstSignal ??= init.signal;
      return new Promise(() => {}); // never resolves
    });
    render(<GlobalSearch user={adminUser} />);
    const input = await openDialog(user);

    await user.type(input, "ad");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1), {
      timeout: 2000,
    });

    // New keystrokes abort the stale request even though it never resolved.
    await user.type(input, "am");
    await waitFor(() => expect(firstSignal?.aborted).toBe(true), {
      timeout: 2000,
    });
  });

  it("renders grouped results and navigates on click", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(
      sectionsResponse([
        {
          type: "member",
          label: "Members",
          viewAllHref: "/dashboard/members",
          results: [
            {
              id: "m1",
              title: "Ada Obi",
              subtitle: "Member",
              href: "/dashboard/members/u1",
            },
          ],
        },
      ]),
    );
    render(<GlobalSearch user={adminUser} />);
    const input = await openDialog(user);

    await user.type(input, "ada");
    await screen.findByText("Ada Obi", {}, { timeout: 3000 });

    expect(screen.getByText("Members")).toBeInTheDocument();
    await user.click(screen.getByText("Ada Obi"));

    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/members/u1");
    await waitFor(() =>
      expect(screen.queryByPlaceholderText(/search members/i)).toBeNull(),
    );
  });

  it("shows the empty state when nothing matches", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(sectionsResponse([]));
    render(<GlobalSearch user={adminUser} />);
    const input = await openDialog(user);

    await user.type(input, "zzzz");
    await screen.findByText(/no results found for "zzzz"/i, {}, { timeout: 3000 });
  });

  it("clears results on network failure instead of crashing", async () => {
    const user = userEvent.setup();
    fetchMock.mockRejectedValue(new Error("network down"));
    render(<GlobalSearch user={adminUser} />);
    const input = await openDialog(user);

    await user.type(input, "query");
    await screen.findByText(/no results found for "query"/i, {}, { timeout: 3000 });
  });
});
