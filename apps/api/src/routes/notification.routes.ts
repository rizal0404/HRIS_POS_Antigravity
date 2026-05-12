import { Router } from 'express';
import { db } from '../config/database.js';
import { notificationPreferences, employees, users } from '../db/schema/index.js';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// Get notification preferences
router.get('/preferences', requireAuth, async (req: any, res) => {
    try {
        const employeeId = await getEmployeeId(req.user.id);
        
        let [pref] = await db.select().from(notificationPreferences)
            .where(eq(notificationPreferences.employeeId, employeeId))
            .limit(1);

        if (!pref) {
            // Create default
            [pref] = await db.insert(notificationPreferences).values({
                employeeId,
            }).returning();
        }

        res.json(pref);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Update notification preferences
router.put('/preferences', requireAuth, async (req: any, res) => {
    try {
        const employeeId = await getEmployeeId(req.user.id);
        const { newRequest, requestApproved, requestRejected, telegramChatId } = req.body;

        const result = await db.insert(notificationPreferences)
            .values({
                employeeId,
                newRequest,
                requestApproved,
                requestRejected,
                telegramChatId,
                updatedAt: new Date(),
            })
            .onConflictDoUpdate({
                target: notificationPreferences.employeeId,
                set: {
                    newRequest,
                    requestApproved,
                    requestRejected,
                    telegramChatId,
                    updatedAt: new Date(),
                }
            })
            .returning();

        res.json(result[0]);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

async function getEmployeeId(userId: string) {
    const employee = await db.select().from(employees).where(eq(employees.userId, userId)).limit(1);
    if (!employee[0]) throw new Error('Employee not found');
    return employee[0].id;
}

export { router as notificationRoutes };
