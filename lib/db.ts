const DEFAULT_SUPABASE_URL = "https://kifdezccsxwpsmqzcuif.supabase.co";

type SupabaseRequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  prefer?: string;
};

export function hasDatabase() {
  return Boolean(process.env.SUPABASE_SECRET_KEY);
}

export async function supabaseRequest<T>(path: string, options: SupabaseRequestOptions = {}) {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  const supabaseUrl = (process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/$/, "");

  if (!secretKey) throw new Error("Supabase no está configurado.");

  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    method: options.method || "GET",
    headers: {
      apikey: secretKey,
      Accept: "application/json",
      ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(options.prefer ? { Prefer: options.prefer } : {})
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: "no-store",
    signal: AbortSignal.timeout(10000)
  });

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    console.error("Supabase request failed", {
      status: response.status,
      code: data && typeof data === "object" && "code" in data ? data.code : undefined
    });
    throw new Error("Supabase no pudo completar la operación.");
  }

  return data as T;
}
