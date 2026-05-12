import { db } from '../config/database.js';
import { disciplineScores, attendance, requests, employees } from '../db/schema/index.js';
import { eq, and, sql, count } from 'drizzle-orm';

export const disciplineService = {
    async calculateAndUpsertScore(employeeId: string, month: number, year: number) {
        // Count late arrivals
        const lateData = await db.select({ count: count() })
            .from(attendance)
            .where(and(
                eq(attendance.employeeId, employeeId),
                eq(attendance.status, 'late'),
                sql`EXTRACT(MONTH FROM ${attendance.attendanceDate}) = ${month}`,
                sql`EXTRACT(YEAR FROM ${attendance.attendanceDate}) = ${year}`
            ));
        const lateCount = Number(lateData[0].count);

        // Count corrections
        const correctionData = await db.select({ count: count() })
            .from(requests)
            .where(and(
                eq(requests.employeeId, employeeId),
                eq(requests.type, 'correction'),
                eq(requests.status, 'approved'),
                sql`EXTRACT(MONTH FROM ${requests.startDate}) = ${month}`,
                sql`EXTRACT(YEAR FROM ${requests.startDate}) = ${year}`
            ));
        const correctionCount = Number(correctionData[0].count);

        // Count sick leaves
        const sickData = await db.select({ count: count() })
            .from(requests)
            .where(and(
                eq(requests.employeeId, employeeId),
                eq(requests.type, 'sick'),
                eq(requests.status, 'approved'),
                sql`EXTRACT(MONTH FROM ${requests.startDate}) = ${month}`,
                sql`EXTRACT(YEAR FROM ${requests.startDate}) = ${year}`
            ));
        const sickLeaveCount = Number(sickData[0].count);

        // Final score calculation (Base 100)
        // -2 per late, -1 per correction
        const finalScore = Math.max(0, 100 - (lateCount * 2) - (correctionCount * 1));

        // Upsert score
        const result = await db.insert(disciplineScores)
            .values({
                employeeId,
                periodMonth: month,
                periodYear: year,
                lateCount,
                correctionCount,
                sickLeaveCount,
                finalScore,
                updatedAt: new Date(),
            })
            .onConflictDoUpdate({
                target: [disciplineScores.employeeId, disciplineScores.periodMonth, disciplineScores.periodYear],
                set: {
                    lateCount,
                    correctionCount,
                    sickLeaveCount,
                    finalScore,
                    updatedAt: new Date(),
                }
            })
            .returning();

        return result[0];
    },

    async getEmployeeScore(userId: string, month: number, year: number) {
        const employee = await db.select().from(employees).where(eq(employees.userId, userId)).limit(1);
        if (!employee[0]) throw new Error('Employee not found');

        let score = await db.select().from(disciplineScores)
            .where(and(
                eq(disciplineScores.employeeId, employee[0].id),
                eq(disciplineScores.periodMonth, month),
                eq(disciplineScores.periodYear, year)
            )).limit(1);

        if (!score[0]) {
            // Calculate on the fly if not exists
            return await this.calculateAndUpsertScore(employee[0].id, month, year);
        }

        return score[0];
    }
};
