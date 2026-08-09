import { dehydrate } from "@tanstack/react-query";
import { useState } from "react";
import {
  NavLink,
  Outlet,
  useFetcher,
  useLocation,
  useOutletContext,
} from "react-router";
import {
  updateAvatarRequest,
  updatePasswordRequest,
  updateProfileRequest,
} from "~/.server/actions/auth";
import { PageSection, PageWrapper } from "~/components/provider/page-wrapper";
import ActionBtn from "~/components/ui/action-btn";
import { AlertBox } from "~/components/ui/alert-box";
import BankInfo from "~/features/settings/account/bank-info";
import Privacy from "~/features/settings/account/privacy";
import UpdatePassword from "~/features/settings/account/update-password";
import UpdateProfile from "~/features/settings/account/update-profile";
import UploadAvatar from "~/features/settings/account/upload-avatar";
import { getQueryClientRsc } from "~/lib/getQueryClient";
import { cn } from "~/lib/utils";
import { getUserBankAccountQuery } from "~/queries/bank";
import type { SessionUser } from "~/types";
import type { Route } from "./+types/route";
import { saveBankAccount } from "~/.server/actions/bank-data";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Settings | BCC007" },
    {
      name: "description",
      content: "Manage your settings and session management.",
    },
  ];
}

export async function action({ request }: Route.ActionArgs) {
  const payload = await request.json();
  if (payload.intent === "update-profile") {
    return await updateProfileRequest(request, payload);
  }
  if (payload.intent === "upload-avatar") {
    return await updateAvatarRequest(request, payload);
  }
  if (payload.intent === "update-password") {
    return await updatePasswordRequest(request, payload);
  }
  if (payload.intent === "update-bank") {
    return await saveBankAccount(request, payload);
  }
}

export async function loader({ request }: Route.LoaderArgs) {
  const queryClient = getQueryClientRsc();
  const { PaystackService } = await import(
    "~/.server/services/paystack.service"
  );
  const banks = await PaystackService.getBanks();
  const bankDetails = await queryClient.ensureQueryData(
    getUserBankAccountQuery(request),
  );
  return {
    dehydratedState: dehydrate(queryClient),
    bankDetails,
    banks
  };
}

export default function Settings({ loaderData }: Route.ComponentProps) {
  const { banks, bankDetails } = loaderData;
  const [activeForm, setActiveForm] = useState<
    "profile-form" | "password-form" | "privacy-form" | "bank-form" | undefined
  >(undefined);
  const { user } = useOutletContext() as { user: SessionUser };
  const fetcher = useFetcher({ key: activeForm });
  const location = useLocation();
  const currentPath = location.pathname === "/dashboard/settings";

  return (
    <PageWrapper>
      <PageSection index={0} className="space-y-8 px-4 xl:px-8">
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-2">
            <h1 className="text-xl font-semibold tracking-tight leading-tight text-foreground">
              Settings
            </h1>
            <p className="leading-snug text-sm text-mainGray dark:text-muted-foreground">
              General configuration, privacy, and lifecycle controls
            </p>
          </div>
          {currentPath && (
            <ActionBtn
              form={activeForm}
              text="Save changes"
              type="submit"
              size="sm"
              disabled={fetcher.state !== "idle" || !activeForm}
              loading={fetcher.state !== "idle"}
              classname="hidden md:flex btn"
            />
          )}
        </div>
        <div className="flex justify-between items-start gap-4">
          <div className="flex gap-4 md:gap-8 mb-8 border-b w-full">
            {["settings", "security", "audit", "subscription"].map((s) => (
              <NavLink
                key={s}
                to={
                  s === "settings"
                    ? "/dashboard/settings"
                    : `/dashboard/settings/${s}`
                }
                prefetch="intent"
                end
                className={({ isActive }) =>
                  cn(
                    "capitalize py-2 font-semibold text-sm border-b-2 transition-colors duration-300 ease-in-out truncate",
                    isActive
                      ? "border-mainBlue dark:border-lightBlue text-mainBlue dark:text-lightBlue"
                      : "border-transparent text-muted-foreground hover:border-mainBlue/40 dark:hover:border-lightBlue/40",
                  )
                }
              >
                {s === "settings" ? "Account" : s}
              </NavLink>
            ))}
          </div>
        </div>
      </PageSection>
      {currentPath ? (
        <>
          <PageSection index={1} className="mt-4 space-y-8 px-4 xl:px-8">
            <AlertBox
              showAlert={fetcher.data && !fetcher.data?.success}
              title="Error"
              description={
                fetcher.data?.message || "An error occurred. Please try again."
              }
              variant="destructive"
            />
            <UploadAvatar />
            <UpdateProfile
              setActiveForm={setActiveForm}
              user={user}
              activeForm={activeForm}
            />
            <UpdatePassword
              setActiveForm={setActiveForm}
              user={user}
              activeForm={activeForm}
            />
            <BankInfo
              setActiveForm={setActiveForm}
              user={user}
              activeForm={activeForm}
              bankDetails={bankDetails}
              banks={banks}
            />
            <Privacy
              setActiveForm={setActiveForm}
              user={user}
              activeForm={activeForm}
            />
            <ActionBtn
              text="Save changes"
              type="submit"
              form={activeForm}
              disabled={fetcher.state !== "idle" || !activeForm}
              loading={fetcher.state !== "idle"}
              classname="md:hidden btn w-full"
            />
          </PageSection>
        </>
      ) : (
        <Outlet context={{ user }} />
      )}
    </PageWrapper>
  );
}
