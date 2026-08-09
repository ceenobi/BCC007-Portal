import { Badge } from "~/components/ui/badge";
import { useWaveAnimation } from "~/hooks/usePageAnimation";
import { cn } from "~/lib/utils";
import type { Route } from "./+types/_layout.terms";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Terms of Service — BCC007Pay" },
    {
      name: "description",
      content:
        "The terms and conditions that govern your use of BCC007Pay, the BCC007 alumni community platform.",
    },
  ];
}

const LAST_UPDATED = "August 9, 2026";

interface TermsSection {
  title: string;
  body: string[];
  items?: string[];
}

const sections: TermsSection[] = [
  {
    title: "1. Acceptance of These Terms",
    body: [
      "These Terms of Service (\"Terms\") govern your access to and use of the BCC007Pay platform, including the website, dashboard and related services (collectively, the \"Service\"), operated by BCC007 (\"we\", \"us\" or \"our\") for the benefit of the BCC007 alumni community.",
      "By creating an account, signing in or using the Service, you agree to be bound by these Terms. If you do not agree, you must not use the Service.",
    ],
  },
  {
    title: "2. Eligibility and Membership",
    body: [
      "The Service is intended for members of the BCC007 alumni community of Brilliant Child College. Membership is invite-only: you may only use the Service after you have been invited by a community administrator or an existing member.",
      "By accepting an invitation and creating an account, you confirm that the information you provide is accurate, complete and current, and that you are at least 18 years old.",
    ],
  },
  {
    title: "3. Your Account and Security",
    body: [
      "You are responsible for safeguarding your account credentials, including your password and any verification codes sent to your email address.",
      "You agree to notify us promptly of any unauthorised access to or use of your account. You are responsible for all activity that occurs under your account, whether or not you authorised it.",
      "We may suspend or close your account if we reasonably believe it has been compromised or is being used in breach of these Terms.",
    ],
  },
  {
    title: "4. Onboarding and Profile Information",
    body: [
      "Before you can use the full Service you may be asked to complete onboarding, including providing your bank account details so that transfers from the group balance can be sent to you.",
      "You agree to keep your profile information accurate and up to date. You may manage and correct your details from the Settings page at any time.",
      "You control the visibility of sensitive profile fields such as your birth date, gender and email address from the Privacy controls in your account settings.",
    ],
  },
  {
    title: "5. Payments, Dues and Donations",
    body: [
      "The Service lets you make payments to the community, including membership dues, donations and event payments. Payments are processed by Paystack, a third-party payment provider.",
      "All payments are in the currency and amounts you authorise at the point of payment. Payment confirmations are displayed in the dashboard and emailed to you.",
      "Payments, dues and donations fund the group's activities. Unless required by applicable law or by Paystack, payments once confirmed are generally non-refundable, except where a payment was made in error or was not authorised by you.",
    ],
  },
  {
    title: "6. Transfers",
    body: [
      "If you have permission, you may initiate transfers from the group balance to member bank accounts. Transfers are processed through Paystack and are subject to Paystack's terms and applicable transfer fees.",
      "By initiating a transfer you confirm that you have the authority to do so and that the recipient bank details you provide are accurate. We are not liable for transfers sent to incorrect details that you provided.",
      "Transfers may be subject to review, verification and anti-fraud controls. We may refuse or reverse a transfer where we reasonably suspect fraud, error or a breach of these Terms.",
    ],
  },
  {
    title: "7. Subscriptions",
    body: [
      "Membership dues may be offered as a recurring monthly subscription so you do not miss a payment. By subscribing you authorise recurring charges at the cadence and amount displayed at checkout.",
      "You can cancel your subscription at any time from the Settings page. Cancellation stops future charges; it does not retroactively refund charges already processed.",
    ],
  },
  {
    title: "8. Events, Reminders and Communications",
    body: [
      "The Service provides information about community events, birthdays and other activities, and sends you notifications and reminder emails.",
      "You can adjust which communications you receive, including turning off email notifications, from the Settings page. We may still send you service-critical messages, such as account verification or security notices.",
    ],
  },
  {
    title: "9. Acceptable Use",
    body: [
      "You agree not to misuse the Service, including by:",
    ],
    items: [
      "using the Service for any unlawful purpose or to violate the rights of others;",
      "attempting to access another member's account, or data you are not authorised to view;",
      "interfering with, disrupting or attempting to gain unauthorised access to the Service, its servers or connected networks;",
      "impersonating any person or entity, or misrepresenting your affiliation;",
      "harassing, abusing or threatening any member, administrator or staff;",
      "using the Service to defraud the community, including submitting false payment or transfer records.",
    ],
  },
  {
    title: "10. Intellectual Property",
    body: [
      "The Service, including its software, design, text, graphics and branding, is owned by or licensed to BCC007 and is protected by applicable intellectual property laws.",
      "You retain ownership of the content and information you provide. By submitting it to the Service, you grant us a limited licence to store, process and display it solely to operate the Service and fulfil your requests.",
    ],
  },
  {
    title: "11. Termination",
    body: [
      "You may stop using the Service at any time and request deletion of your account from the Settings page or by contacting us.",
      "We may suspend or terminate your access if you breach these Terms, if required by law, or if continued provision of the Service to you would create an undue risk or liability.",
      "On termination, your right to use the Service ends immediately. Sections that by their nature should survive — including payments, acceptable use, disclaimers, limitation of liability and indemnification — will survive termination.",
    ],
  },
  {
    title: "12. Disclaimer of Warranties",
    body: [
      "The Service is provided on an \"as is\" and \"as available\" basis, without warranties of any kind, whether express or implied, including implied warranties of merchantability, fitness for a particular purpose and non-infringement.",
      "We do not warrant that the Service will be uninterrupted, error-free or secure, or that payment, transfer or notification processing will always succeed.",
    ],
  },
  {
    title: "13. Limitation of Liability",
    body: [
      "To the maximum extent permitted by law, BCC007 and its members, administrators and volunteers will not be liable for any indirect, incidental, special, consequential or punitive damages, or for any loss of profits, data or goodwill, arising out of or related to your use of the Service.",
      "Our total aggregate liability arising out of or related to these Terms or the Service will not exceed the greater of the amount you paid us in the twelve (12) months preceding the claim or one hundred dollars ($100).",
      "We are not liable for the acts or omissions of third-party processors such as Paystack, or for any delay or failure caused by circumstances beyond our reasonable control.",
    ],
  },
  {
    title: "14. Indemnification",
    body: [
      "To the maximum extent permitted by law, you agree to indemnify and hold harmless BCC007 and its members, administrators and volunteers from and against any claims, damages, liabilities and expenses arising out of your use of the Service, your breach of these Terms, or your violation of any law or the rights of a third party.",
    ],
  },
  {
    title: "15. Changes to These Terms",
    body: [
      "We may update these Terms from time to time to reflect changes to the Service or legal requirements. When we make material changes, we will update the \"Last updated\" date above and take reasonable steps to notify you, such as through the Service or by email.",
      "Your continued use of the Service after the changes take effect constitutes your acceptance of the revised Terms.",
    ],
  },
  {
    title: "16. Governing Law",
    body: [
      "These Terms are governed by the laws of the Federal Republic of Nigeria, without regard to its conflict of laws principles.",
      "Any dispute arising out of or related to these Terms or the Service will be subject to the exclusive jurisdiction of the courts of Nigeria.",
    ],
  },
  {
    title: "17. Contact Us",
    body: [
      "Questions about these Terms? Send us a message from the Contact page and we will get back to you as soon as possible.",
    ],
  },
];

