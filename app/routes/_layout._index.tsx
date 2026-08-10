import {
  RiAccountBoxLine,
  RiCashLine,
  RiCheckLine,
  RiInstagramLine,
  RiShieldLine,
} from "@remixicon/react";
import { Link, useOutletContext } from "react-router";
import { useTheme } from "~/components/provider/theme";
import { Button } from "~/components/ui/button";
import { ImageBox } from "~/components/ui/image-box";
import { useWaveAnimation } from "~/hooks/usePageAnimation";
import { cn } from "~/lib/utils";
import type { SessionUser } from "~/types";
import type { Route } from "./+types/_layout._index";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Welcome to BCC007Pay - Manage your payments and transfers" },
    {
      name: "description",
      content:
        "BCC007Pay, a web application that allows its members to manage their payments and transfers.",
    },
  ];
}

const services = [
  {
    title: "Payments",
    description:
      "Manage your payments either donations or our membership fees with ease. Never forget to pay again.",
  },
  {
    title: "Never miss out on an event",
    description:
      "Get notified about all events and activities. From birthdays, anniversaries, to just regular hangouts, BCC007 will keep you updated.",
  },
  {
    title: "Ease of Use",
    description:
      "Our platform is designed to be easy to use, so you can focus on what matters most to you.",
  },
  {
    title: "Community",
    description:
      "Connect with your fellow alumni. We're building something great. Your commitment and donations will make a difference.",
  },
];

