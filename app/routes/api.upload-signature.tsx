import { z } from "zod";
import type { Route } from "./+types/api.upload-signature";
import { getUploadSignature } from "~/.server/actions/upload";
import { UploadSignatureSchema } from "~/lib/schema";

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return Response.json({ message: "Method not allowed" }, { status: 405 });
  }

  try {
    const data = await request.json();
    const result = UploadSignatureSchema.safeParse(data);
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
    return await getUploadSignature(request, result.data);
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
