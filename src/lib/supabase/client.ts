import { createBrowserClient } from "@supabase/ssr";

// createBrowserClient tarayıcıda zaten tek bir istemci döndürür.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
