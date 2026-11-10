"use client";

import imageCompression from "browser-image-compression";
import { supabase } from "./supabase";

/**
 * Compresse une image côté client puis l'upload dans le bucket public `photos`.
 * Retourne l'URL publique.
 */
export async function uploadPhoto(file: File, folder: string): Promise<string> {
  const compressed = await imageCompression(file, {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 1600,
    useWebWorker: true,
    fileType: "image/jpeg",
    initialQuality: 0.8,
  });

  const name = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await supabase.storage.from("photos").upload(name, compressed, {
    contentType: "image/jpeg",
    cacheControl: "31536000",
  });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from("photos").getPublicUrl(name);
  return data.publicUrl;
}
