import { redirect } from "react-router";
import { z } from "zod";
import { uploadFile } from "~/.server/actions/upload";
import { uploadSchema } from "~/lib/schema";
import type { Route } from "./+types/api.upload";

export async function loader() {
	return redirect("/");
}

export async function action({ request }: Route.ActionArgs) {
	if (request.method !== "POST") {
		return Response.json({ message: "Method not allowed" }, { status: 405 });
	}

	try {
		const data = await request.json();
		const result = uploadSchema.safeParse(data);

		if (!result.success) {
			return Response.json(
				{
					success: false,
					message: "Invalid payload",
					errors: z.treeifyError(result.error),
				},
				{ status: 400 },
			);
		}

		return await uploadFile(request, result.data);
	} catch (_error) {
		return Response.json(
			{
				success: false,
				message: "Invalid JSON payload",
			},
			{ status: 400 },
		);
	}
}
