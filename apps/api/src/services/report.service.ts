import { db } from '../config/database';
import { attendance, employees } from '../db/schema';
import { eq, and, sql, count } from 'drizzle-orm';

export const reportService = {
    async getEmployeeSummary(userId: string, month?: number, year?: number) {
        const employee = await db.select().from(employees).where(eq(employees.userId, userId)).limit(1);
        if (!employee[0]) return null;

        const now = new Date();
        const targetMonth = month ?? now.getMonth() + 1;
        const targetYear = year ?? now.getFullYear();

        const startDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
        const lastDay = new Date(targetYear, targetMonth, 0).getDate();
        const endDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${lastDay}`;

        const records = await db.select().from(attendance)
            .where(and(
                eq(attendance.employeeId, employee[0].id),
                sql`${attendance.attendanceDate} >= ${startDate}`,
                sql`${attendance.attendanceDate} <= ${endDate}`
            ));

        const summary = {
            month: targetMonth,
            year: targetYear,
            totalPresent: records.filter(r => r.clockIn).length,
            totalLate: records.filter(r => r.status === 'late').length,
            totalAbsent: records.filter(r => r.status === 'absent').length,
            totalLeave: records.filter(r => r.status === 'leave').length,
            totalLateMinutes: records.reduce((acc, r) => acc + (r.lateMinutes || 0), 0),
        };

        return summary;
    },

    async getEmployeeQuotas(userId: string) {
        const employee = await db.select().from(employees).where(eq(employees.userId, userId)).limit(1);
        if (!employee[0]) return null;

        return {
            annualLeave: {
                balance: employee[0].annualLeaveBalance,
                total: employee[0].annualLeaveTotal,
                used: employee[0].annualLeaveTotal - employee[0].annualLeaveBalance,
            },
            overtime: {
                used: employee[0].overtimeHoursUsed,
                max: employee[0].overtimeHoursMax,
                remaining: employee[0].overtimeHoursMax - employee[0].overtimeHoursUsed,
            },
        };
    },

    async getTeamSummary(month?: number, year?: number) {
        const now = new Date();
        const targetMonth = month ?? now.getMonth() + 1;
        const targetYear = year ?? now.getFullYear();

        const startDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
        const lastDay = new Date(targetYear, targetMonth, 0).getDate();
        const endDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${lastDay}`;

        const records = await db.select().from(attendance)
            .where(and(
                sql`${attendance.attendanceDate} >= ${startDate}`,
                sql`${attendance.attendanceDate} <= ${endDate}`
            ));

        const allEmployees = await db.select().from(employees);

        return {
            month: targetMonth,
            year: targetYear,
            totalEmployees: allEmployees.length,
            totalPresent: records.filter(r => r.clockIn).length,
            totalLate: records.filter(r => r.status === 'late').length,
            totalAbsent: records.filter(r => r.status === 'absent').length,
            averageAttendanceRate: records.length > 0
                ? (records.filter(r => r.clockIn).length / records.length * 100).toFixed(1)
                : 0,
        };
    },

    async exportReport(format: string, month?: number, year?: number) {
        const summary = await this.getTeamSummary(month, year);

        if (format === 'csv') {
            const headers = 'Month,Year,Total Employees,Total Present,Total Late,Total Absent,Attendance Rate\n';
            const row = `${summary?.month},${summary?.year},${summary?.totalEmployees},${summary?.totalPresent},${summary?.totalLate},${summary?.totalAbsent},${summary?.averageAttendanceRate}%`;
            return headers + row;
        }

        return JSON.stringify(summary, null, 2);
    },
};
