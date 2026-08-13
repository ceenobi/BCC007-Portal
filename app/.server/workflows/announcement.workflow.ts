import { WorkflowContext } from "@upstash/workflow";
import { connectToDB } from "../config/database.js";
import logger from "../config/logger.js";
import User from "../models/user.js";
import type { User as BetterAuthUser } from "../services/better-auth";
import { NotificationService } from "../services/notification.service.js";
import emailService from "../services/email.service";

interface AnnouncementCreatedPayload {
  announcement: {
    _id: string;
    title: string;
    content: string;
  };
}

interface BroadcastResult {
  notified: number;
  emailed: number;
  now: string;
}

/**
 * Broadcasts a newly published announcement to all onboarded members: an
 * in-app notification plus an email (unless the member disabled email). The
 * action triggers this workflow once per published announcement using a
 * deterministic `workflowRunId` (`announcement-created:${announcementId}`),
 * so QStash deduplicates re-publishes of the same announcement.
 */
export const announcementCreatedWorkflow = async (
  context: WorkflowContext<AnnouncementCreatedPayload>,
): Promise<BroadcastResult> => {
  const payload = context.requestPayload;
  if (!payload) {
    logger.error("No requestPayload received in announcementCreatedWorkflow");
    return { notified: 0, emailed: 0, now: new Date().toISOString() };
  }
  const { announcement } = payload;

  const members = await context.run("fetch-announcement-members", async () => {
    await connectToDB();
    return await User.find({ isOnboarded: true })
      .select("_id name email disableEmail")
      .lean();
  });

  let notified = 0;
  let emailed = 0;

  await context.run("send-announcement-notifications", async () => {
    await Promise.allSettled(
      members.map(async (member) => {
        await NotificationService.send({
          userId: member._id.toString(),
          type: "announcement",
          title: announcement.title,
          message: announcement.content,
          metadata: { announcementId: announcement._id },
        });
        notified += 1;
      }),
    );
  });

  await context.run("send-announcement-emails", async () => {
    await Promise.allSettled(
      members
        .filter((member) => !member.disableEmail)
        .map(async (member) => {
          await emailService.sendAnnouncementEmail({
            user: { ...member } as unknown as BetterAuthUser,
            announcement,
          });
          emailed += 1;
        }),
    );
  });

  const summary: BroadcastResult = {
    notified,
    emailed,
    now: new Date().toISOString(),
  };
  logger.info({
    ...summary,
    message: "Announcement broadcast complete",
  });
  return summary;
};