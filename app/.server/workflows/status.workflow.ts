import { WorkflowContext } from "@upstash/workflow";
import { connectToDB } from "../config/database.js";
import logger from "../config/logger.js";
import Event from "../models/event.js";
import { NotificationService } from "../services/notification.service.js";
import { invalidateCache } from "../utils/cache.js";

type EventStatus = "upcoming" | "ongoing" | "completed" | "cancelled";

interface ActiveEvent {
  _id: string;
  title: string;
  date: Date;
  status: EventStatus;
}

interface StatusUpdateResult {
  checked: number;
  ongoing: number;
  completed: number;
  now: string;
}

const utcDay = (date: Date) => date.toISOString().slice(0, 10);

export function computeNextStatus(
  event: { date: Date; status: EventStatus },
  now: Date,
): EventStatus | null {
  const start = new Date(event.date);
  if (utcDay(now) > utcDay(start)) {
    return "completed";
  }
  if (event.status === "upcoming" && now.getTime() >= start.getTime()) {
    return "ongoing";
  }
  return null;
}

export const runStatusUpdatesWorkflow = async (
  context: WorkflowContext,
): Promise<StatusUpdateResult> => {
  const events = await context.run("fetch-active-events", async () => {
    await connectToDB();
    const docs = await Event.find({
      status: { $in: ["upcoming", "ongoing"] },
    })
      .select("_id title date status")
      .lean();
    return docs as unknown as ActiveEvent[];
  });

  const result = await context.run("apply-status-updates", async () => {
    const now = new Date();
    const operations: Array<{
      updateOne: {
        filter: { _id: string };
        update: { $set: { status: EventStatus; updatedAt: Date } };
      };
    }> = [];
    let ongoing = 0;
    let completed = 0;

    for (const event of events) {
      const nextStatus = computeNextStatus(event, now);
      if (!nextStatus) continue;
      if (nextStatus === "ongoing") ongoing += 1;
      else completed += 1;
      operations.push({
        updateOne: {
          filter: { _id: event._id },
          update: { $set: { status: nextStatus, updatedAt: now } },
        },
      });
    }

    if (operations.length > 0) {
      await Event.bulkWrite(operations);
      await invalidateCache("events:*");

      // Notify organizers and interested members of transitions. Idempotent by
      // construction: the sweep only fires once per status change because
      // computeNextStatus returns null for events already in the target state.
      await context.run("notify-event-status-transitions", async () => {
        const transitionedIds = operations.map((op) => op.updateOne.filter._id);
        const docs = await Event.find({ _id: { $in: transitionedIds } })
          .select("_id title status organizer interestedMembers")
          .lean();

        for (const doc of docs) {
          if (doc.status !== "ongoing" && doc.status !== "completed") continue;
          const recipients = new Set<string>();
          if (doc.organizer) recipients.add(doc.organizer.toString());
          for (const member of doc.interestedMembers ?? []) {
            if (member) recipients.add(member.toString());
          }

          const label =
            doc.status === "ongoing"
              ? {
                  type: "event_ongoing",
                  title: "Event Ongoing",
                  message: `The event "${doc.title}" is now ongoing.`,
                }
              : {
                  type: "event_completed",
                  title: "Event Completed",
                  message: `The event "${doc.title}" has been completed.`,
                };

          await Promise.allSettled(
            [...recipients].map((userId) =>
              NotificationService.send({
                userId,
                type: label.type as any,
                title: label.title,
                message: label.message,
                metadata: { eventId: doc._id.toString() },
              }),
            ),
          );
        }
      });
    }

    const summary: StatusUpdateResult = {
      checked: events.length,
      ongoing,
      completed,
      now: now.toISOString(),
    };
    logger.info({ ...summary, message: "Event status sweep complete" });
    return summary;
  });

  return result;
};
