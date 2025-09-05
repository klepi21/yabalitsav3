import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

export function GetStartedButton() {
  return (
    <Link href="/venues">
      <Button className="group relative overflow-hidden bg-black text-white hover:bg-black hover:opacity-90" size="lg">
        <span className="mr-8 transition-opacity duration-500 group-hover:opacity-0">
          Start your trial
        </span>
        <i className="absolute right-1 top-1 bottom-1 rounded-sm z-10 grid w-1/4 place-items-center transition-all duration-500 bg-white/15 group-hover:w-[calc(100%-0.5rem)] group-active:scale-95 text-white">
          <ChevronRight size={16} strokeWidth={2} aria-hidden="true" />
        </i>
      </Button>
    </Link>
  );
}
