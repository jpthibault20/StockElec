"use client";

import { useQuery } from "@tanstack/react-query";
import { getSupabase } from "@/lib/supabase/client";
import { ITEM_PHOTOS_BUCKET } from "@/lib/supabase/storage";

const MAX_BYTES = 500 * 1024;
const MAX_SIDE = 1600;

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Encoding failed"))), "image/jpeg", quality),
  );
}

// Resizes and re-encodes a photo as JPEG under 500 KB (spec section 7),
// honouring the EXIF orientation of phone pictures.
export async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  let scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d")!;

  for (let attempt = 0; attempt < 6; attempt++) {
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.82, 0.7, 0.6]) {
      const blob = await toBlob(canvas, quality);
      if (blob.size <= MAX_BYTES) {
        bitmap.close();
        return blob;
      }
    }
    scale *= 0.8;
  }
  bitmap.close();
  return toBlob(canvas, 0.5);
}

// Uploads a compressed photo under <user_id>/<item_id>/ and returns its path.
export async function uploadItemPhoto(userId: string, itemId: string, blob: Blob): Promise<string> {
  const path = `${userId}/${itemId}/${crypto.randomUUID()}.jpg`;
  const { error } = await getSupabase()
    .storage.from(ITEM_PHOTOS_BUCKET)
    .upload(path, blob, { contentType: "image/jpeg", upsert: false });
  if (error) throw error;
  return path;
}

export async function removeItemPhotos(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await getSupabase().storage.from(ITEM_PHOTOS_BUCKET).remove(paths);
  if (error) throw error;
}

const SIGNED_URL_SECONDS = 60 * 60;

// The bucket is private: photos are displayed through short-lived signed URLs.
export function usePhotoUrls(paths: string[]) {
  return useQuery({
    queryKey: ["photo-urls", paths],
    enabled: paths.length > 0,
    staleTime: (SIGNED_URL_SECONDS - 300) * 1000,
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .storage.from(ITEM_PHOTOS_BUCKET)
        .createSignedUrls(paths, SIGNED_URL_SECONDS);
      if (error) throw error;
      return new Map(data.flatMap((entry) => (entry.path && entry.signedUrl ? [[entry.path, entry.signedUrl]] : [])));
    },
  });
}
