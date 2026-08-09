import {
  deleteFromCloudinary,
  getSignedUrl,
  uploadToCloudinary,
} from "../utils/cloudinary";
import type {
  DeleteMediaSchemaType,
  UploadSchemaType,
  UploadSignatureSchemaType,
} from "~/types";
import { env } from "../config/keys";
import logger from "../config/logger";
import { tryCatchWrapper } from "~/lib/tryCatchWrapper";
import { auth } from "../services/better-auth";
import { checkRateLimit } from "../utils/rate-limit";

export async function getUploadSignature(
  request: Request,
  payload: UploadSignatureSchemaType,
) {
  return tryCatchWrapper(async () => {
     await checkRateLimit(request, "strict");
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    const userId = session?.user?.id;
    if (!userId) {
      logger.error("Unauthorized");
      return Response.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }
    const {
      timestamp,
      signature,
      uploadPreset,
      folder,
      eager,
      responsive_breakpoints,
    } = await getSignedUrl(payload.folder);
    return Response.json({
      success: true,
      timestamp,
      signature,
      uploadPreset,
      folder,
      eager,
      responsive_breakpoints,
      cloudName: env.cloudinary.cloudName,
      apiKey: env.cloudinary.apiKey,
    });
  });
}

export async function uploadFile(request: Request, payload: UploadSchemaType) {
  return tryCatchWrapper(async () => {
     await checkRateLimit(request, "strict");
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    const userId = session?.user?.id;
    if (!userId) {
      logger.error("Unauthorized");
      return Response.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const uploadedFiles = await Promise.all(
      payload.files.map((file: string) =>
        uploadToCloudinary(file, {
          folder: `bcc007portal/${payload.folder}`,
          tags: [userId, "onboarding", "members"],
        }),
      ),
    );

    return Response.json({
      success: true,
      message: "File uploaded successfully",
      body: uploadedFiles,
    });
  });
}

export async function deleteFile(
  request: Request,
  payload: DeleteMediaSchemaType,
) {
  return tryCatchWrapper(async () => {
     await checkRateLimit(request, "strict");
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    const userId = session?.user?.id;
    if (!userId) {
      logger.error("Unauthorized");
      return Response.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }
    const deleteResult = await deleteFromCloudinary(payload.publicIds);

    return Response.json({
      success: true,
      message: "File deleted successfully",
      body: deleteResult,
    });
  });
}
