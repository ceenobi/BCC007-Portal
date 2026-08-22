import { RiHeartPulseLine } from "@remixicon/react";
import { Link } from "react-router";

export default function Footer() {
  return (
    <footer className="relative border-t z-10 bg-white dark:bg-bgDark shadow">
      <div className="max-w-6xl mx-auto p-4">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex gap-4 items-center dark:text-muted-foreground">
            <Link
              to="/privacy"
              className="text-xs hover:text-lightBlue transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              to="/terms"
              className="text-xs hover:text-lightBlue transition-colors"
            >
              Terms of Service
            </Link>
          </div>
        <div className="flex gap-4 items-center">
          <p className="text-center md:text-left dark:text-muted-foreground text-mainBlack text-xs">
            &copy; BCC007. Inc.
          </p>
          <Link
            to="/health"
            className="inline-flex gap-1 items-center text-mainBlack dark:text-muted-foreground hover:text-lightBlue"
          >
            <RiHeartPulseLine size={14}/>{" "}
            <p className="text-xs">status</p>
            </Link>
        </div>
        </div>
      </div>
    </footer>
  );
}
