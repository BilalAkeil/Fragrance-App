import type { SupabaseClient } from "@supabase/supabase-js";

// Uploads into the user's own folder, which the storage policies require.
export async function uploadToOwnFolder(
  supabase: SupabaseClient,
  bucket: "listing-photos" | "bottle-videos" | "receipts",
  userId: string,
  file: File,
): Promise<string> {
  const ext = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "bin";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return path;
}
