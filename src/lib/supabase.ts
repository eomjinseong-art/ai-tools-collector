import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
}

// Service-role client: bypasses RLS, used only by the collector (never shipped to the browser).
export const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false },
});

export type Category = {
  id: string;
  slug: string;
  name: string;
  search_keywords: string[];
  is_trend: boolean;
};
