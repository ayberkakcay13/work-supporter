import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        },
      },
    },
  );
}

// Sunucu eylemleri için: giriş yapılmış olmasını kontrol eder (RLS zaten sadece sahibine izin verir).
// getClaims JWT'yi yerelde (önbellekli JWKS ile) doğrular; getUser gibi her seferinde Auth sunucusuna gitmez.
export async function authedClient() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) throw new Error("Giriş yapılmamış");
  return { supabase, userId };
}
