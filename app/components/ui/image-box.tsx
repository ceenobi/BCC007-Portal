import { useCallback, useState, type ImgHTMLAttributes } from "react";
import { cn } from "~/lib/utils";
import {
  getBlurPlaceholderUrl,
  getOptimizedImageUrl,
} from "~/lib/cloudinary";

type ImageBoxProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "src" | "width" | "height"
> & {
  src: string;
  width: number;
  height?: number;
  containerClassName?: string;
  quality?: string;
};

export function ImageBox({
  src,
  width,
  height,
  alt,
  className,
  containerClassName,
  quality,
  ...props
}: ImageBoxProps) {
  const [loaded, setLoaded] = useState(false);
  const optimizedSrc = getOptimizedImageUrl(src, width, height, quality);
  const placeholderSrc = getBlurPlaceholderUrl(src);

  const onLoad = useCallback(() => setLoaded(true), []);

  return (
    <div
      className={cn("relative overflow-hidden bg-muted", containerClassName)}
      style={{ aspectRatio: `${width} / ${height ?? width}` }}
    >
      {placeholderSrc && (
        <img
          src={placeholderSrc}
          alt=""
          aria-hidden
          className="absolute inset-0 size-full object-cover"
        />
      )}
      <img
        src={optimizedSrc ?? src}
        alt={alt}
        width={width}
        height={height ?? width}
        onLoad={onLoad}
        className={cn(
          "relative size-full object-cover transition-opacity duration-500",
          loaded ? "opacity-100" : "opacity-0",
          className,
        )}
        {...props}
      />
    </div>
  );
}
