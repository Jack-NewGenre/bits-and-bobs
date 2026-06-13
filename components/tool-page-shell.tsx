import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface ToolPageShellProps {
  icon: LucideIcon;
  title: string;
  description: string;
  children: ReactNode;
}

export function ToolPageShell({
  icon: Icon,
  title,
  description,
  children,
}: ToolPageShellProps) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:py-10">
      <div className="mb-8 flex items-start gap-4">
        <div className="bg-muted text-foreground flex size-11 shrink-0 items-center justify-center rounded-xl">
          <Icon className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}
