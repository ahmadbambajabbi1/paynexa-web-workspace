"use client";

import Image from "next/image";

export type LocalListingImage = { id: string; file: File; url: string };

type ListingImageUploaderProps = {
  /** Whether file inputs accept interaction (e.g. token present). */
  disabled?: boolean;
  banner: LocalListingImage | null;
  galleryItems: LocalListingImage[];
  onBannerFile: (file: File | null) => void;
  onAddGalleryFiles: (files: File[]) => void;
  onRemoveGalleryItem: (id: string) => void;
  onClearGallery: () => void;
};

/** Cover + thumbnail strip styled like the product listing flow — shared by products and marketplace services. */
export function ListingImageUploader({
  disabled,
  banner,
  galleryItems,
  onBannerFile,
  onAddGalleryFiles,
  onRemoveGalleryItem,
  onClearGallery,
}: ListingImageUploaderProps) {
  return (
    <>
      <div className="space-y-3">
        <span className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
          Cover photo
        </span>
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
          {banner ? (
            <div className="relative aspect-[16/10] w-full bg-gray-900/5">
              <Image
                src={banner.url}
                alt=""
                fill
                className="object-cover"
                unoptimized
                sizes="(max-width: 768px) 100vw, 720px"
              />
              <div className="absolute right-2 top-2 flex gap-2">
                <label className="cursor-pointer rounded-lg bg-white/95 px-3 py-1.5 text-xs font-semibold text-gray-800 shadow-md backdrop-blur">
                  Change
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={disabled}
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      onBannerFile(file);
                      e.target.value = "";
                    }}
                  />
                </label>
                <button
                  type="button"
                  className="rounded-lg bg-white/95 px-3 py-1.5 text-xs font-semibold text-red-700 shadow-md backdrop-blur"
                  onClick={() => onBannerFile(null)}
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <label className="flex min-h-[160px] cursor-pointer flex-col items-center justify-center gap-2 px-6 py-10 text-center transition hover:bg-gray-100/80">
              <i className="fas fa-image text-3xl text-gambian-blue/80" aria-hidden />
              <span className="text-sm font-medium text-gray-700">
                Tap to choose cover photo
              </span>
              <span className="text-xs text-gray-500">Shown first in listings</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={disabled}
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  if (file) onBannerFile(file);
                  e.target.value = "";
                }}
              />
            </label>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <span className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
            More photos
          </span>
          {galleryItems.length > 0 && (
            <button
              type="button"
              className="text-xs font-medium text-gray-500 hover:text-gray-800"
              onClick={onClearGallery}
            >
              Clear all
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="flex h-24 w-24 shrink-0 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 text-gray-500 transition hover:border-gambian-blue/50 hover:bg-white hover:text-gambian-blue">
            <i className="fas fa-plus text-lg" aria-hidden />
            <span className="mt-1 text-[10px] font-semibold uppercase tracking-wide">
              Add
            </span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              disabled={disabled}
              onChange={(e) => {
                const list = e.target.files;
                if (list?.length) onAddGalleryFiles(Array.from(list));
                e.target.value = "";
              }}
            />
          </label>
          {galleryItems.map((g) => (
            <div
              key={g.id}
              className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-100 shadow-sm"
            >
              <Image src={g.url} alt="" fill className="object-cover" unoptimized sizes="96px" />
              <button
                type="button"
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white hover:bg-black/80"
                aria-label="Remove"
                onClick={() => onRemoveGalleryItem(g.id)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        {galleryItems.length === 0 && (
          <p className="text-xs text-gray-500">Add at least one photo besides the cover.</p>
        )}
      </div>
    </>
  );
}
