import {
  RiCheckboxCircleFill,
  RiUserForbidLine,
} from "@remixicon/react";
import { Link } from "react-router";
import Logo from "~/components/navigation/logo";
import { PageSection, PageWrapper } from "~/components/provider/page-wrapper";
import ActionBtn from "~/components/ui/action-btn";
import { buildSeoMeta } from "~/lib/seo";

export function meta() {
  return [
    ...buildSeoMeta({
      title: "Account Deleted - BCC007",
      description:
        "Your BCC007 account has been deleted successfully. We're sorry to see you go.",
      path: "/delete-account-confirmation",
      noindex: true,
    }),
  ];
}

export default function DeleteAccountConfirmation() {
  return (
    <div className="grid grid-cols-12 min-h-screen items-center">
      <div className="col-span-12 lg:col-span-5 lg:col-start-4 h-full">
        <div className="w-full md:max-w-140 mx-auto mt-10 px-4 h-full">
          <Logo size={8} showLogoText={true} classname="text-xl" />
          <PageWrapper className="py-10 space-y-6 flex flex-col h-full justify-center items-center">
            <PageSection index={0} className="w-full max-w-full px-6">
              <div className="relative">
                <div className="p-8 sm:p-12 text-center space-y-4">
                  <div className="relative inline-block">
                    <div className="absolute inset-0 bg-destructive/20 blur-2xl rounded-full animate-pulse" />
                    <div className="relative w-24 h-24 bg-destructive/10 rounded-full flex items-center justify-center mx-auto border border-destructive/40">
                      <RiUserForbidLine className="text-destructive w-12 h-12" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h1 className="text-xl font-bold tracking-tight text-foreground">
                      Account Deleted
                    </h1>
                    <p className="text-base text-muted-foreground">
                      Your BCC007 account has been successfully deleted. We&apos;re
                      sorry to see you go.
                    </p>
                  </div>

                  <div className="bg-muted border rounded-md p-6 space-y-4">
                    <div className="flex gap-4 text-left">
                      <div className="shrink-0 w-10 h-10 rounded-md bg-card border border-border flex items-center justify-center">
                        <RiCheckboxCircleFill
                          size={20}
                          className="text-success"
                        />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">
                          What happens next?
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Your personal data and access have been removed. If you
                          ever wish to return, you&apos;ll need to register again
                          with a new account.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-4 pt-2">
                    <Link to="/auth/register" className="w-full">
                      <ActionBtn
                        text="Create a New Account"
                        type="button"
                        classname="w-full h-11 rounded-md font-bold btn"
                      />
                    </Link>
                    <Link
                      to="/auth/login"
                      className="text-sm font-medium text-muted-foreground hover:underline transition-colors"
                    >
                      Back to Login
                    </Link>
                  </div>
                </div>

                <p className="mt-4 text-center text-sm text-muted-foreground">
                  Need help?{" "}
                  <a
                    href="mailto:support@bcc007.com"
                    className="font-medium text-mainBlue dark:text-lightBlue hover:underline"
                  >
                    Contact Support
                  </a>
                </p>
              </div>
            </PageSection>
          </PageWrapper>
        </div>
      </div>
    </div>
  );
}
