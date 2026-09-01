import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import mongoose from "mongoose";
import { connectToDB } from "../config/database";
import { env } from "../config/keys";
import MongooseUser from "../models/user";
import { workflowClient } from "../workflows/client";

const getOrigin = (url?: string) => {
  if (!url) return "";
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
};

const createAuth = (db: any, client: any) =>
  betterAuth({
    appName: "Bcc007Portal",
    database: mongodbAdapter(db, {
      client,
      transaction: false,
    }),
    databaseHooks: {
      user: {
        create: {
          after: async (user: any) => {
            if (["super_admin"].includes(user.role)) {
              const db = mongoose.connection.db as any;
              await db
                .collection("user")
                .updateOne(
                  { _id: new mongoose.Types.ObjectId(user.id) },
                  { $set: { emailVerified: true } },
                );
            }
          },
        },
      },
    },
    trustedOrigins: [getOrigin(env.clientUrl), getOrigin(env.betterAuthUrl)].filter(
      Boolean,
    ) as string[],
    baseURL: env.betterAuthUrl,
    session: {
      maxAge: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      freshAge: 0,
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60,
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true, // Hardened for production
      sendResetPassword: async ({ user, url }: { user: any; url: string }) => {
        await workflowClient.trigger({
          url: `${env.clientUrl}/api/v1/workflow/password-reset`,
          body: { user: user as User, link: url },
        });
      },
      onPasswordReset: async ({ user }: { user: any }) => {
        await MongooseUser.updateOne(
          { email: user.email },
          { $set: { isSuspended: false, failedLoginAttempts: 0 } },
        );
        await workflowClient.trigger({
          url: `${env.clientUrl}/api/v1/workflow/password-reset-success`,
          body: { user: user as User },
        });
      },
      resetPasswordTokenExpiresIn: 60 * 15, // 15 minutes
      asResponse: true,
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      asResponse: true,
      callbackURL: `${env.clientUrl}/auth/verify-email`,
      emailVerificationTokenExpiresIn: 60 * 15, // 15 minutes
      sendVerificationEmail: async ({
        user,
        url,
      }: {
        user: any;
        url: string;
      }) => {
        if (user.role !== "super_admin") {
          await workflowClient.trigger({
            url: `${env.clientUrl}/api/v1/workflow/verify-account`,
            body: { user: user as User, link: url },
          });
        }
      },
    },
    user: {
      changeEmail: {
        enabled: true,
      },
      deleteUser: {
        enabled: true,
        // beforeDelete: async (user) => {
        //   const userId = new mongoose.Types.ObjectId(user.id);
        //   await Cohort.updateMany(
        //     { members: userId },
        //     { $pull: { members: userId } },
        //   );
        // },
        sendDeleteAccountVerification: async ({ user, url }) => {
          await workflowClient.trigger({
            url: `${env.clientUrl}/api/v1/workflow/delete-account-request`,
            body: { user: user as User, link: url },
          });
        },
      },
      additionalFields: {
        role: {
          type: "string",
          input: true,
          enum: ["member", "admin", "super_admin"],
          defaultValue: "member",
        },
        isOnboarded: {
          type: "boolean",
          defaultValue: false,
        },
        tourPending: {
          type: "boolean",
          defaultValue: false,
        },
        gender: {
          type: "string",
          enum: ["male", "female", "other"],
          required: false,
        },
        phone: {
          type: "string",
          required: false,
        },
        imagePublicId: {
          type: "string",
          required: false,
        },
        occupation: {
          type: "string",
          required: false,
        },
        location: {
          type: "string",
          required: false,
        },
        dateOfBirth: {
          type: "date",
          required: false,
        },
        disableBirthDate: {
          type: "boolean",
          defaultValue: false,
        },
        disableEmail: {
          type: "boolean",
          defaultValue: false,
        },
        disableGender: {
          type: "boolean",
          defaultValue: false,
        },
      },
    },
    advanced: {
      cookiePrefix: "__bcc007",
      crossSubDomainCookies: {
        enabled: false,
      },
      defaultCookieAttributes: {
        sameSite: "lax",
        secure: env.nodeEnv === "production",
        httpOnly: true,
        path: "/",
      },
    },
  });

type AuthInstance = ReturnType<typeof createAuth>;
let authInstance: AuthInstance | null = null;

const buildAuth = () => {
  authInstance = createAuth(
    mongoose.connection.db,
    mongoose.connection.getClient(),
  );
  return authInstance;
};

export const getAuth = async (): Promise<AuthInstance> => {
  if (authInstance && mongoose.connection.readyState === 1) return authInstance;
  await connectToDB();
  return buildAuth();
};

// Rebuild the auth adapter whenever MongoDB (re)connects so it never holds a
// stale/undefined `db` reference (which crashes sign-in with
// "Cannot read properties of undefined (reading 'collection')").
if (mongoose.connection.listenerCount("reconnected") === 0) {
  mongoose.connection.on("reconnected", () => {
    // Rebuild lazily on next access rather than mid-reconnect, in case the
    // `db` handle is not fully ready yet. `authInstance` will be rebuilt by
    // the proxy's getter or the next getAuth() call.
    authInstance = null;
  });
}
if (mongoose.connection.listenerCount("disconnected") === 0) {
  mongoose.connection.on("disconnected", () => {
    authInstance = null;
  });
}

// Expose `auth` as a live proxy so `auth.api.*` / `auth.handler` always reflect
// the current, freshly-built instance (rebuilt on reconnect) instead of a
// disconnected singleton.
export const auth = new Proxy({} as AuthInstance, {
  get(_, prop) {
    if (!authInstance) {
      if (mongoose.connection.readyState !== 1) {
        throw new Error(
          "better-auth is not ready yet. MongoDB is not connected.",
        );
      }
      buildAuth();
    }
    return Reflect.get(authInstance!, prop);
  },
});

// Ensure the proxy holds a live instance before first use (eager init).
await getAuth();
export type Session = typeof auth.$Infer.Session;

export type User = typeof auth.$Infer.Session.user;
