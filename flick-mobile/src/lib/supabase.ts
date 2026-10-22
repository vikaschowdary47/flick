import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ExpoCrypto from "expo-crypto";
import { createClient } from "@supabase/supabase-js";
import { AppState } from "react-native";

function installWebCrypto(): void {
  const globalScope = globalThis as typeof globalThis & { crypto?: Crypto };
  const webCrypto = globalScope.crypto ?? ({} as Crypto);
  if (!globalScope.crypto) {
    Object.defineProperty(globalScope, "crypto", { value: webCrypto, configurable: true });
  }
  if (!webCrypto.getRandomValues) {
    Object.defineProperty(webCrypto, "getRandomValues", { value: ExpoCrypto.getRandomValues });
  }
  if (!webCrypto.randomUUID) {
    Object.defineProperty(webCrypto, "randomUUID", { value: ExpoCrypto.randomUUID });
  }
  if (!webCrypto.subtle) {
    Object.defineProperty(webCrypto, "subtle", {
      value: {
        digest: (algorithm: AlgorithmIdentifier, data: BufferSource) =>
          ExpoCrypto.digest(algorithm as ExpoCrypto.CryptoDigestAlgorithm, data),
      } satisfies Pick<SubtleCrypto, "digest">,
    });
  }
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env.local and fill them in.",
  );
}

// Supabase Auth uses this before createClient() to generate S256 PKCE challenges.
installWebCrypto();

// Publishable key only. Row-level security protects the data.
export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: "pkce", // OAuth (Google) returns a code we exchange in the app
  },
});

// Only refresh tokens while the app is in the foreground.
AppState.addEventListener("change", (state) => {
  if (state === "active") {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

export const FILES_BUCKET = "flick-files";
export const MAX_FILE_BYTES = 52428800; // 50 MB, matches the files.size check
