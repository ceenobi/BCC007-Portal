import { RiCloseLine, RiErrorWarningLine } from "@remixicon/react";
import { useState } from "react";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "./alert";
import { Button } from "./button";

type AlertBoxProps = {
  title: string;
  description: string;
  showAlert: boolean;
  variant?: "default" | "success" | "destructive";
  /**
   * Identity of the alert *event*. Bump it (e.g. a submit counter) whenever a
   * new occurrence should re-show the box after the user dismissed the
   * previous one — required when `showAlert` stays `true` across events.
   */
  resetKey?: string | number;
};

const variantWrapper: Record<
  NonNullable<AlertBoxProps["variant"]>,
  string
> = {
  default: "border-border bg-card",
  success: "border-success/40 bg-success/10",
  destructive: "border-destructive/40 bg-destructive/10",
};

export function AlertBox({
  title,
  description,
  variant = "default",
  showAlert,
  resetKey,
}: AlertBoxProps) {
  const [dismissed, setDismissed] = useState(false);
  const [prevShowAlert, setPrevShowAlert] = useState(showAlert);
  const [prevResetKey, setPrevResetKey] = useState(resetKey);

  if (showAlert !== prevShowAlert) {
    setPrevShowAlert(showAlert);
    if (showAlert) {
      setDismissed(false);
    }
  }
  if (resetKey !== prevResetKey && prevResetKey !== undefined && showAlert) {
    setPrevResetKey(resetKey);
    setDismissed(false);
  } else if (resetKey !== prevResetKey) {
    setPrevResetKey(resetKey);
  }

  const show = showAlert && !dismissed;

  return show ? (
    <Alert
      variant={variant}
      className={`max-w-full relative ${variantWrapper[variant]}`}
    >
      <RiErrorWarningLine />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
      <AlertAction>
        <Button
          size="icon-xs"
          aria-label="close-alert"
          variant="outline"
          onClick={() => setDismissed(true)}
        >
          <RiCloseLine />
        </Button>
      </AlertAction>
    </Alert>
  ) : null;
}
