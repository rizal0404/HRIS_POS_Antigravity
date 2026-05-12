import { notificationService } from './notification.service.js';
import { db } from '../config/database.js';
import { requests, employees } from '../db/schema/index.js';
import { eq, and, desc } from 'drizzle-orm';

interface LeaveRequestData {
    startDate: string;
    endDate: string;
    reason?: string;
}

interface OvertimeRequestData {
    date: string;
    startTime: string;
    endTime: string;
    reason?: string;
}

interface SickRequestData {
    startDate: string;
    endDate: string;
    reason?: string;
    attachmentUrl?: string;
}

interface CorrectionRequestData {
    correctionDate: string;
    correctionType: 'clock_in' | 'clock_out';
    correctedTime: string;
    reason?: string;
}

interface ShiftSwapRequestData {
    targetShiftId: string;
    substituteEmployeeId: string;
    reason?: string;
}

export const requestService = {
    async getEmployeeId(userId: string) {
        const employee = await db.select().from(employees).where(eq(employees.userId, userId)).limit(1);
        if (!employee[0]) throw new Error('Employee not found');
        return employee[0].id;
    },

    async createLeaveRequest(userId: string, data: LeaveRequestData) {
        const employeeId = await this.getEmployeeId(userId);

        // Calculate duration
        const start = new Date(data.startDate);
        const end = new Date(data.endDate);
        const durationDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        // Check leave balance
        const employee = await db.select().from(employees).where(eq(employees.id, employeeId)).limit(1);
        if (employee[0].annualLeaveBalance < durationDays) {
            throw new Error('Insufficient leave balance');
        }

        const result = await db.insert(requests).values({
            employeeId,
            type: 'leave',
            status: 'pending',
            startDate: data.startDate,
            endDate: data.endDate,
            durationDays,
            reason: data.reason,
        }).returning();

        await notificationService.enqueue(employeeId, result[0].id, 'created');
        await notificationService.enqueueForManager(employeeId, result[0].id);

        return result[0];
    },

    async createOvertimeRequest(userId: string, data: OvertimeRequestData) {
        const employeeId = await this.getEmployeeId(userId);

        // Calculate hours
        const [startHours, startMins] = data.startTime.split(':').map(Number);
        const [endHours, endMins] = data.endTime.split(':').map(Number);
        const durationHours = (endHours + endMins / 60) - (startHours + startMins / 60);

        const result = await db.insert(requests).values({
            employeeId,
            type: 'overtime',
            status: 'pending',
            startDate: data.date,
            endDate: data.date,
            startTime: data.startTime,
            endTime: data.endTime,
            durationHours: durationHours.toString(),
            reason: data.reason,
        }).returning();

        await notificationService.enqueue(employeeId, result[0].id, 'created');
        await notificationService.enqueueForManager(employeeId, result[0].id);

        return result[0];
    },

    async createSickRequest(userId: string, data: SickRequestData) {
        const employeeId = await this.getEmployeeId(userId);

        const start = new Date(data.startDate);
        const end = new Date(data.endDate);
        const durationDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        const result = await db.insert(requests).values({
            employeeId,
            type: 'sick',
            status: 'pending',
            startDate: data.startDate,
            endDate: data.endDate,
            durationDays,
            reason: data.reason,
            attachmentUrl: data.attachmentUrl,
        }).returning();

        await notificationService.enqueue(employeeId, result[0].id, 'created');
        await notificationService.enqueueForManager(employeeId, result[0].id);

        return result[0];
    },

    async createCorrectionRequest(userId: string, data: CorrectionRequestData) {
        const employeeId = await this.getEmployeeId(userId);

        const result = await db.insert(requests).values({
            employeeId,
            type: 'correction',
            status: 'pending',
            correctionDate: data.correctionDate,
            correctionType: data.correctionType,
            correctedTime: data.correctedTime,
            reason: data.reason,
        }).returning();

        await notificationService.enqueue(employeeId, result[0].id, 'created');
        await notificationService.enqueueForManager(employeeId, result[0].id);

        return result[0];
    },

    async createShiftSwapRequest(userId: string, data: ShiftSwapRequestData) {
        const employeeId = await this.getEmployeeId(userId);

        const result = await db.insert(requests).values({
            employeeId,
            type: 'shift_swap',
            status: 'pending',
            targetShiftId: data.targetShiftId,
            substituteEmployeeId: data.substituteEmployeeId,
            reason: data.reason,
        }).returning();

        await notificationService.enqueue(employeeId, result[0].id, 'created');
        await notificationService.enqueueForManager(employeeId, result[0].id);

        return result[0];
    },

    async getByEmployee(userId: string) {
        const employeeId = await this.getEmployeeId(userId);
        return db.select().from(requests)
            .where(eq(requests.employeeId, employeeId))
            .orderBy(desc(requests.createdAt));
    },

    async getById(id: string) {
        const result = await db.select().from(requests).where(eq(requests.id, id)).limit(1);
        return result[0] || null;
    },

    async cancel(id: string, userId: string) {
        const employeeId = await this.getEmployeeId(userId);
        const request = await this.getById(id);

        if (!request) throw new Error('Request not found');
        if (request.employeeId !== employeeId) throw new Error('Not authorized');
        if (request.status !== 'pending') throw new Error('Can only cancel pending requests');

        await db.delete(requests).where(eq(requests.id, id));
    },

    async getPending() {
        return db.select().from(requests)
            .where(eq(requests.status, 'pending'))
            .orderBy(desc(requests.createdAt));
    },
};

