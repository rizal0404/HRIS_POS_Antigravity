import { db } from '../config/database';
import { notificationJobs, notificationPreferences, notificationLogs, employees, requests, users, departments } from '../db/schema';
import { eq, and, isNull, lt } from 'drizzle-orm';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export const notificationService = {
    async sendTelegram(chatId: string, text: string, replyMarkup?: any) {
        if (!TELEGRAM_BOT_TOKEN) {
            console.error('TELEGRAM_BOT_TOKEN not configured');
            return false;
        }

        try {
            const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text,
                    reply_markup: replyMarkup,
                    parse_mode: 'HTML'
                }),
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Telegram API error: ${error}`);
            }

            return true;
        } catch (error) {
            console.error('Error sending Telegram message:', error);
            return false;
        }
    },

    async processQueue() {
        // Get up to 10 unprocessed jobs
        const jobs = await db.select()
            .from(notificationJobs)
            .where(and(
                isNull(notificationJobs.processedAt),
                lt(notificationJobs.attempts, 5)
            ))
            .limit(10);

        for (const job of jobs) {
            try {
                // Get job target preferences
                const [pref] = await db.select()
                    .from(notificationPreferences)
                    .where(eq(notificationPreferences.employeeId, job.employeeId))
                    .limit(1);

                if (!pref || !pref.telegramChatId) {
                    await this.markJobProcessed(job.id, job.attempts + 1, 'No telegram chat id');
                    continue;
                }

                // Check if user wants this notification type
                const shouldSend = 
                    (job.event === 'created' && pref.newRequest) ||
                    (job.event === 'approved' && pref.requestApproved) ||
                    (job.event === 'rejected' && pref.requestRejected);

                if (!shouldSend) {
                    await this.markJobProcessed(job.id, job.attempts + 1);
                    continue;
                }

                // Get request details for message
                const [requestData] = await db.select({
                    id: requests.id,
                    type: requests.type,
                    status: requests.status,
                    reason: requests.reason,
                    startDate: requests.startDate,
                    endDate: requests.endDate,
                    employeeName: users.name
                })
                .from(requests)
                .innerJoin(employees, eq(requests.employeeId, employees.id))
                .innerJoin(users, eq(employees.userId, users.id))
                .where(eq(requests.id, job.requestId))
                .limit(1);

                if (!requestData) {
                    await this.markJobProcessed(job.id, job.attempts + 1, 'Request not found');
                    continue;
                }

                const message = this.buildMessage(job.event, requestData);
                const success = await this.sendTelegram(pref.telegramChatId, message);

                if (success) {
                    await this.markJobProcessed(job.id, job.attempts + 1);
                    await this.logNotification(job.employeeId, job.requestId, job.event, 'sent');
                } else {
                    throw new Error('Failed to send telegram message');
                }

            } catch (error: any) {
                await db.update(notificationJobs)
                    .set({ 
                        attempts: job.attempts + 1,
                        lastError: error.message 
                    })
                    .where(eq(notificationJobs.id, job.id));
                
                await this.logNotification(job.employeeId, job.requestId, job.event, 'failed', error.message);
            }
        }
    },

    async markJobProcessed(jobId: number, attempts: number, error?: string) {
        await db.update(notificationJobs)
            .set({ 
                processedAt: new Date(),
                attempts,
                lastError: error || null
            })
            .where(eq(notificationJobs.id, jobId));
    },

    async logNotification(employeeId: string, requestId: string, event: string, status: string, error?: string) {
        await db.insert(notificationLogs).values({
            employeeId,
            requestId,
            event,
            status,
            errorText: error || null
        });
    },

    async enqueue(employeeId: string, requestId: string, event: string) {
        await db.insert(notificationJobs).values({
            employeeId,
            requestId,
            event,
        });
    },

    async enqueueForManager(employeeId: string, requestId: string) {
        // Find department manager
        const [emp] = await db.select({ managerId: departments.managerId })
            .from(employees)
            .innerJoin(departments, eq(employees.departmentId, departments.id))
            .where(eq(employees.id, employeeId))
            .limit(1);

        if (emp && emp.managerId) {
            await this.enqueue(emp.managerId, requestId, 'created');
        }
    },

    buildMessage(event: string, req: any) {
        const header = event === 'created' ? '<b>Pengajuan Baru</b>' :
                      event === 'approved' ? '<b>Pengajuan Disetujui</b>' :
                      '<b>Pengajuan Ditolak</b>';

        const dateRange = req.startDate === req.endDate ? req.startDate : `${req.startDate} s/d ${req.endDate}`;

        return `${header}\n\n` +
               `Pemohon: ${req.employeeName}\n` +
               `Jenis: ${req.type}\n` +
               `Tanggal: ${dateRange}\n` +
               `Alasan: ${req.reason || '-'}\n\n` +
               `ID: #${req.id.substring(0, 8)}`;
    }
};

