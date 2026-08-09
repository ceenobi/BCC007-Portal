import z from "zod";
import { onboardingSchema } from "~/lib/schema";
import { tryCatchWrapper } from "~/lib/tryCatchWrapper";
import type { OnboardingSchemaType } from "~/types";
import logger from "../config/logger";
import { AuditLogService } from "../services/auditlog-service";
import { auth } from "../services/better-auth";
import { NotificationService } from "../services/notification.service";
import { checkRateLimit } from "../utils/rate-limit";

export async function completeOnboardingProfile(
  request: Request,
  payload: OnboardingSchemaType,
) {
  return tryCatchWrapper(async () => {
    await checkRateLimit(request, "strict");
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    if (!session) {
      logger.error("Unauthorized");
      return Response.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }
    const result = onboardingSchema.safeParse(payload);
    if (!result.success) {
      logger.error("Invalid profile data format");
      return Response.json(
        {
          success: false,
          message: "Invalid dataschema",
          errors: z.treeifyError(result.error),
        },
        { status: 400 },
      );
    }
    const response = await auth.api.updateUser({
      body: {
        name: result.data.name,
        phone: result.data.phone,
        gender: result.data.gender,
        occupation: result.data.occupation,
        location: result.data.location,
        dateOfBirth: result.data.dateOfBirth,
        disableBirthDate: result.data.disableBirthDate,
        disableEmail: result.data.disableEmail,
        disableGender: result.data.disableGender,
        image: result.data.image,
        imagePublicId: result.data.imagePublicId,
      },
      headers: request.headers,
      asResponse: true,
    });
    if (!response.ok) {
      logger.error(
        { status: response.status },
        "Failed to update onboarding profile",
      );
      return response;
    }
    await AuditLogService.record(request, {
      action: "PROFILE_UPDATE",
      category: "security",
      description: "Completed onboarding profile setup",
      details: {
        name: result.data.name,
        phone: result.data.phone,
        gender: result.data.gender,
      },
    });

    NotificationService.send({
      userId: session.user.id,
      type: "profile_updated",
      title: "Profile Updated",
      message: "Your profile information has been updated.",
    });

    const newHeaders = new Headers(response.headers);
    return Response.json(
      { success: true, message: "Profile updated successfully" },
      { status: 200, headers: newHeaders },
    );
  });
}
