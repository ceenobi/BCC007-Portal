import { MongoMemoryServer } from "mongodb-memory-server";

let mongod: MongoMemoryServer | undefined;

/**
 * Starts one in-memory MongoDB for the entire test run. The URI is shared to
 * test workers via `provide`, read back in `vitest.setup.ts` with `inject`.
 */
export default async function setup({
	provide,
}: {
	provide: (key: string, value: unknown) => void;
}) {
	process.env.NODE_ENV = "test";
	mongod = await MongoMemoryServer.create();
	provide("mongoUri", mongod.getUri());

	return async () => {
		await mongod?.stop({ force: true });
	};
}
