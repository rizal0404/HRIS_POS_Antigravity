import { db } from '../config/database.js';
import { requests, requestApprovals, employees, attendance } from '../db/schema/index.js';
import { eq, and, sql, desc } from 'drizzle-orm';

export const managerService = {
    async getDashboardStats() {
        const today = new Date().toISOString().split('T')[0];

        // Get today's attendance
        const todayAttendance = await db.select().from(attendance)
            .where(eq(attendance.attendanceDate, today));

        // Get all employees
        const allEmployees = await db.select().from(employees);

        // Get pending requests
        const pendingRequests = await db.select().from(requests)
            .where(eq(requests.status, 'pending'));

        const present = todayAttendance.filter(a => a.clockIn).length;
        const onLeave = todayAttendance.filter(a => a.status === 'leave').length;
        const sick = todayAttendance.filter(a => a.status === 'sick').length;

        return {
            totalEmployees: allEmployees.length,
            totalPresent: present,
            onLeave,
            sick,
            pendingRequests: pendingRequests.length,
            attendanceRate: allEmployees.length > 0
                ? ((present / allEmployees.length) * 100).toFixed(1)
                : 0,
        };
    },

    async getPendingApprovals() {
        return db.select()
            .from(requests)
            .innerJoin(employees, eq(requests.employeeId, employees.id))
            .where(eq(requests.status, 'pending'))
            .orderBy(desc(requests.createdAt));
    },

    async approveRequest(requestId: string, approverId: string, notes?: string, substituteEmployeeId?: string) {
        const request = await db.select().from(requests).where(eq(requests.id, requestId)).limit(1);
        if (!request[0]) throw new Error('Request not found');
        if (request[0].status !== 'pending') throw new Error('Request is not pending');

        // Update request status
        await db.update(requests)
            .set({
                status: 'approved',
                substituteEmployeeId: substituteEmployeeId || request[0].substituteEmployeeId,
                updatedAt: new Date(),
            })
            .where(eq(requests.id, requestId));

        // Create approval record
        await db.insert(requestApprovals).values({
            requestId,
            approverId,
            decision: 'approved',
            notes,
        });

        // Handle leave approval - deduct from balance
        if (request[0].type === 'leave' && request[0].durationDays) {
            await db.update(employees)
                .set({
                    annualLeaveBalance: sql`${employees.annualLeaveBalance} - ${request[0].durationDays}`,
                    updatedAt: new Date(),
                })
                .where(eq(employees.id, request[0].employeeId));
        }

        // Handle overtime approval - add hours
        if (request[0].type === 'overtime' && request[0].durationHours) {
            await db.update(employees)
                .set({
                    overtimeHoursUsed: sql`${employees.overtimeHoursUsed} + ${Math.ceil(parseFloat(request[0].durationHours))}`,
                    updatedAt: new Date(),
                })
                .where(eq(employees.id, request[0].employeeId));
        }

        return { message: 'Request approved' };
    },

    async rejectRequest(requestId: string, approverId: string, notes?: string) {
        const request = await db.select().from(requests).where(eq(requests.id, requestId)).limit(1);
        if (!request[0]) throw new Error('Request not found');
        if (request[0].status !== 'pending') throw new Error('Request is not pending');

        await db.update(requests)
            .set({ status: 'rejected', updatedAt: new Date() })
            .where(eq(requests.id, requestId));

        await db.insert(requestApprovals).values({
            requestId,
            approverId,
            decision: 'rejected',
            notes,
        });

        return { message: 'Request rejected' };
    },

    async reviseRequest(requestId: string, approverId: string, notes: string) {
        const request = await db.select().from(requests).where(eq(requests.id, requestId)).limit(1);
        if (!request[0]) throw new Error('Request not found');
        if (request[0].status !== 'pending') throw new Error('Request is not pending');

        // Update request status to 'revision' (indicating it needs revision)
        await db.update(requests)
            .set({ status: 'revision', updatedAt: new Date() })
            .where(eq(requests.id, requestId));

        // Create approval record with decision 'revision'
        await db.insert(requestApprovals).values({
            requestId,
            approverId,
            decision: 'revision',
            notes,
        });

        return { message: 'Request revision requested' };
    },

    async getSuggestedSubstitutes(requestId: string) {
        const request = await db.select().from(requests).where(eq(requests.id, requestId)).limit(1);
        if (!request[0]) throw new Error('Request not found');

        // Get all employees except the requester
        const allEmployees = await db.select()
            .from(employees)
            .where(sql`${employees.id} != ${request[0].employeeId}`);

        // Simple suggestion: employees with lowest overtime hours (most available)
        const suggestions = allEmployees
            .sort((a, b) => a.overtimeHoursUsed - b.overtimeHoursUsed)
            .slice(0, 3)
            .map(emp => ({
                id: emp.id,
                employeeId: emp.employeeId,
                position: emp.position,
                currentLoad: emp.overtimeHoursUsed,
                maxLoad: emp.overtimeHoursMax,
                matchScore: Math.round((1 - emp.overtimeHoursUsed / emp.overtimeHoursMax) * 100),
            }));

        return suggestions;
    },
};
