import { Badge } from "~/components/ui/badge";
import { useWaveAnimation } from "~/hooks/usePageAnimation";
import { buildSeoMeta, webPageSchema } from "~/lib/seo";
import { cn } from "~/lib/utils";
import type { Route } from "./+types/_layout.privacy";

export function meta({}: Route.MetaArgs) {
  return [
    ...buildSeoMeta({
      title: "Privacy Policy - BCC007",
      description:
        "How BCC007 collects, uses and protects the personal information of its alumni community on the BCC007 platform.",
      path: "/privacy",
    }),
    webPageSchema({
      title: "Privacy Policy - BCC007",
      description: "How BCC007 protects the personal information of its alumni community.",
      path: "/privacy",
    }),
  ];
}

const LAST_UPDATED = "August 9, 2026";

interface PrivacySection {
  title: string;
  body: string[];
  items?: string[];
}

const sections: PrivacySection[] = [
  {
    title: "1. Introduction",
    body: [
      "This Privacy Policy explains how BCC007 (\"we\", \"us\" or \"our\") collects, uses, discloses and protects the personal information of members of the BCC007 alumni community who use the BCC007Pay platform (the \"Service\").",
      "By creating an account or using the Service, you agree to the practices described in this policy.",
    ],
  },
  {
    title: "2. Information We Collect",
    body: ["We collect information you provide directly, information collected automatically, and information from third parties:"],
    items: [
      "Account information — your name, email address, phone number and password (stored securely and hashed).",
      "Profile information — occupation, location, gender, date of birth and profile photo.",
      "Financial information — bank account details you provide during onboarding so transfers from the group balance can reach you, and a record of your payments, dues, donations and transfers.",
      "Community data — events you are interested in, birthdays, support tickets, notifications and your activity in the Service.",
      "Usage data — how you interact with the Service, including pages visited, features used and audit-log entries.",
      "Device and technical data — IP address, browser type and device information collected automatically.",
    ],
  },
  {
    title: "3. How We Use Your Information",
    body: ["We use your information to:"],
    items: [
      "operate, maintain and personalise the Service, including your dashboard, member directory and profile;",
      "process and confirm payments, dues, donations and transfers you authorise;",
      "send you notifications and reminders about events, birthdays, payments and support requests;",
      "verify your identity, secure your account and investigate fraud or misuse;",
      "provide support and respond to your requests;",
      "generate group reports and administer the community;",
      "comply with legal and regulatory obligations.",
    ],
  },
  {
    title: "4. Payments and Financial Data",
    body: [
      "Payments and transfers are processed by Paystack, our payment processor. We do not store your card numbers. Card and bank details are handled by Paystack in accordance with its own privacy and security practices.",
      "We store the bank account details you provide during onboarding solely so that transfers from the group balance can be sent to you, and to keep a record of transactions.",
      "Payment records, including amounts, dates and references, are visible to the community administrators who administer the group's finances and, for your own transactions, to you.",
    ],
  },
  {
    title: "5. How We Share Your Information",
    body: ["We do not sell your personal information. We share it only in the following circumstances:"],
    items: [
      "Within the community — your profile and activity are visible to other members and administrators of the BCC007 group as reasonably necessary to operate the Service. For example, administrators can view member details to manage payments, transfers and support tickets.",
      "Service providers — with trusted providers who help us run the Service, such as our database, hosting, email, image-storage and workflow providers. These providers may only use your data to perform services on our behalf.",
      "Payment processors — with Paystack to process payments and transfers you authorise.",
      "Legal compliance — when required by law, regulation, legal process or a valid governmental request, or when we believe disclosure is necessary to protect the rights, safety or property of BCC007, its members or the public.",
      "Business transfers — in connection with a merger, acquisition, reorganisation or sale of assets, subject to appropriate confidentiality protections.",
    ],
  },
  {
    title: "6. Community Visibility and Your Privacy Controls",
    body: [
      "Because the Service is a community platform, certain information is visible to other members and administrators, including your name, profile photo and, where applicable, your payments and event activity.",
      "We give you control over sensitive profile fields. From the Privacy settings in your account you can:",
    ],
    items: [
      "hide your birth date, so birthday reminders and the members directory do not display it;",
      "hide your gender;",
      "stop receiving email notifications and newsletter emails.",
    ],
  },
  {
    title: "7. Data Security",
    body: [
      "We use appropriate technical and organisational measures to protect your information, including secure connections, encrypted storage of sensitive data such as passwords and bank details, access controls and activity logging.",
      "No method of transmission or storage is completely secure. While we work hard to protect your information, we cannot guarantee its absolute security, and you are responsible for keeping your account credentials confidential.",
    ],
  },
  {
    title: "8. Data Retention",
    body: [
      "We retain your information for as long as your account is active and as needed to operate the Service, comply with legal obligations, resolve disputes and enforce our agreements.",
      "Financial records, audit logs and support history are retained in accordance with applicable accounting and regulatory requirements, even after you close your account.",
      "When you request deletion of your account, we delete or anonymise your personal information, except where retention is required by law or is necessary for legitimate business purposes.",
    ],
  },
  {
    title: "9. Your Rights and Choices",
    body: ["Depending on where you live, you may have the right to:"],
    items: [
      "access the personal information we hold about you;",
      "correct inaccurate or incomplete information from your profile or by contacting us;",
      "request deletion of your account and personal information;",
      "restrict or object to certain processing of your information;",
      "withdraw consent where processing is based on consent;",
      "receive a copy of the information you provided in a structured, machine-readable format.",
    ],
  },
  {
    title: "10. Cookies and Local Storage",
    body: [
      "We use cookies and browser local storage to keep you signed in, remember your preferences (such as theme and sidebar state) and operate the Service securely.",
      "You can adjust your browser settings to block or delete cookies, but some features of the Service may not work properly without them.",
    ],
  },
  {
    title: "11. Children's Privacy",
    body: [
      "The Service is not directed to individuals under the age of 18, and we do not knowingly collect personal information from them. If you believe a minor has provided us with personal information, contact us and we will take steps to remove it.",
    ],
  },
  {
    title: "12. International Data Transfers",
    body: [
      "Your information may be stored and processed outside the country where you live, including by our hosting and service providers. We take steps to ensure such transfers are protected by appropriate safeguards in accordance with applicable law.",
    ],
  },
  {
    title: "13. Changes to This Policy",
    body: [
      "We may update this Privacy Policy from time to time. When we make material changes, we will update the \"Last updated\" date above and take reasonable steps to notify you, such as through the Service or by email.",
      "Your continued use of the Service after the changes take effect constitutes your acceptance of the revised policy.",
    ],
  },
  {
    title: "14. Contact Us",
    body: [
      "Questions about this Privacy Policy or your data? Send us a message from the Contact page and we will get back to you as soon as possible.",
    ],
  },
];

export default function Privacy() {
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
          <header ref={header.containerRef} className="space-y-4">
            <Badge
              style={header.getItemStyle(0)}
              className="bg-lightBlue/50 text-mainBlue dark:text-white"
            >
              Privacy Policy
            </Badge>
            <h1
              style={header.getItemStyle(1)}
              className={header.getItemClassName("italic text-foreground font-medium tracking-tight text-[40px] lg:text-5xl sm:leading-none")}
            >
              Your data, your community
            </h1>
            <p
              style={header.getItemStyle(2)}
              className={header.getItemClassName("text-mainGray dark:text-muted-foreground leading-7 max-w-2xl")}
            >
              How we collect, use and protect your personal information on the
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
            This Privacy Policy was last updated on {LAST_UPDATED}.
          </div>
        </div>
      </div>
    </main>
  );
}
