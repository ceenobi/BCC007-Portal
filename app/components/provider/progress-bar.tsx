import { useEffect, useState } from "react";
import { useNavigation } from "react-router";

export default function ProgressBar() {
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    let timeout: ReturnType<typeof setTimeout>;

    if (navigation.state === "loading") {
      setIsVisible(true);
      setProgress(10);
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 5;
        });
      }, 300);
    } else if (navigation.state === "idle" && isVisible) {
      setProgress(100);
      timeout = setTimeout(() => {
        setIsVisible(false);
        setProgress(0);
      }, 400);
    }

    return () => {
      if (interval) clearInterval(interval);
      if (timeout) clearTimeout(timeout);
    };
  }, [navigation.state, isVisible]);

  if (!isVisible) return null;
  return (
    <div className="fixed top-0 left-0 right-0 z-70 h-1">
      <div
        className="h-full bg-lightBlue transition-[width] duration-300 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
