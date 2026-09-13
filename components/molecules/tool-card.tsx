import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { isAvailable } from "@/lib/tools";
import type { Tool } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ToolCardProps {
  tool: Tool;
  className?: string;
}

export function ToolCard({ tool, className }: ToolCardProps) {
  const available = isAvailable(tool);

  const content = (
    <Card
      className={cn(
        "group h-full gap-0 transition-colors",
        available ? "hover:border-primary/40 hover:bg-accent/40" : "opacity-70",
      )}
    >
      <CardHeader>
        <div className="mb-3 flex items-center justify-between">
          <div className="bg-muted text-foreground flex size-10 items-center justify-center rounded-lg">
            <tool.icon className="size-5" />
          </div>
          {available ? (
            <ArrowRight className="text-muted-foreground size-4 transition-transform group-hover:translate-x-0.5" />
          ) : (
            <Badge variant="secondary">Soon</Badge>
          )}
        </div>
        <CardTitle className="text-base">{tool.name}</CardTitle>
        <CardDescription className="mt-1">{tool.description}</CardDescription>
      </CardHeader>
    </Card>
  );

  if (!isAvailable(tool)) {
    return content;
  }

  return (
    <Link href={tool.href} className={cn("block", className)}>
      {content}
    </Link>
  );
}
