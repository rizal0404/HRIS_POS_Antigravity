import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.2";
const supabase = createClient(Deno.env.get("PROJECT_URL"), Deno.env.get("SERVICE_ROLE_KEY"));
const subjectMap = {
  created: "Pengajuan baru",
  approved: "Pengajuan disetujui",
  rejected: "Pengajuan ditolak"
};
serve(async ()=>{
  const { data: jobs } = await supabase.from("notification_jobs").select("*").is("processed_at", null).lt("attempts", 5).order("created_at", {
    ascending: true
  }).limit(10);
  if (!jobs || jobs.length === 0) return new Response("no-jobs");
  for (const job of jobs){
    const attempt = job.attempts + 1;
    try {
      const { data: requestRow, error: reqErr } = await supabase.from("requests").select("id, request_type, status, reason, start_date, end_date, profiles:profile_id(full_name, email, telegram_chat_id)").eq("id", job.request_id).single();
      if (reqErr || !requestRow) throw new Error(reqErr?.message || "request missing");
      const chatId = requestRow.profiles?.telegram_chat_id;
      if (!chatId) throw new Error("telegram_chat_id missing");
      const prefs = await loadPrefs(job.profile_id);
      if (skipByPref(job.event, prefs)) {
        await markProcessed(job.id, attempt, null);
        await log(job, "sent", "skipped-by-pref");
        continue;
      }
      const text = buildMessage(job.event, requestRow);
      await sendTelegram(chatId, text);
      await markProcessed(job.id, attempt, null);
      await log(job, "sent", null);
    } catch (err) {
      await markProcessed(job.id, attempt, err);
      await log(job, "failed", err.message);
    }
  }
  return new Response("ok");
});
async function loadPrefs(profileId) {
  const { data } = await supabase.from("notification_preferences").select("new_request, request_approved, request_rejected").eq("profile_id", profileId).single();
  return data || {
    new_request: true,
    request_approved: true,
    request_rejected: true
  };
}
function skipByPref(ev, p) {
  return ev === "created" && !p.new_request || ev === "approved" && !p.request_approved || ev === "rejected" && !p.request_rejected;
}
function buildMessage(ev, req) {
  const statusText = ev === "created" ? "dibuat" : ev === "approved" ? "disetujui" : ev === "rejected" ? "ditolak" : ev;
  return [
    `📢 ${subjectMap[ev]}`,
    `Jenis: ${req.request_type}`,
    `Status: ${statusText}`,
    `Rentang: ${req.start_date} s.d. ${req.end_date}`,
    `Alasan: ${req.reason || "-"}`,
    `ID: ${req.id}`
  ].join("\n");
}
async function sendTelegram(chatId, text) {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN missing");
  const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      chat_id: chatId,
      text
    })
  });
  if (!resp.ok) throw new Error(`telegram error ${resp.status}`);
}
async function markProcessed(id, attempts, err) {
  await supabase.from("notification_jobs").update({
    processed_at: new Date().toISOString(),
    attempts,
    last_error: err?.message ?? null
  }).eq("id", id);
}
async function log(job, status, error_text) {
  await supabase.from("notification_logs").insert({
    profile_id: job.profile_id,
    request_id: job.request_id,
    event: job.event,
    status,
    error_text
  });
}
