"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

type Props = {
  urls: string[];
  initialIndex: number;
  open: boolean;
  onClose: () => void;
};

/**
 * Full-viewport image viewer: fits image within the screen (object-contain), pinch-zoom on mobile via browser.
 * Desktop: arrow keys + on-screen controls for multi-image sets.
 */
export function ImageLightbox({ urls, initialIndex, open, onClose }: Props) {
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    if (open) setIndex(Math.min(Math.max(0, initialIndex), Math.max(0, urls.length - 1)));
  }, [open, initialIndex, urls.length]);

  const goPrev = useCallback(() => {
    setIndex((i) => (i - 1 + urls.length) % urls.length);
  }, [urls.length]);

  const goNext = useCallback(() => {
    setIndex((i) => (i + 1) % urls.length);
  }, [urls.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (urls.length <= 1) return;
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, urls.length, onClose, goPrev, goNext]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || urls.length === 0) return null;

  const url = urls[index] ?? urls[0];

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-black/93 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="Product image"
      onClick={onClose}
    >
      <div
        className="relative z-10 flex shrink-0 items-center justify-between gap-3 px-3 py-3 sm:px-5"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs font-medium tracking-wide text-white/85 sm:text-sm">
          {urls.length > 1 ? (
            <>
              Image {index + 1} of {urls.length}
            </>
          ) : (
            <>View image</>
          )}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/12 text-white transition hover:bg-white/22"
          aria-label="Close"
        >
          <i className="fas fa-times text-lg" aria-hidden />
        </button>
      </div>

      <div
        className="relative z-10 flex min-h-0 flex-1 items-center justify-center px-2 pb-6 sm:px-6"
        onClick={onClose}
      >
        <div
          className="relative h-full w-full max-h-[min(88dvh,100%)] max-w-[min(96vw,1400px)] touch-pan-y"
          style={{ WebkitTapHighlightColor: "transparent" }}
          onClick={(e) => e.stopPropagation()}
        >
          <Image
            src={url}
            alt=""
            fill
            className="object-contain"
            unoptimized
            priority
            sizes="(max-width: 1400px) 96vw, 1400px"
          />
        </div>

        {urls.length > 1 ? (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              className="absolute left-1 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white/12 text-white shadow-lg transition hover:bg-white/22 sm:left-4 sm:h-12 sm:w-12"
              aria-label="Previous image"
            >
              <i className="fas fa-chevron-left" aria-hidden />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
              className="absolute right-1 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white/12 text-white shadow-lg transition hover:bg-white/22 sm:right-4 sm:h-12 sm:w-12"
              aria-label="Next image"
            >
              <i className="fas fa-chevron-right" aria-hidden />
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
