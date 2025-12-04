import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.2";

const supabase = createClient(Deno.env.get("PROJECT_URL"), Deno.env.get("SERVICE_ROLE_KEY"));
const subjectMap: Record<string, string> = {
  created: "Pengajuan baru",
  approved: "Pengajuan disetujui",
  rejected: "Pengajuan ditolak",
};

serve(async () => {
  const { data: jobs } = await supabase
    .from("notification_jobs")
    .select("*")
    .is("processed_at", null)
    .lt("attempts", 5)
    .order("created_at", { ascending: true })
    .limit(10);

  if (!jobs || jobs.length === 0) return new Response("no-jobs");

  for (const job of jobs) {
    const attempt = job.attempts + 1;
    try {
      const { data: requestRow, error: reqErr } = await supabase
        .from("requests")
        .select(
          "id, profile_id, approver_id, request_type, status, reason, start_date, end_date, start_time, end_time, profiles:profile_id(full_name, email, telegram_chat_id)"
        )
        .eq("id", job.request_id)
        .single();

      if (reqErr || !requestRow) throw new Error(reqErr?.message || "request missing");

      const prefs = await loadPrefs(job.profile_id);
      const { data: targetProfile } = await supabase
        .from("profiles")
        .select("id, full_name, telegram_chat_id")
        .eq("id", job.profile_id)
        .single();
      if (skipByPref(job.event, prefs)) {
        await markProcessed(job.id, attempt, null);
        await log(job, "sent", "skipped-by-pref");
        continue;
      }

      const chatId =
        targetProfile?.telegram_chat_id ||
        prefs.telegram_chat_id ||
        // Only fall back to requester chat when target == requester (e.g., status update to pemohon)
        (targetProfile?.id && String(targetProfile.id) === String(requestRow.profile_id)
          ? requestRow.profiles?.telegram_chat_id
          : null) ||
        null;
      if (!chatId) {
        await markProcessed(job.id, attempt, null);
        await log(job, "sent", "skipped-no-telegram-chat-id");
        continue;
      }

      const text = buildMessage(job.event, requestRow, targetProfile);
      await sendTelegram(chatId, text);
      await markProcessed(job.id, attempt, null);
      await log(job, "sent", null);
    } catch (err: any) {
      await markProcessed(job.id, attempt, err);
      await log(job, "failed", err?.message || String(err));
    }
  }

  return new Response("ok");
});

async function loadPrefs(profileId: string) {
  const { data } = await supabase
    .from("notification_preferences")
    .select("new_request, request_approved, request_rejected, telegram_chat_id")
    .eq("profile_id", profileId)
    .single();

  return (
    data || {
      new_request: true,
      request_approved: true,
      request_rejected: true,
      telegram_chat_id: null,
    }
  );
}

function skipByPref(ev: string, p: { new_request: boolean; request_approved: boolean; request_rejected: boolean }) {
  return (
    (ev === "created" && !p.new_request) ||
    (ev === "approved" && !p.request_approved) ||
    (ev === "rejected" && !p.request_rejected)
  );
}

function buildMessage(ev: string, req: any, targetProfile: any) {
  const statusText = ev === "created" ? "diajukan" : ev === "approved" ? "disetujui" : ev === "rejected" ? "ditolak" : ev;
  const typeLabel = req.request_type || "Permohonan";
  const isOvertime = String(typeLabel).toLowerCase().includes("lembur");
  const periodText = req.start_date === req.end_date ? req.start_date : `${req.start_date} s.d. ${req.end_date}`;
  const timeText = req.start_time || req.end_time ? `Waktu: ${req.start_time || "-"} - ${req.end_time || "-"}` : null;
  const requesterName = req.profiles?.full_name || "Pemohon";
  const isForApprover = targetProfile?.id && req.approver_id && String(targetProfile.id) === String(req.approver_id);
  const header = isOvertime ? "📣 SPL / Lembur" : "📣 Notifikasi Pengajuan";

  const lines = [
    `${header}: ${subjectMap[ev] || "Perubahan"}`,
    isForApprover ? `Pemohon: ${requesterName}` : undefined,
    `Jenis: ${typeLabel}`,
    `Status: ${statusText}`,
    `Tanggal: ${periodText}`,
    timeText,
    `Alasan: ${req.reason || "-"}`,
    `ID: #${req.id}`,
  ].filter(Boolean);

  return lines.join("\n");
}

async function sendTelegram(chatId: string, text: string) {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN missing");

  const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  });

  if (!resp.ok) throw new Error(`telegram error ${resp.status}`);
}

async function markProcessed(id: number, attempts: number, err: Error | null) {
  await supabase
    .from("notification_jobs")
    .update({
      processed_at: new Date().toISOString(),
      attempts,
      last_error: err?.message ?? null,
    })
    .eq("id", id);
}

async function log(job: any, status: "sent" | "failed", error_text: string | null) {
  await supabase.from("notification_logs").insert({
    profile_id: job.profile_id,
    request_id: job.request_id,
    event: job.event,
    status,
    error_text,
  });
}
