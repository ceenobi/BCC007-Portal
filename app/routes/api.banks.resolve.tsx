import { z } from "zod";
import { resolveBankAccount } from "~/.server/actions/bank-data";
import { resolveBankAccountSchema } from "~/lib/schema";
import type { Route } from "./+types/api.banks.resolve";

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return Response.json({ message: "Method not allowed" }, { status: 405 });
  }

  try {
    const data = await request.json();
    const result = resolveBankAccountSchema.safeParse(data);
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
    return await resolveBankAccount(request, result.data);
  } catch (error: any) {
    if (error instanceof Response) throw error;
    return Response.json(
      {
        success: false,
        message: "Invalid JSON payload",
      },
      { status: 400 },
    );
  }
}