export default function HomeRoute() {
  const { user } = useOutletContext() as { user: SessionUser };
  const { theme } = useTheme();
  const hero = useWaveAnimation({
    threshold: 0,
    rootMargin: "0px",
    staggerDelay: 100,
    startVisible: true,
  });
  const features = useWaveAnimation({ threshold: 0.15, staggerDelay: 100 });
  const servicesAnim = useWaveAnimation({ threshold: 0.1, staggerDelay: 120 });
  const about = useWaveAnimation({ threshold: 0.15, staggerDelay: 100 });

  return (
    <>
      <main className="py-10 pb-20 md:py-20 max-w-6xl mx-auto px-4">
        <div
          ref={hero.containerRef}
          className="mt-20 lg:mt-40 grid grid-cols-1 lg:grid-cols-2 gap-6 items-center"
        >
          <div className="space-y-6">
            <h1
              style={hero.getItemStyle(0)}
              className={hero.getItemClassName(
                "text-foreground text-4xl sm:text-5xl sm:leading-none font-medium w-full max-w-80 md:max-w-118.5",
              )}
            >
              Discover <span className="text-lightBlue uppercase">Bcc007</span>{" "}
              Great minds, Great feats
            </h1>
            <p
              style={hero.getItemStyle(1)}
              className={hero.getItemClassName(
                "lg:hidden text-balance text-mainGray dark:text-muted-foreground",
              )}
            >
              We are a community dedicated to preserving and promoting the core
              values and culture of our alma mater - Brilliant Child College.
              Through our platform, we connect with our fellow alumni, share
              experiences, and celebrate the achievements of our community.
            </p>
            <div
              style={hero.getItemStyle(2)}
              className={hero.getItemClassName("space-x-4")}
            >
              <Link to={user ? "/dashboard" : "/auth/login"}>
                <Button
                  size="lg"
                  className="w-full max-w-40 tracking-tight btn"
                >
                  Go to dashboard
                </Button>
              </Link>
              <Link
                to="/contact"
                className="text-[14px] font-bold transition-colors"
              >
                <Button variant="outline" size="lg" className="w-full max-w-40">
                  Talk to us
                </Button>
              </Link>
            </div>
          </div>
          <div
            style={hero.getItemStyle(3)}
            className={hero.getItemClassName(
              "hidden lg:block w-full max-w-165",
            )}
          >
            <p className="text-balance text-mainGray dark:text-muted-foreground">
              We are a community dedicated to preserving and promoting the core
              values and culture of our alma mater - Brilliant Child College.
              Through our platform, we connect with our fellow alumni, share
              experiences, and celebrate the achievements of our community.
            </p>
          </div>
        </div>
        <div
          ref={features.containerRef}
          className="mt-20 grid grid-cols-12 gap-6 items-center"
        >
          <div
            style={features.getItemStyle(0)}
            className={features.getItemClassName(
              "col-span-12 lg:col-span-6 rounded-xl p-4 md:p-6 dark:bg-lightGray border border-gray-200 dark:border-gray-700 hover:shadow space-y-6",
            )}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex gap-2 items-center">
                  <RiAccountBoxLine size={22} />
                  <h2 className="text-base font-medium text-mainBlack dark:text-white">
                    Create an Account
                  </h2>
                </div>
                <p className="w-full max-w-70 text-mainGray dark:text-muted-foreground text-sm text-balance">
                  As a{" "}
                  <a
                    href="https://instagram.com/bcc007set"
                    target="_blank"
                    className="text-mainBlack dark:text-white"
                    rel="noopener noreferrer"
                  >
                    BCC007 Alumini
                  </a>
                  , your experience starts by creating an account.
                </p>
                <div className="mt-6 md:mt-15 space-y-2 text-mainBlack dark:text-white">
                  <div className="flex gap-1 items-center">
                    <RiCheckLine className="size-5" />
                    <p className="text-sm ">Get Onboarded</p>
                  </div>
                  <div className="flex gap-1 items-center">
                    <RiCheckLine className="size-5" />
                    <p className="text-sm">Be active on the group</p>
                  </div>
                  <div className="flex gap-1 items-center">
                    <RiCheckLine className="size-5" />
                    <p className="text-sm">Contribute to a cause</p>
                  </div>
                </div>
              </div>
              <div className="hidden md:block">
                <img
                  src="/Tasks complete.svg"
                  alt="todo"
                  className="w-full h-80"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            </div>
          </div>
          <div
            style={features.getItemStyle(1)}
            className={features.getItemClassName("col-span-12 lg:col-span-6")}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-xl p-4 md:p-6 dark:bg-lightGray border-gray-200 dark:border-gray-700 hover:shadow space-y-4">
                <div className="flex gap-1 items-center">
                  <RiShieldLine className="size-5" />
                  <h2 className="text-base text-mainBlack dark:text-white">
                    Authentication
                  </h2>
                </div>
                <p className="text-mainGray dark:text-muted-foreground text-sm">
                  <span className="text-mainBlack dark:text-white">
                    Secure user signup and login
                  </span>
                  . Membership is invite only.
                </p>
                <div className="hidden md:block">
                  <img
                    src="/Secure-login.svg"
                    alt="secure-login"
                    className="w-full h-50"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </div>
              <div className="border rounded-xl p-4 md:p-6 dark:bg-lightGray border-gray-200 dark:border-gray-700 hover:shadow space-y-4">
                <div className="flex gap-1 items-center">
                  <RiCashLine className="size-5" />
                  <h2 className="text-base text-mainBlack dark:text-white">
                    Make Payments
                  </h2>
                </div>
                <p className="text-mainGray dark:text-muted-foreground text-sm">
                  Make payments securely using{" "}
                  <span className="text-mainBlack dark:text-white">
                    Paystack.
                  </span>{" "}
                  This funds the group's activities.
                </p>
                <div className="hidden md:block">
                  <img
                    src="/Empty-wallet.svg"
                    alt="wallet"
                    className="w-full h-50"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <div id="services">
        <div className="max-w-6xl mx-auto px-4 space-y-8">
          <h1 className="text-foreground text-3xl sm:text-4xl sm:leading-none font-medium w-full max-w-170">
            Stay productive and updated without{" "}
            <span className="text-mainGray dark:text-muted-foreground">
              leaving the dashboard
            </span>
          </h1>
          <div className="max-w-full h-auto mx-auto rounded-t-2xl">
            <ImageBox
              src={cn(
                theme === "dark"
                  ? "https://res.cloudinary.com/ceenobi/image/upload/v1785358288/bcc007portal/Macbook-Air-bcc007pay.vercel.app_2_ckhb97.webp"
                  : "https://res.cloudinary.com/ceenobi/image/upload/v1786282563/bcc007portal/MacBook_Pro-1786280914344_svcihz.jpg",
              )}
              width={761}
              height={420}
              alt="dashboard"
              containerClassName="border border-b-none rounded-t-2xl w-full h-full"
              className="border border-b-none rounded-t-2xl"
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
        <hr />
      </div>
      <div ref={servicesAnim.containerRef} className="relative py-20">
        <div className="absolute inset-0 z-0 opacity-50 h-full w-full bg-white dark:bg-bgDark bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff14_1px,transparent_1px),linear-gradient(to_bottom,#ffffff14_1px,transparent_1px)] bg-size-[6rem_4rem]" />
        <div className="max-w-6xl mx-auto px-4 space-y-8 relative z-10">
          <h1
            style={servicesAnim.getItemStyle(0)}
            className={servicesAnim.getItemClassName(
              "text-mainGray dark:text-muted-foreground text-3xl sm:text-4xl sm:leading-none font-medium w-full max-w-170",
            )}
          >
            Our Services <br />
            <span className="text-mainBlack dark:text-white">
              Discover the key features of our services.
            </span>
          </h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {services.map((service, index) => (
              <div
                key={index}
                style={servicesAnim.getItemStyle(index + 1)}
                className={servicesAnim.getItemClassName(
                  "bg-white dark:bg-lightGray p-6 rounded-xl border shadow",
                )}
              >
                <h2 className="text-lg font-medium text-mainBlack dark:text-white">
                  {service.title}
                </h2>
                <p className="text-sm text-mainGray dark:text-muted-foreground">
                  {service.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <hr />
      <div ref={about.containerRef} className="relative py-20" id="about">
        <div className="max-w-6xl mx-auto px-4 space-y-8 relative z-10">
          <h1
            style={about.getItemStyle(0)}
            className={about.getItemClassName(
              "text-mainGray dark:text-muted-foreground text-3xl sm:text-4xl sm:leading-none font-medium w-full max-w-170",
            )}
          >
            About us
            <br />
            <span className="text-mainBlack dark:text-white">
              Who we are? What we do?
            </span>
          </h1>
          <div className="grid grid-cols-12 gap-4">
            <div
              style={about.getItemStyle(1)}
              className={about.getItemClassName("col-span-12 md:col-span-7")}
            >
              <ImageBox
                src="https://res.cloudinary.com/ceenobi/image/upload/v1761759534/BCCOO7DB/IMG_20190729_194831_680_wmq1zk.jpg"
                width={761}
                height={500}
                alt="bcc007_group"
                containerClassName="rounded-xl w-full h-full"
                className="rounded-xl"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div
              style={about.getItemStyle(2)}
              className={about.getItemClassName(
                "col-span-12 md:col-span-5 border border-gray-200 dark:border-gray-700 bg-[#ff4d00] p-6 rounded-xl items-center",
              )}
            >
              <div className="flex flex-col justify-between items-center h-full text-white">
                <p className="text-base lg:text-xl font-normal leading-snug text-balance">
                  We are a community united by the values and spirit of
                  Brilliant Child College — staying connected, sharing stories,
                  and celebrating every achievement.
                  <br /> <br /> With your regular donations and contributions,
                  we strengthen our bonds, host programs that bring us together,
                  and build meaningful opportunities for a brighter future.
                </p>
                <a
                  href="https://www.instagram.com/bcc007set/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button
                    variant="outline"
                    className="bg-transparent text-white/80 border border-white/20 p-2.5 hover:bg-white/80"
                  >
                    Follow our community <RiInstagramLine />
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
