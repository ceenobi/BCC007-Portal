import { beforeEach, describe, expect, it, vi } from "vitest";

let attempts: string[] = [];
let getStatuses: number[] = [];
let createCalls = 0;

vi.mock("./keys", () => ({
	env: { paystackSecretKey: "sk_test_dummy_key" },
}));

vi.mock("axios", async (importOriginal) => {
	const actual = await importOriginal<typeof import("axios")>();
	const originalCreate = actual.default.create.bind(actual.default);
	return {
		...actual,
		default: Object.assign(Object.create(actual.default), {
			create: vi.fn((config?: object) => {
				createCalls += 1;
				const inst = originalCreate(config);
				inst.defaults.adapter = async (cfg: any) => {
					const method = (cfg.method ?? "get").toLowerCase();
					attempts.push(method);
					if (method !== "get") {
						throw httpError(cfg, 500);
					}
					const status = getStatuses.shift() ?? 200;
					if (status >= 400) {
						throw httpError(cfg, status);
					}
					return {
						data: { ok: true },
						status,
						statusText: "OK",
						headers: {},
						config: cfg,
					};
				};
				return inst;
			}),
		}),
	};
});

function httpError(config: unknown, status: number): any {
	const err: any = new Error(`HTTP ${status}`);
	err.isAxiosError = true;
	err.config = config;
	err.response = { status, data: {}, headers: {}, config };
	return err;
}

describe("Paystack axios instance transport retries", () => {
	beforeEach(() => {
		vi.resetModules();
		attempts = [];
		getStatuses = [];
		createCalls = 0;
	});

	it("retries GET requests on 5xx until success", async () => {
		const { getPaystack } = await import("./paystack");
		getStatuses = [500, 503, 200];

		const res = await getPaystack().get("/balance");

		expect(res.data.ok).toBe(true);
		expect(attempts.filter((m) => m === "get")).toHaveLength(3);
	});

	it("does not retry POST requests even on 5xx", async () => {
		const { getPaystack } = await import("./paystack");

		await expect(
			getPaystack().post("/transfer", { amount: 1000 }),
		).rejects.toThrow();

		expect(attempts).toEqual(["post"]);
	});

	it("does not retry GET requests on client errors", async () => {
		const { getPaystack } = await import("./paystack");
		getStatuses = [404];

		await expect(getPaystack().get("/charge/verify/x")).rejects.toThrow();

		expect(attempts).toEqual(["get"]);
	});

	it("sets a request timeout on the instance", async () => {
		const { getPaystack } = await import("./paystack");

		expect(getPaystack().defaults.timeout).toBe(15_000);
	});

	it("returns the same singleton instance across calls", async () => {
		const { getPaystack } = await import("./paystack");

		const first = getPaystack();
		const second = getPaystack();

		expect(first).toBe(second);
		expect(createCalls).toBe(1);
	});
});
