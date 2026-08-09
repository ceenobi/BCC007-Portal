import { WorkflowContext } from "@upstash/workflow";
import { connectToDB } from "../config/database.js";
import logger from "../config/logger.js";
import { getPaystack } from "../config/paystack.js";
import Payment from "../models/payment.js";
import User from "../models/user.js";
import { invalidateCache } from "../utils/cache.js";

interface LocalSubscription {
  _id: string;
  userId: string;
  reference: string;
  paystackSubscriptionId?: string | null;
  paystackEmailToken?: string | null;
  paystackCustomerId?: string | null;
  nextPaymentDate?: Date | null;
  subscriptionStatus?: string | null;
  isRecurring?: boolean;
}

interface SubscriptionSyncResult {
  checked: number;
  active: number;
  cancelled: number;
  expired: number;
  backfilled: number;
  deletedUserCancelled: number;
  now: string;
}

const mapRemoteStatus = (
  status?: string,
): "cancelled" | "expired" | null => {
  if (!status || status === "cancelled") return "cancelled";
  if (status === "expired" || status === "non-renewing") return "expired";
  return null;
};

export const runSubscriptionSyncWorkflow = async (
  context: WorkflowContext,
): Promise<SubscriptionSyncResult> => {
  const local = await context.run("fetch-local-subscriptions", async () => {
    await connectToDB();
    const docs = await Payment.find({
      paymentType: "membership_dues",
      $or: [
        { subscriptionStatus: "active", isRecurring: true },
        { isRecurring: true, subscriptionStatus: { $exists: false } },
      ],
    })
      .select(
        "_id userId reference paystackSubscriptionId paystackEmailToken paystackCustomerId nextPaymentDate subscriptionStatus isRecurring",
      )
      .lean();
    return docs as unknown as LocalSubscription[];
  });

  const result = await context.run("reconcile-with-paystack", async () => {
    const now = new Date();
    let active = 0;
    let cancelled = 0;
    let expired = 0;
    let backfilled = 0;
    let deletedUserCancelled = 0;

    const updateOps: Array<{
      updateOne: {
        filter: { _id: string };
        update: { $set: Record<string, unknown> };
      };
    }> = [];

    const uniqueCodes = [
      ...new Set(
        local
          .map((s) => s.paystackSubscriptionId)
          .filter((c): c is string => Boolean(c)),
      ),
    ];

    const remoteStatuses = new Map<string, "cancelled" | "expired">();
    for (const code of uniqueCodes) {
      try {
        const { data } = await getPaystack().get(`/subscription/${code}`);
        const remote = data?.data ?? null;
        if (!remote) {
          remoteStatuses.set(code, "cancelled");
          continue;
        }
        const mapped = mapRemoteStatus(remote.status);
        if (mapped) remoteStatuses.set(code, mapped);
        if (remote.email_token) {
          remoteStatuses.set(`token:${code}`, remote.email_token);
        }
      } catch (error: any) {
        if (error.response?.status === 404) {
          remoteStatuses.set(code, "cancelled");
          continue;
        }
        logger.error(
          `Subscription sync: failed to fetch remote subscription ${code}:`,
          error.response?.data?.message || error.message || error,
        );
      }
    }

    const activeUserIds = local.map((s) => s.userId);
    const existingUsers = await User.find({ _id: { $in: activeUserIds } })
      .select("_id")
      .lean();
    const existingUserSet = new Set(
      existingUsers.map((u) => String(u._id)),
    );

    for (const sub of local) {
      const code = sub.paystackSubscriptionId;

      if (code) {
        const status = remoteStatuses.get(code);
        if (status === "cancelled") {
          updateOps.push({
            updateOne: {
              filter: { _id: sub._id },
              update: {
                $set: {
                  subscriptionStatus: "cancelled",
                  isRecurring: false,
                },
              },
            },
          });
          cancelled += 1;
          continue;
        }
        if (status === "expired") {
          updateOps.push({
            updateOne: {
              filter: { _id: sub._id },
              update: {
                $set: {
                  subscriptionStatus: "expired",
                  isRecurring: false,
                },
              },
            },
          });
          expired += 1;
          continue;
        }

        active += 1;
        const token = remoteStatuses.get(`token:${code}`);
        if (token && sub.paystackEmailToken !== token) {
          updateOps.push({
            updateOne: {
              filter: { _id: sub._id },
              update: { $set: { paystackEmailToken: token } },
            },
          });
          backfilled += 1;
        }
        continue;
      }

      const userExists = existingUserSet.has(sub.userId);
      if (!userExists) {
        deletedUserCancelled += 1;
        updateOps.push({
          updateOne: {
            filter: { _id: sub._id },
            update: {
              $set: {
                subscriptionStatus: "cancelled",
                isRecurring: false,
              },
            },
          },
        });
        continue;
      }

      try {
        const txRes = await getPaystack().get(
          `/transaction/verify/${sub.reference}`,
        );
        const tx = txRes.data?.data;
        const customerId = tx?.customer?.id;
        if (!customerId) {
          throw new Error("Could not determine customer ID from transaction");
        }
        const subRes = await getPaystack().get(`/subscription`, {
          params: { customer: customerId },
        });
        const activeSub = (subRes.data?.data as any[])?.find(
          (s: any) => s.status === "active",
        );

        if (activeSub?.subscription_code) {
          updateOps.push({
            updateOne: {
              filter: { _id: sub._id },
              update: {
                $set: {
                  paystackSubscriptionId: activeSub.subscription_code,
                  paystackEmailToken: activeSub.email_token || "",
                  subscriptionStatus: "active",
                  isRecurring: true,
                },
              },
            },
          });
          backfilled += 1;
          active += 1;
        } else {
          updateOps.push({
            updateOne: {
              filter: { _id: sub._id },
              update: {
                $set: {
                  subscriptionStatus: "cancelled",
                  isRecurring: false,
                },
              },
            },
          });
          cancelled += 1;
        }
      } catch (error: any) {
        logger.error(
          `Subscription sync: failed to backfill code for reference ${sub.reference}:`,
          error.response?.data?.message || error.message || error,
        );
      }
    }

    if (updateOps.length > 0) {
      await Payment.bulkWrite(updateOps);
      await Promise.all([
        invalidateCache("payments:user:*"),
        invalidateCache("payments:group:*"),
      ]);
    }

    const summary: SubscriptionSyncResult = {
      checked: local.length,
      active,
      cancelled,
      expired,
      backfilled,
      deletedUserCancelled,
      now: now.toISOString(),
    };
    logger.info({ ...summary, message: "Subscription sync sweep complete" });
    return summary;
  });

  return result;
};
