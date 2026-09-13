import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ResultPanelShellProps {
  /** The source filename, shown as the panel's heading. */
  title: string;
  children: React.ReactNode;
  /** The actions below the result: a download, a copy, or several. */
  footer?: React.ReactNode;
  /** Extra classes for the footer, e.g. a gap when it holds two buttons. */
  footerClassName?: string;
  className?: string;
}

/**
 * The frame every tool's result panel shares: the filename as a heading, the
 * result itself, and the actions underneath. Tools differ in what they show
 * in the middle, not in the frame around it.
 */
export function ResultPanelShell({
  title,
  children,
  footer,
  footerClassName,
  className,
}: ResultPanelShellProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="truncate text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">{children}</CardContent>
      {footer && (
        <CardFooter className={cn(footerClassName)}>{footer}</CardFooter>
      )}
    </Card>
  );
}

export type { ResultPanelShellProps };
