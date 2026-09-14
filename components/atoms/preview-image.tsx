import { cn } from "@/lib/utils";

interface PreviewImageProps {
  src: string;
  alt?: string;
  /** Render a checkerboard behind it, for images with transparency. */
  transparent?: boolean;
  className?: string;
}

/**
 * A plain preview of a user-supplied image.
 *
 * These are blob and object URLs created in the browser a moment ago, so
 * next/image has nothing to optimise and cannot fetch them anyway.
 */
export function PreviewImage({
  src,
  alt = "",
  transparent = false,
  className,
}: PreviewImageProps) {
  return (
    <img
      src={src}
      alt={alt}
      className={cn(
        "w-full rounded-lg object-contain",
        transparent ? "bg-checkerboard" : "bg-muted",
        className,
      )}
    />
  );
}
