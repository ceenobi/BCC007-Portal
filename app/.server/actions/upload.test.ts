import mongoose from "mongoose";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { deleteFile, getUploadSignature, uploadFile } from "~/.server/actions/upload";
import { auth } from "~/.server/services/better-auth";
import {
  deleteFromCloudinary,
  getSignedUrl,
  uploadToCloudinary,
} from "~/.server/utils/cloudinary";
import { clearTestDB, connectTestDB, disconnectTestDB } from "~/test/helpers/db";

vi.mock("~/.server/config/upstash", () => ({
  redis: {},
  createRatelimit: () => ({ limit: vi.fn() }),
  generalRatelimit: {
    limit: vi.fn(async () => ({
      success: true,
      limit: 100,
      remaining: 99,
      reset: Date.now() + 60_000,
      pending: Promise.resolve(),
    })),
  },
  strictRatelimit: {
    limit: vi.fn(async () => ({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now() + 60_000,
      pending: Promise.resolve(),
    })),
  },
}));

vi.mock("~/.server/services/better-auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));

vi.mock("~/.server/config/redis", () => ({
  default: () => null,
}));

vi.mock("~/.server/utils/cloudinary", () => ({
  getSignedUrl: vi.fn(async () => ({
    timestamp: 1234567890,
    signature: "test-signature",
    uploadPreset: "test",
    folder: "bcc007portal/photos",
    eager: "w_1200",
    responsive_breakpoints: "[]",
  })),
  uploadToCloudinary: vi.fn(async (file: string) => ({
    url: `https://res.cloudinary.com/test/${file}`,
    publicId: file,
  })),
  deleteFromCloudinary: vi.fn(async () => ({
    deleted: ["avatar_abc123"],
  })),
}));

const request = () =>
  new Request("http://localhost/api/v1/uploads", {
    headers: { "x-forwarded-for": "127.0.0.1" },
  });

const session = (role: string, id: string) => ({
  user: { id, name: "Ada Lovelace", email: "ada@example.com", role },
});

const getSessionMock = vi.mocked(auth.api.getSession);
const getSignedUrlMock = vi.mocked(getSignedUrl);
const uploadToCloudinaryMock = vi.mocked(uploadToCloudinary);
const deleteFromCloudinaryMock = vi.mocked(deleteFromCloudinary);

describe("getUploadSignature", () => {
  const userId = new mongoose.Types.ObjectId().toString();

  beforeAll(async () => {
    await connectTestDB();
  });
  afterEach(async () => {
    await clearTestDB();
    vi.clearAllMocks();
  });
  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(() => {
    getSessionMock.mockResolvedValue(session("member", userId) as never);
  });

  it("returns 401 without a session", async () => {
    getSessionMock.mockResolvedValue(null as never);
    const res = await getUploadSignature(request(), { folder: "photos" });
    expect(res.status).toBe(401);
  });

  it("returns the signed upload parameters", async () => {
    const res = await getUploadSignature(request(), { folder: "photos" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(getSignedUrlMock).toHaveBeenCalledWith("photos");
    expect(body.timestamp).toBe(1234567890);
    expect(body.signature).toBe("test-signature");
    expect(body.uploadPreset).toBe("test");
    expect(body.folder).toBe("bcc007portal/photos");
    expect(body.cloudName).toBe("test");
    expect(body.apiKey).toBe("test");
  });
});

describe("uploadFile", () => {
  const userId = new mongoose.Types.ObjectId().toString();

  beforeAll(async () => {
    await connectTestDB();
  });
  afterEach(async () => {
    await clearTestDB();
    vi.clearAllMocks();
  });
  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(() => {
    getSessionMock.mockResolvedValue(session("member", userId) as never);
  });

  it("returns 401 without a session", async () => {
    getSessionMock.mockResolvedValue(null as never);
    const res = await uploadFile(request(), { files: ["data:image/png;base64,AAA"], folder: "avatars" });
    expect(res.status).toBe(401);
  });

  it("uploads each file via Cloudinary", async () => {
    const res = await uploadFile(request(), {
      files: ["data1", "data2"],
      folder: "avatars",
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toBe("File uploaded successfully");
    expect(body.body).toHaveLength(2);
    expect(uploadToCloudinaryMock).toHaveBeenCalledWith("data1", {
      folder: "bcc007portal/avatars",
      tags: [userId, "onboarding", "members"],
    });
    expect(uploadToCloudinaryMock).toHaveBeenCalledWith("data2", {
      folder: "bcc007portal/avatars",
      tags: [userId, "onboarding", "members"],
    });
  });

  it("returns 500 when Cloudinary rejects an upload", async () => {
    uploadToCloudinaryMock.mockRejectedValue(new Error("Cloudinary upload failed") as never);
    const res = await uploadFile(request(), { files: ["data1"], folder: "avatars" });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.message).toBe("Cloudinary upload failed");
  });
});

describe("deleteFile", () => {
  const userId = new mongoose.Types.ObjectId().toString();

  beforeAll(async () => {
    await connectTestDB();
  });
  afterEach(async () => {
    await clearTestDB();
    vi.clearAllMocks();
  });
  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(() => {
    getSessionMock.mockResolvedValue(session("member", userId) as never);
  });

  it("returns 401 without a session", async () => {
    getSessionMock.mockResolvedValue(null as never);
    const res = await deleteFile(request(), { publicIds: ["avatar_abc123"] });
    expect(res.status).toBe(401);
  });

  it("deletes the given public ids via Cloudinary", async () => {
    const res = await deleteFile(request(), {
      publicIds: ["avatar_abc123", "avatar_def456"],
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toBe("File deleted successfully");
    expect(deleteFromCloudinaryMock).toHaveBeenCalledWith([
      "avatar_abc123",
      "avatar_def456",
    ]);
  });
});
