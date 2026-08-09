import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { EVENTS, Joyride, type EventData } from "react-joyride";
import { useFetcher, useLocation, useNavigate } from "react-router";
import { useIsMobile } from "~/hooks/useIsMobile";
import { buildTourSteps } from "~/lib/tour";
import type { SessionUser } from "~/types";
import { TourArrow, TourTooltip } from "./tour-tooltip";

const MOBILE_BREAKPOINT = 1024;
const AUTO_START_DELAY_MS = 900;
const REPLAY_NAVIGATION_DELAY_MS = 600;

interface TourContextValue {
  startTour: () => void;
  resetTour: () => void;
}

const TourContext = createContext<TourContextValue | null>(null);

export function useTour(): TourContextValue {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error("useTour must be used within a <TourProvider>");
  }
  return context;
}

export function TourProvider({
  children,
  user,
}: {
  children: ReactNode;
  user: SessionUser;
}) {
  const isMobile = useIsMobile({ MOBILE_BREAKPOINT });
  const location = useLocation();
  const navigate = useNavigate();
  const fetcher = useFetcher();
  const [run, setRun] = useState(false);
  const autoStartedRef = useRef(false);
  const clearedRef = useRef(false);
  const pathnameRef = useRef(location.pathname);

  const steps = useMemo(() => buildTourSteps({ isMobile, user }), [isMobile, user]);

  // Auto-start the first-run tour once the dashboard (and its async widgets)
  // has had a moment to render. Only triggers when the user just onboarded.
  useEffect(() => {
    if (user.tourPending && !autoStartedRef.current) {
      autoStartedRef.current = true;
      const timeout = setTimeout(() => setRun(true), AUTO_START_DELAY_MS);
      return () => clearTimeout(timeout);
    }
  }, [user.tourPending]);

  // If the user navigates mid-tour they're exploring — end the tour quietly
  // without clearing the pending flag (it stays available via Replay Tour).
  useEffect(() => {
    if (pathnameRef.current !== location.pathname) {
      pathnameRef.current = location.pathname;
      setRun(false);
    }
  }, [location.pathname]);

  const clearTourPending = () => {
    if (clearedRef.current) return;
    clearedRef.current = true;
    fetcher.submit(
      { intent: "tour-complete" },
      { method: "post", action: "/dashboard", encType: "application/json" },
    );
  };

  const handleEvent = (data: EventData) => {
    if (data.type === EVENTS.TOUR_END) {
      setRun(false);
      clearTourPending();
    }
  };

  const value: TourContextValue = useMemo(
    () => ({
      startTour: () => setRun(true),
      resetTour: () => {
        // The tour includes dashboard-landing steps, so replay from any other
        // dashboard page by returning to /dashboard first. Update the guard
        // reference before navigating so it doesn't stop the tour it just
        // started.
        if (pathnameRef.current !== "/dashboard") {
          pathnameRef.current = "/dashboard";
          navigate("/dashboard");
          window.setTimeout(() => setRun(true), REPLAY_NAVIGATION_DELAY_MS);
        } else {
          setRun(true);
        }
      },
    }),
    [navigate],
  );

  return (
    <TourContext.Provider value={value}>
      {children}
      {steps.length > 0 && (
        <Joyride
          run={run}
          steps={steps}
          continuous
          scrollToFirstStep
          arrowComponent={TourArrow}
          tooltipComponent={TourTooltip}
          onEvent={handleEvent}
          options={{
            primaryColor: "#2563eb",
            overlayColor: "rgba(0, 0, 0, 0.55)",
            spotlightPadding: 8,
            spotlightRadius: 10,
            zIndex: 120,
            skipBeacon: true,
            overlayClickAction: "close",
            dismissKeyAction: "close",
            targetWaitTimeout: 3000,
            showProgress: true,
            width: 380,
          }}
        />
      )}
    </TourContext.Provider>
  );
}
