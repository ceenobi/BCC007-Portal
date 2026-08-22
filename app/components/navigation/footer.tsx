import { RiHeartPulseLine } from "@remixicon/react";
import { Link } from "react-router";

export default function Footer() {
  return (
    <footer className="relative border-t z-10 bg-white dark:bg-bgDark shadow">
      <div className="max-w-6xl mx-auto p-4">
        <div className="flex flex-wrap gap-4 justify-between items-center">
          <div className="flex w-full sm:w-fit gap-4 items-center dark:text-muted-foreground">
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
        <div className="flex w-full sm:w-fit gap-4 items-center">
          <p className="w-full md:w-auto text-center md:text-left dark:text-muted-foreground text-mainBlack text-xs">
            &copy; BCC007. Inc.
          </p>
          <Link
            to="/health"
            className="inline-flex gap-1 items-center text-muted-foreground hover:text-lightBlue"
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
