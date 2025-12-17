import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.2";

const supabaseUrl = Deno.env.get("PROJECT_URL") ?? Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing Supabase service credentials for update-user-email function.");
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  let payload: { userId?: string; email?: string } = {};
  try {
    payload = await req.json();
  } catch (_err) {
    return new Response("Invalid JSON payload", { status: 400, headers: corsHeaders });
  }

  const { userId, email } = payload;
  if (!userId || !email) {
    return new Response("userId and email are required", { status: 400, headers: corsHeaders });
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { email });
  if (error) {
    return new Response(error.message || "Failed to update user", { status: 400, headers: corsHeaders });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
});
