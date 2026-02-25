import { supabase } from "@/integrations/supabase/client";

/**
 * Get a signed URL for a file in a private storage bucket.
 * Uses the signed-url edge function for server-side authorization.
 */
export async function getSignedFileUrl(
  bucket: string,
  path: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke("signed-url", {
      body: { bucket, path },
    });

    if (error || !data?.signedUrl) {
      console.error("Failed to get signed URL:", error || data?.error);
      return null;
    }

    return data.signedUrl;
  } catch (err) {
    console.error("Signed URL error:", err);
    return null;
  }
}
