// @vitest-environment happy-dom
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useFileUpload } from "./useFileUpload";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { toast } from "sonner";

let latest: ReturnType<typeof useFileUpload>;

function Probe({ limit, size }: { limit?: number; size?: number }) {
  latest = useFileUpload({ limit, size });
  return <input type="file" multiple data-testid="file-input" onChange={latest.handleFiles} />;
}

function makeFile(name: string, type: string, sizeBytes: number) {
  // Content sized to the requested byte length.
  const content = new Array(sizeBytes).fill("a").join("");
  return new File([content], name, { type });
}

beforeEach(() => {
  vi.mocked(toast.error).mockClear();
});

afterEach(cleanup);

async function setInputFiles(
  user: ReturnType<typeof userEvent.setup>,
  files: File[],
) {
  const input = screen.getByTestId("file-input") as HTMLInputElement;
  await user.upload(input, files);
}

describe("useFileUpload", () => {
  it("accepts valid image files and builds data-url previews", async () => {
    const user = userEvent.setup();
    render(<Probe />);

    const file = makeFile("pic.png", "image/png", 10);
    await setInputFiles(user, [file]);

    await act(async () => {
      // FileReader is async; flush microtasks until state lands.
      await new Promise((r) => setTimeout(r, 0));
    });

    await vi.waitFor(() => {
      expect(latest.selectedFiles).toHaveLength(1);
      expect(latest.selectedFiles[0].file.name).toBe("pic.png");
      expect(String(latest.selectedFiles[0].preview)).toMatch(/^data:/);
    });
  });

  it("rejects non-image files with an error toast", async () => {
    const user = userEvent.setup();
    render(<Probe />);

    await setInputFiles(user, [makeFile("doc.pdf", "application/pdf", 10)]);

    expect(toast.error).toHaveBeenCalledWith("Please upload only image files");
    expect(latest.selectedFiles).toHaveLength(0);
  });

  it("rejects files above the configured size limit", async () => {
    const user = userEvent.setup();
    render(<Probe size={1} />); // 1MB cap

    await setInputFiles(user, [
      makeFile("big.png", "image/png", 1.5 * 1024 * 1024),
    ]);

    expect(toast.error).toHaveBeenCalledWith("File size should be less than 1MB");
    expect(latest.selectedFiles).toHaveLength(0);
  });

  it("rejects the whole batch when more files than the limit are chosen", async () => {
    const user = userEvent.setup();
    render(<Probe limit={2} />);

    await setInputFiles(user, [
      makeFile("a.png", "image/png", 5),
      makeFile("b.png", "image/png", 5),
      makeFile("c.png", "image/png", 5),
    ]);

    expect(toast.error).toHaveBeenCalledWith(
      "You can only upload up to 2 media files",
    );
    expect(latest.selectedFiles).toHaveLength(0);
  });

  it("keeps only valid files from a mixed batch", async () => {
    const user = userEvent.setup();
    render(<Probe />);

    await setInputFiles(user, [
      makeFile("ok.png", "image/png", 5),
      makeFile("bad.pdf", "application/pdf", 5),
    ]);

    expect(toast.error).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => {
      expect(latest.selectedFiles).toHaveLength(1);
      expect(latest.selectedFiles[0].file.name).toBe("ok.png");
    });
  });
});
