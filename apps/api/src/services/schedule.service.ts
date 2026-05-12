import { db } from '../config/database.js';
import { shiftTemplates, employeeShifts, employees } from '../db/schema/index.js';
import { eq, and, sql, asc } from 'drizzle-orm';

interface ShiftTemplateData {
    name: string;
    startTime?: string;
    endTime?: string;
    color?: string;
}

interface ShiftAssignmentData {
    employeeId: string;
    shiftTemplateId: string;
    shiftDate: string;
}

export const scheduleService = {
    async getEmployeeSchedule(userId: string, weekOffset: number = 0) {
        const employee = await db.select().from(employees).where(eq(employees.userId, userId)).limit(1);
        if (!employee[0]) return [];

        // Calculate week dates
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay() + 1 + (weekOffset * 7));
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        const startDate = startOfWeek.toISOString().split('T')[0];
        const endDate = endOfWeek.toISOString().split('T')[0];

        return db.select()
            .from(employeeShifts)
            .innerJoin(shiftTemplates, eq(employeeShifts.shiftTemplateId, shiftTemplates.id))
            .where(and(
                eq(employeeShifts.employeeId, employee[0].id),
                sql`${employeeShifts.shiftDate} >= ${startDate}`,
                sql`${employeeShifts.shiftDate} <= ${endDate}`
            ))
            .orderBy(asc(employeeShifts.shiftDate));
    },

    async getEmployeeMonthlySchedule(userId: string, month?: number, year?: number) {
        const employee = await db.select().from(employees).where(eq(employees.userId, userId)).limit(1);
        if (!employee[0]) return [];

        const now = new Date();
        const targetMonth = month ?? now.getMonth() + 1;
        const targetYear = year ?? now.getFullYear();

        const startDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
        const lastDay = new Date(targetYear, targetMonth, 0).getDate();
        const endDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${lastDay}`;

        return db.select()
            .from(employeeShifts)
            .innerJoin(shiftTemplates, eq(employeeShifts.shiftTemplateId, shiftTemplates.id))
            .where(and(
                eq(employeeShifts.employeeId, employee[0].id),
                sql`${employeeShifts.shiftDate} >= ${startDate}`,
                sql`${employeeShifts.shiftDate} <= ${endDate}`
            ))
            .orderBy(asc(employeeShifts.shiftDate));
    },

    async getShiftTemplates() {
        return db.select().from(shiftTemplates);
    },

    async createShiftTemplate(data: ShiftTemplateData) {
        const result = await db.insert(shiftTemplates).values({
            name: data.name,
            startTime: data.startTime,
            endTime: data.endTime,
            color: data.color || '#3b82f6',
        }).returning();
        return result[0];
    },

    async getTeamSchedule(startDate: string, endDate: string) {
        return db.select()
            .from(employeeShifts)
            .innerJoin(shiftTemplates, eq(employeeShifts.shiftTemplateId, shiftTemplates.id))
            .innerJoin(employees, eq(employeeShifts.employeeId, employees.id))
            .where(and(
                sql`${employeeShifts.shiftDate} >= ${startDate}`,
                sql`${employeeShifts.shiftDate} <= ${endDate}`
            ))
            .orderBy(asc(employeeShifts.shiftDate));
    },

    async assignShift(data: ShiftAssignmentData) {
        const result = await db.insert(employeeShifts).values({
            employeeId: data.employeeId,
            shiftTemplateId: data.shiftTemplateId,
            shiftDate: data.shiftDate,
        }).returning();
        return result[0];
    },

    async updateShiftAssignment(id: string, data: Partial<ShiftAssignmentData>) {
        const result = await db.update(employeeShifts)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(employeeShifts.id, id))
            .returning();
        return result[0];
    },

    async deleteShiftAssignment(id: string) {
        await db.delete(employeeShifts).where(eq(employeeShifts.id, id));
    },
};
