import { Toaster } from "sonner";
import {
  RiAlertLine,
  RiCheckboxCircleLine,
  RiErrorWarningLine,
  RiInformationLine,
  RiLoader4Line,
} from "@remixicon/react";
import { useTheme } from "./theme";

const ToastProvider = () => {
  const { theme } = useTheme();

  return (
    <Toaster
      theme={theme as any}
      position="bottom-right"
      gap={10}
      offset={16}
      toastOptions={{
        className: "font-sans",
        style: {
          borderRadius: "12px",
          padding: "14px 16px",
          fontSize: "14px",
          fontWeight: "500",
          lineHeight: "1.5",
          boxShadow:
            "0 12px 32px -8px rgba(0, 0, 0, 0.18), 0 4px 8px -4px rgba(0, 0, 0, 0.08)",
          border: "1px solid rgba(0, 0, 0, 0.08)",
          backdropFilter: "blur(12px)",
        },
        classNames: {
          toast:
            "group bg-white/95 dark:bg-bgDark/90 text-gray-900 dark:text-white backdrop-blur-xl",
          title: "text-sm font-semibold",
          description: "text-sm font-normal text-gray-600 dark:text-gray-300",
          success:
            "!border-[#16a34a]/25 !bg-[#f0fdf4]/90 !text-gray-900 dark:!border-[#16a34a]/40 dark:!bg-[#0c1f14]/90 dark:!text-white",
          error:
            "!border-red-500/25 !bg-red-50/95 !text-gray-900 dark:!border-red-500/40 dark:!bg-red-950/40 dark:!text-white",
          info: "!border-[#0d58d1]/25 !bg-[#eff6ff]/90 !text-gray-900 dark:!border-[#0d58d1]/40 dark:!bg-[#0a1a33]/90 dark:!text-white",
          warning:
            "!border-[#d97706]/30 !bg-[#fffbeb]/90 !text-gray-900 dark:!border-[#d97706]/40 dark:!bg-[#1d1405]/90 dark:!text-white",
          loading:
            "!border-border !bg-white/95 dark:!bg-bgDark/90 !text-gray-900 dark:!text-white",
          actionButton:
            "!rounded-lg !border-0 !bg-mainBlue !px-3.5 !py-1.5 !text-xs !font-semibold !text-white hover:!bg-lightBlue dark:!bg-white dark:!text-mainBlack",
          cancelButton:
            "!rounded-lg !border !border-border !bg-transparent !px-3.5 !py-1.5 !text-xs !font-semibold !text-gray-700 dark:!text-gray-200",
          closeButton:
            "!left-auto !right-2 !top-1/2 !-translate-y-1/2 !size-7 !rounded-full !border-none !bg-transparent !text-gray-400 hover:!bg-gray-900/5 hover:!text-gray-600 dark:hover:!bg-white/10 dark:hover:!text-gray-300",
        },
      }}
      icons={{
        success: (
          <RiCheckboxCircleLine
            size={20}
            className="shrink-0 text-success dark:text-[#4ade80]"
          />
        ),
        error: (
          <RiErrorWarningLine
            size={20}
            className="shrink-0 text-red-500 dark:text-red-400"
          />
        ),
        info: (
          <RiInformationLine
            size={20}
            className="shrink-0 text-lightBlue dark:text-[#60a5fa]"
          />
        ),
        warning: (
          <RiAlertLine
            size={20}
            className="shrink-0 text-warning dark:text-[#fbbf24]"
          />
        ),
        loading: (
          <RiLoader4Line
            size={20}
            className="shrink-0 animate-spin text-mainGray dark:text-gray-400"
          />
        ),
      }}
    />
  );
};

export default ToastProvider;
