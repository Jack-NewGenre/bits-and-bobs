import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

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

const iconVariants = cva(
  "flex size-10 items-center justify-center rounded-lg transition-colors",
  {
    variants: {
      variant: {
        default: "bg-muted text-foreground",
        featured: "bg-primary text-primary-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

interface ToolCardProps extends VariantProps<typeof iconVariants> {
  tool: Tool;
  className?: string;
}

export function ToolCard({ tool, variant, className }: ToolCardProps) {
  const available = isAvailable(tool);

  const content = (
    <Card
      className={cn(
        "group h-full gap-0",
        available
          ? "paper-lift hover:border-primary/40 hover:bg-accent"
          : "opacity-70",
      )}
    >
      <CardHeader>
        <div className="mb-3 flex items-center justify-between">
          <div className={iconVariants({ variant })}>
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

  if (!available) {
    return content;
  }

  return (
    <Link href={tool.href} className={cn("block", className)}>
      {content}
    </Link>
  );
}

export type { ToolCardProps };
