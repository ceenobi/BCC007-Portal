import { RiLoopRightFill, RiNetworkErrorFill } from "@remixicon/react";
import { useAsyncError, useNavigate } from "react-router";
import { Button } from "../ui/button";

export default function DataError() {
  const error = useAsyncError();
  const navigate = useNavigate()
  const Error = error as Error;
  return (
    <div className="relative flex flex-col items-center justify-center h-100 max-w-lg mx-auto">
      <div className="w-16 h-16 rounded-full bg-destructive/30 flex items-center justify-center text-muted-foreground">
        <RiNetworkErrorFill size={32} className="text-destructive" />
      </div>
      <h1 className="mt-2 text-2xl font-medium dark:text-white text-center">
        Something went wrong!
      </h1>
      <p className="my-2 text-sm text-muted-foreground dark:text-white text-center">
        {Error?.message ||
          " An error occurred while loading this page. Please try again or reach out if the issue continues."}
      </p>
      <Button
        variant="default"
        onClick={() => navigate(0)}
        className="cursor-pointer rounded-sm border border-mainBlue dark:border-mainGold/60 bg-mainBlue dark:bg-mainGold/20 text-white hover:bg-mainBlue hover:text-white hover:dark:bg-mainGold/30 mt-4"
      >
        <RiLoopRightFill /> Try again
      </Button>
    </div>
  );
}
