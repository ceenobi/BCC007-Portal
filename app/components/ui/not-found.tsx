import { RiArchiveStackFill } from "@remixicon/react";

interface NotFoundProps {
  title: string;
  message: string;
}

export default function NotFound({ title, message }: NotFoundProps) {
  return (
    <div className="dark:bg-muted/20 rounded-md border-2 border-dashed dark:border-muted py-24 flex flex-col items-center justify-center text-center space-y-4">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
        <RiArchiveStackFill size={32} />
      </div>
      <div className="space-y-1">
        <h3 className="font-bold text-lg">{title}</h3>
        <p className="text-muted-foreground text-xs mt-1">{message}</p>
      </div>
    </div>
  );
}