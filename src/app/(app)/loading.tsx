import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <span className="sr-only">Loading content...</span>
    </div>
  );
}
