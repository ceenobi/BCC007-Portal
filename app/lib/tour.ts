import type { Step } from "react-joyride";
import { hasPermission } from "./rbac";
import type { SessionUser } from "~/types";

/**
 * Maps a sidebar href to its `data-tour` target id. Sidebar links are rendered
 * by `sidebar.tsx`; the id is spread onto the NavLink so the tour can spotlight
 * individual navigation items.
 */
const SIDEBAR_TOUR_TARGETS: Record<string, string> = {
  "/dashboard": "sidebar-dashboard",
  "/dashboard/members": "sidebar-members",
  "/dashboard/events": "sidebar-events",
  "/dashboard/payments": "sidebar-payments",
  "/dashboard/transfers": "sidebar-transfers",
  "/dashboard/settings": "sidebar-settings",
};

export function tourTargetForHref(href: string): string | undefined {
  return SIDEBAR_TOUR_TARGETS[href];
}

interface BuildTourStepsArgs {
  isMobile: boolean;
  user: SessionUser;
}

/**
 * Builds the 11-step first-run tour. Sidebar steps (6–9) only render on
 * desktop where the sidebar is visible; on mobile they collapse into a single
 * Drawer step. Finance steps are filtered by permission (`MANAGE_TRANSFERS`).
 */
export function buildTourSteps({
  isMobile,
  user,
}: BuildTourStepsArgs): Step[] {
  const steps: Step[] = [
    {
      id: "welcome",
      target: "",
      placement: "center",
      title: "Welcome to BCC007 Portal",
      content:
        "Let's take a quick tour of the portal so you know where everything lives. This takes about 30 seconds — you can skip at any time.",
    },
    {
      id: "search",
      target: '[data-tour="search"]',
      placement: "bottom",
      title: "Global search",
      content:
        "Press Cmd/Ctrl + K or click the search bar to search across members, events, payments, transfers and tickets — then jump straight to the result.",
    },
    {
      id: "notifications",
      target: '[data-tour="notifications"]',
      placement: "bottom",
      title: "Notifications",
      content:
        "All your alerts live here — payment confirmations, transfers, event updates, tickets and birthday reminders.",
    },
    {
      id: "help",
      target: '[data-tour="help"]',
      placement: "bottom",
      title: "Help & support",
      content:
        "Open a support ticket, browse the support guide, check system health, or replay this tour anytime.",
    },
    {
      id: "profile",
      target: '[data-tour="profile"]',
      placement: "bottom",
      title: "Profile menu",
      content:
        "Manage your account and bank details, switch the theme, or log out from your profile menu.",
    },
  ];

  if (isMobile) {
    steps.push({
      id: "drawer",
      target: '[data-tour="drawer"]',
      placement: "bottom",
      title: "Navigation menu",
      content:
        "Tap the menu button to open navigation on mobile — Dashboard, Members, Events, Payments, Transfers and Settings.",
    });
  } else {
    steps.push(
      {
        id: "sidebar-nav",
        target: '[data-tour="sidebar-nav"]',
        placement: "right",
        title: "Navigation sidebar",
        content:
          "Your main navigation. Head to the Dashboard, Members and Events from the sidebar on the left.",
      },
      {
        id: "sidebar-payments",
        target: '[data-tour="sidebar-payments"]',
        placement: "right",
        title: "Payments",
        content:
          "Make and track membership dues and contributions, view group payments, and generate payment reports.",
      },
      ...(hasPermission(user.role, "MANAGE_TRANSFERS")
        ? ([
            {
              id: "sidebar-transfers",
              target: '[data-tour="sidebar-transfers"]',
              placement: "right" as const,
              title: "Transfers",
              content:
                "Send money from the group balance to any saved member bank account and track transfers.",
            },
          ] satisfies Step[])
        : []),
      {
        id: "sidebar-settings",
        target: '[data-tour="sidebar-settings"]',
        placement: "right",
        title: "Settings",
        content:
          "Update your profile and bank details, manage security, audit logs and your subscription.",
      },
    );
  }

  steps.push(
    {
      id: "quick-actions",
      target: '[data-tour="quick-actions"]',
      placement: "auto",
      title: "Quick actions",
      content:
        "Jump straight into the most common tasks — make a payment, send a transfer, view events, members or reports.",
    },
    {
      id: "done",
      target: "",
      placement: "center",
      title: "You're all set!",
      content:
        "That's it. Explore the portal at your own pace — visit the Support Guide for detailed guides, or replay this tour from the help menu anytime.",
    },
  );

  return steps;
}
