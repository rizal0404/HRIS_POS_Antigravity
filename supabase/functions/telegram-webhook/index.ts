import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.2";

const supabase = createClient(
    Deno.env.get("PROJECT_URL")!,
    Deno.env.get("SERVICE_ROLE_KEY")!
);

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const WEBHOOK_SECRET = Deno.env.get("TELEGRAM_WEBHOOK_SECRET");

// Map keywords to request status
const ACTION_KEYWORDS: Record<string, string> = {
    setuju: "approved",
    approve: "approved",
    acc: "approved",
    ok: "approved",
    oke: "approved",
    revisi: "revised",
    revise: "revised",
    perbaiki: "revised",
    tolak: "rejected",
    reject: "rejected",
    tidak: "rejected",
    no: "rejected",
};

serve(async (req) => {
    const secretHeader = req.headers.get("x-telegram-bot-api-secret-token");

    if (WEBHOOK_SECRET && secretHeader !== WEBHOOK_SECRET) {
        console.error("Invalid webhook secret");
    }

    try {
        const update = await req.json();
        console.log("Received Telegram update:", JSON.stringify(update, null, 2));

        // Handle callback_query (inline keyboard button clicks)
        if (update.callback_query) {
            const result = await handleCallbackQuery(update.callback_query);
            return new Response(JSON.stringify(result), {
                headers: { "Content-Type": "application/json" },
            });
        }

        // Handle message updates (text replies)
        const message = update.message;
        if (!message || !message.text) {
            return new Response("ok - no message or callback");
        }

        const chatId = message.chat.id;
        const text = message.text.trim().toLowerCase();
        const replyToMessage = message.reply_to_message;

        if (replyToMessage) {
            const result = await processTextReply(chatId, text, replyToMessage.text);
            return new Response(JSON.stringify(result), {
                headers: { "Content-Type": "application/json" },
            });
        }

        await sendTelegram(chatId, "ℹ️ Klik tombol pada pesan notifikasi atau balas dengan: setuju/revisi/tolak");
        return new Response("ok - help sent");
    } catch (err: any) {
        console.error("Webhook error:", err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
});

// Handle inline keyboard button clicks
async function handleCallbackQuery(query: any): Promise<{ success: boolean; message: string }> {
    const chatId = query.from.id;
    const callbackData = query.data;
    const messageId = query.message?.message_id;
    const callbackQueryId = query.id;

    console.log(`Callback: ${callbackData} from ${chatId}`);

    const match = callbackData.match(/^(approve|reject|revise)_(\d+)$/);
    if (!match) {
        await answerCallbackQuery(callbackQueryId, "❌ Data tidak valid");
        return { success: false, message: "Invalid callback data" };
    }

    const [, actionKey, requestId] = match;
    const action = actionKey === "approve" ? "approved" : actionKey === "reject" ? "rejected" : "revised";

    const result = await processApproval(chatId, action, requestId);
    await answerCallbackQuery(callbackQueryId, result.success ? "✅ Berhasil" : result.message);

    if (result.success && messageId) {
        await editMessageRemoveButtons(chatId, messageId, action);
    }

    return result;
}

// Handle text reply approvals
async function processTextReply(chatId: number, text: string, originalMessage: string): Promise<{ success: boolean; message: string }> {
    const idMatch = originalMessage.match(/ID:\s*#(\d+)/i);
    if (!idMatch) {
        await sendTelegram(chatId, "❌ Tidak dapat menemukan ID pengajuan di pesan.");
        return { success: false, message: "Request ID not found" };
    }

    const requestId = idMatch[1];
    const action = determineAction(text);
    if (!action) {
        await sendTelegram(chatId, "❓ Perintah tidak dikenali. Gunakan: setuju/revisi/tolak");
        return { success: false, message: "Unknown action" };
    }

    return await processApproval(chatId, action, requestId);
}

// Core approval logic
async function processApproval(chatId: number, action: string, requestId: string): Promise<{ success: boolean; message: string }> {
    // Find approver by telegram_chat_id
    let { data: approver } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("telegram_chat_id", String(chatId))
        .single();

    if (!approver) {
        const numResult = await supabase.from("profiles").select("id, full_name").eq("telegram_chat_id", chatId).single();
        if (numResult.data) approver = numResult.data;
    }

    if (!approver) {
        await sendTelegram(chatId, "❌ Akun Telegram tidak terhubung dengan profil.");
        return { success: false, message: "Profile not found" };
    }

    // Get request
    const { data: request, error: reqError } = await supabase
        .from("requests")
        .select("id, profile_id, approver_id, status, profiles:profile_id(full_name)")
        .eq("id", requestId)
        .single();

    if (reqError || !request) {
        await sendTelegram(chatId, "❌ Pengajuan tidak ditemukan.");
        return { success: false, message: "Request not found" };
    }

    // Check self-approval
    if (String(request.profile_id) === String(approver.id)) {
        await sendTelegram(chatId, "❌ Tidak dapat menyetujui pengajuan sendiri.");
        return { success: false, message: "Cannot self-approve" };
    }

    // Check authorization
    const isDesignatedApprover = request.approver_id && String(request.approver_id) === String(approver.id);
    let isManager = false;
    if (!isDesignatedApprover) {
        const { data: profile } = await supabase.from("profiles").select("manager_id").eq("id", request.profile_id).single();
        isManager = profile && String(profile.manager_id) === String(approver.id);
    }

    if (!isDesignatedApprover && !isManager) {
        await sendTelegram(chatId, "❌ Anda tidak berwenang menyetujui pengajuan ini.");
        return { success: false, message: "Not authorized" };
    }

    // Atomic update - only update if status is STILL pending (prevents race condition)
    const { data: updateResult, error: updateError } = await supabase
        .from("requests")
        .update({ status: action, approver_id: approver.id, updated_at: new Date().toISOString() })
        .eq("id", requestId)
        .eq("status", "pending")  // Only update if still pending!
        .select("id");

    if (updateError) {
        await sendTelegram(chatId, "❌ Gagal memperbarui status.");
        return { success: false, message: "Update failed" };
    }

    // Check if any row was actually updated (prevents duplicate notifications)
    if (!updateResult || updateResult.length === 0) {
        await sendTelegram(chatId, `ℹ️ Pengajuan #${requestId} sudah diproses sebelumnya.`);
        return { success: false, message: "Already processed" };
    }

    // Create notification for requester (only runs if update succeeded)
    await supabase.from("notification_jobs").insert({
        profile_id: request.profile_id,
        request_id: requestId,
        event: action,
        attempts: 0,
    });

    // Send confirmation
    const statusEmoji = action === "approved" ? "✅" : action === "rejected" ? "❌" : "📝";
    const requesterName = (request.profiles as any)?.full_name || "Pemohon";
    await sendTelegram(chatId, `${statusEmoji} Pengajuan #${requestId} dari ${requesterName}: ${action}`);

    return { success: true, message: action };
}

function determineAction(text: string): string | null {
    for (const word of text.split(/\s+/)) {
        const clean = word.replace(/[^a-zA-Z]/g, "").toLowerCase();
        if (ACTION_KEYWORDS[clean]) return ACTION_KEYWORDS[clean];
    }
    return null;
}

async function sendTelegram(chatId: number, text: string): Promise<void> {
    const resp = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text }),
    });
    if (!resp.ok) console.error("Telegram error:", await resp.text());
}

async function answerCallbackQuery(callbackQueryId: string, text: string): Promise<void> {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callback_query_id: callbackQueryId, text, show_alert: false }),
    });
}

async function editMessageRemoveButtons(chatId: number, messageId: number, action: string): Promise<void> {
    const statusText = action === "approved" ? "✅ DISETUJUI" : action === "rejected" ? "❌ DITOLAK" : "📝 REVISI";
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageReplyMarkup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [] } }),
    });
}
