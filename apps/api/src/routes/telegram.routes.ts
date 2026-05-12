import { Router, Request, Response } from 'express';
import { db } from '../config/database.js';
import { requests, profiles, notificationJobs } from '../db/schema/index.js';
import { eq, and, sql } from 'drizzle-orm';

const router = Router();

// Map keywords to request status
const ACTION_KEYWORDS: Record<string, string> = {
    setuju: 'approved',
    approve: 'approved',
    acc: 'approved',
    ok: 'approved',
    oke: 'approved',
    revisi: 'revised',
    revise: 'revised',
    perbaiki: 'revised',
    tolak: 'rejected',
    reject: 'rejected',
    tidak: 'rejected',
    no: 'rejected',
};

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

// POST /api/telegram/webhook
router.post('/webhook', async (req: Request, res: Response) => {
    try {
        const update = req.body;
        console.log('Received Telegram update:', JSON.stringify(update, null, 2));

        // Handle callback_query (inline keyboard button clicks)
        if (update.callback_query) {
            const result = await handleCallbackQuery(update.callback_query);
            res.json(result);
            return;
        }

        // Handle message updates (text replies)
        const message = update.message;
        if (!message || !message.text) {
            res.send('ok - no message or callback');
            return;
        }

        const chatId = message.chat.id;
        const text = message.text.trim().toLowerCase();
        const replyToMessage = message.reply_to_message;

        if (replyToMessage) {
            const result = await processTextReply(chatId, text, replyToMessage.text);
            res.json(result);
            return;
        }

        await sendTelegram(chatId, 'ℹ️ Klik tombol pada pesan notifikasi atau balas dengan: setuju/revisi/tolak');
        res.send('ok - help sent');
    } catch (err: any) {
        console.error('Webhook error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Handle inline keyboard button clicks
async function handleCallbackQuery(query: any): Promise<{ success: boolean; message: string }> {
    const chatId = query.from.id;
    const callbackData = query.data;
    const messageId = query.message?.message_id;
    const callbackQueryId = query.id;

    const match = callbackData.match(/^(approve|reject|revise)_(\d+)$/);
    if (!match) {
        await answerCallbackQuery(callbackQueryId, '❌ Data tidak valid');
        return { success: false, message: 'Invalid callback data' };
    }

    const [, actionKey, requestId] = match;
    const action = actionKey === 'approve' ? 'approved' : actionKey === 'reject' ? 'rejected' : 'revised';

    const result = await processApproval(chatId, action, requestId);
    await answerCallbackQuery(callbackQueryId, result.success ? '✅ Berhasil' : result.message);

    if (result.success && messageId) {
        await editMessageRemoveButtons(chatId, messageId);
    }

    return result;
}

// Handle text reply approvals
async function processTextReply(chatId: number, text: string, originalMessage: string): Promise<{ success: boolean; message: string }> {
    const idMatch = originalMessage.match(/ID:\s*#(\d+)/i);
    if (!idMatch) {
        await sendTelegram(chatId, '❌ Tidak dapat menemukan ID pengajuan di pesan.');
        return { success: false, message: 'Request ID not found' };
    }
    const requestId = idMatch[1];
    const action = determineAction(text);
    if (!action) {
        await sendTelegram(chatId, '❓ Perintah tidak dikenali. Gunakan: setuju/revisi/tolak');
        return { success: false, message: 'Unknown action' };
    }
    return await processApproval(chatId, action, requestId);
}

// Core approval logic
async function processApproval(chatId: number, action: string, requestId: string): Promise<{ success: boolean; message: string }> {
    // Find approver by telegram_chat_id
    const approverRows = await db
        .select({ id: profiles.id, full_name: profiles.full_name })
        .from(profiles)
        .where(eq(profiles.telegram_chat_id, String(chatId)))
        .limit(1);

    const approver = approverRows[0];
    if (!approver) {
        await sendTelegram(chatId, '❌ Akun Telegram tidak terhubung dengan profil.');
        return { success: false, message: 'Profile not found' };
    }

    // Get request
    const requestRows = await db
        .select()
        .from(requests)
        .where(eq(requests.id, BigInt(requestId)))
        .limit(1);

    const request = requestRows[0];
    if (!request) {
        await sendTelegram(chatId, '❌ Pengajuan tidak ditemukan.');
        return { success: false, message: 'Request not found' };
    }

    // Check self-approval
    if (String(request.profile_id) === String(approver.id)) {
        await sendTelegram(chatId, '❌ Tidak dapat menyetujui pengajuan sendiri.');
        return { success: false, message: 'Cannot self-approve' };
    }

    // Check authorization
    const isDesignatedApprover = request.approver_id && String(request.approver_id) === String(approver.id);
    let isManager = false;
    if (!isDesignatedApprover) {
        const profileRows = await db
            .select({ manager_id: profiles.manager_id })
            .from(profiles)
            .where(eq(profiles.id, request.profile_id))
            .limit(1);
        isManager = profileRows[0] && String(profileRows[0].manager_id) === String(approver.id);
    }

    if (!isDesignatedApprover && !isManager) {
        await sendTelegram(chatId, '❌ Anda tidak berwenang menyetujui pengajuan ini.');
        return { success: false, message: 'Not authorized' };
    }

    // Atomic update - only update if status is STILL pending
    const updateResult = await db
        .update(requests)
        .set({
            status: action as any,
            approver_id: approver.id,
            updated_at: new Date(),
        })
        .where(and(
            eq(requests.id, BigInt(requestId)),
            eq(requests.status, 'pending' as any),
        ))
        .returning({ id: requests.id });

    if (!updateResult || updateResult.length === 0) {
        await sendTelegram(chatId, `ℹ️ Pengajuan #${requestId} sudah diproses sebelumnya.`);
        return { success: false, message: 'Already processed' };
    }

    // Create notification for requester
    await db.insert(notificationJobs).values({
        profile_id: request.profile_id,
        request_id: BigInt(requestId),
        event: action as any,
        attempts: 0,
    });

    // Send confirmation
    const statusEmoji = action === 'approved' ? '✅' : action === 'rejected' ? '❌' : '📝';
    await sendTelegram(chatId, `${statusEmoji} Pengajuan #${requestId}: ${action}`);

    return { success: true, message: action };
}

function determineAction(text: string): string | null {
    for (const word of text.split(/\s+/)) {
        const clean = word.replace(/[^a-zA-Z]/g, '').toLowerCase();
        if (ACTION_KEYWORDS[clean]) return ACTION_KEYWORDS[clean];
    }
    return null;
}

async function sendTelegram(chatId: number, text: string): Promise<void> {
    if (!TELEGRAM_BOT_TOKEN) {
        console.warn('TELEGRAM_BOT_TOKEN not set, skipping message');
        return;
    }
    const resp = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text }),
    });
    if (!resp.ok) console.error('Telegram error:', await resp.text());
}

async function answerCallbackQuery(callbackQueryId: string, text: string): Promise<void> {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: callbackQueryId, text, show_alert: false }),
    });
}

async function editMessageRemoveButtons(chatId: number, messageId: number): Promise<void> {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageReplyMarkup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [] } }),
    });
}

export const telegramRoutes = router;