export default function Terms() {
  const header = useWaveAnimation({ threshold: 0.1, staggerDelay: 80 });
  const content = useWaveAnimation({ threshold: 0.1, staggerDelay: 60 });

  return (
    <main className="py-10 pb-20 md:py-20 max-w-6xl mx-auto px-4">
      <div className="mt-20 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-3">
          <nav
            aria-label="Table of contents"
            className="lg:sticky lg:top-32 space-y-1 border border-gray-200 dark:border-gray-700 bg-white dark:bg-lightGray rounded-xl p-4"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-mainGray dark:text-muted-foreground px-2 pb-2">
              On this page
            </p>
            {sections.map((section) => (
              <a
                key={section.title}
                href={`#${section.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                className="block px-2 py-1.5 text-sm text-mainGray dark:text-muted-foreground hover:text-lightBlue hover:bg-lightBlue/10 rounded-lg transition-colors"
              >
                {section.title.replace(/^\d+\.\s*/, "")}
              </a>
            ))}
          </nav>
        </div>
        <div ref={content.containerRef} className="lg:col-span-9 space-y-10">
          <header
            ref={header.containerRef}
            className="space-y-4"
          >
            <Badge
              style={header.getItemStyle(0)}
              className="bg-lightBlue/50 text-mainBlue dark:text-white"
            >
              Terms of Service
            </Badge>
            <h1
              style={header.getItemStyle(1)}
              className={header.getItemClassName("italic text-foreground font-medium tracking-tight text-[40px] lg:text-5xl sm:leading-none")}
            >
              The rules of the road
            </h1>
            <p
              style={header.getItemStyle(2)}
              className={header.getItemClassName("text-mainGray dark:text-muted-foreground leading-7 max-w-2xl")}
            >
              Please read these Terms carefully — they govern your use of the
              BCC007Pay platform. Last updated {LAST_UPDATED}.
            </p>
          </header>

          {sections.map((section, index) => (
            <section
              key={section.title}
              id={section.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}
              style={content.getItemStyle(index)}
              className={content.getItemClassName("scroll-mt-28")}
            >
              <h2 className="font-grotesk font-bold text-2xl tracking-tight text-mainBlack dark:text-white">
                {section.title}
              </h2>
              <div className="mt-4 space-y-4">
                {section.body.map((paragraph, i) => (
                  <p
                    key={i}
                    className={cn(
                      "text-mainGray dark:text-muted-foreground leading-7",
                      section.items && i === section.body.length - 1
                        ? "mb-0"
                        : "",
                    )}
                  >
                    {paragraph}
                  </p>
                ))}
                {section.items && (
                  <ul className="list-disc pl-6 space-y-2">
                    {section.items.map((item, i) => (
                      <li
                        key={i}
                        className="text-mainGray dark:text-muted-foreground leading-7"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          ))}

          <div className="border-t border-gray-200 dark:border-gray-700 pt-6 text-sm text-mainGray dark:text-muted-foreground">
            These Terms were last updated on {LAST_UPDATED}.
          </div>
        </div>
      </div>
    </main>
  );
}
