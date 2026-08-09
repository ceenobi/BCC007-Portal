import { WorkflowContext } from "@upstash/workflow";
import { connectToDB } from "../config/database.js";
import { env } from "../config/keys.js";
import logger from "../config/logger.js";
import User from "../models/user.js";
import { workflowClient } from "./client.js";

const utcToday = () => {
  const now = new Date();
  return {
    month: now.getUTCMonth(),
    day: now.getUTCDate(),
    key: now.toISOString().slice(0, 10),
  };
};

/**
 * Computes the age a user turns on a given (month, day) birthday, falling
 * back to Feb 28 for Feb 29 birthdays in non-leap years.
 */
export function getAgeAtDate(dateOfBirth: Date, month: number, day: number) {
  const birth = new Date(dateOfBirth);
  const now = new Date();
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const beforeBirthday =
    month < birth.getUTCMonth() ||
    (month === birth.getUTCMonth() && day < birth.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

interface BirthdaySweepResult {
  checked: number;
  reminded: number;
  deduplicated: number;
  now: string;
}

/**
 * Scheduled daily sweep that finds opted-in members whose birthday is today
 * and triggers the shared `birthday-reminder` workflow for each. The
 * deterministic `workflowRunId` (`birthday-reminder:${userId}:${date}`)
 * deduplicates against any manual "Remind" action and makes re-runs on the
 * same day no-ops.
 */
export const runBirthdayRemindersWorkflow = async (
  context: WorkflowContext,
): Promise<BirthdaySweepResult> => {
  const members = await context.run("fetch-birthday-members", async () => {
    await connectToDB();
    const today = utcToday();
    const docs = await User.find({
      isOnboarded: true,
      dateOfBirth: { $ne: null },
      disableBirthDate: false,
    })
      .select("_id name email image dateOfBirth disableEmail")
      .lean();
    return docs.filter((doc) => {
      const birth = new Date(doc.dateOfBirth);
      if (Number.isNaN(birth.getTime())) return false;
      // Feb 29 birthdays are celebrated on Feb 28 in non-leap years.
      let month = birth.getUTCMonth();
      let day = birth.getUTCDate();
      if (month === 1 && day === 29 && today.day !== 29) {
        day = 28;
      }
      return month === today.month && day === today.day;
    });
  });

  const result = await context.run("trigger-birthday-reminders", async () => {
    const today = utcToday();
    let reminded = 0;
    let deduplicated = 0;

    for (const member of members) {
      const age = getAgeAtDate(new Date(member.dateOfBirth), today.month, today.day);
      const res = await workflowClient
        .trigger({
          url: `${env.clientUrl}/api/v1/workflow/birthday-reminder`,
          workflowRunId: `birthday-reminder:${member._id.toString()}:${today.key}`,
          body: {
            user: {
              _id: member._id.toString(),
              name: member.name,
              email: member.email,
              disableEmail: member.disableEmail,
            },
            age,
          },
        })
        .then(
          (result) =>
            result as {
              workflowRunId: string;
              deduplicated?: boolean;
            },
        )
        .catch((error: any) => {
          logger.error(
            { err: error },
            `Failed to trigger birthday reminder for user ${member._id}`,
          );
          return null;
        });
      if (res && res.deduplicated) deduplicated += 1;
      else if (res) reminded += 1;
    }

    const summary: BirthdaySweepResult = {
      checked: members.length,
      reminded,
      deduplicated,
      now: new Date().toISOString(),
    };
    logger.info({ ...summary, message: "Birthday reminders sweep complete" });
    return summary;
  });

  return result;
};
