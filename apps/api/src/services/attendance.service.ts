import { db } from '../config/database.js';
import { attendance, employees, officeLocations, employeeShifts, shiftTemplates } from '../db/schema/index.js';
import { eq, and, sql } from 'drizzle-orm';

interface Location {
    latitude: number;
    longitude: number;
}

export const attendanceService = {
    async clockIn(userId: string, location: Location) {
        // Get employee
        const employee = await db.select().from(employees).where(eq(employees.userId, userId)).limit(1);
        if (!employee[0]) throw new Error('Employee not found');

        const today = new Date().toISOString().split('T')[0];

        // Check if already clocked in today
        const existing = await db.select().from(attendance)
            .where(and(
                eq(attendance.employeeId, employee[0].id),
                eq(attendance.attendanceDate, today)
            )).limit(1);

        if (existing[0]?.clockIn) {
            throw new Error('Already clocked in today');
        }

        // Validate GPS location against office locations
        const offices = await db.select().from(officeLocations).where(eq(officeLocations.isActive, true));
        const nearestOffice = this.findNearestOffice(location, offices);

        if (!nearestOffice) {
            throw new Error('Not within any office radius');
        }

        // Get shift for today to determine if late
        const shift = await this.getTodayShift(employee[0].id, today);
        const now = new Date();
        let status = 'on_time';
        let lateMinutes = 0;

        if (shift?.startTime) {
            const [hours, minutes] = shift.startTime.split(':').map(Number);
            const shiftStart = new Date(now);
            shiftStart.setHours(hours, minutes, 0, 0);

            if (now > shiftStart) {
                status = 'late';
                lateMinutes = Math.floor((now.getTime() - shiftStart.getTime()) / 60000);
            }
        }

        // Create or update attendance record
        if (existing[0]) {
            const result = await db.update(attendance)
                .set({
                    clockIn: now,
                    clockInLatitude: location.latitude.toString(),
                    clockInLongitude: location.longitude.toString(),
                    officeLocationId: nearestOffice.id,
                    status,
                    lateMinutes,
                    updatedAt: now,
                })
                .where(eq(attendance.id, existing[0].id))
                .returning();
            return result[0];
        }

        const result = await db.insert(attendance).values({
            employeeId: employee[0].id,
            attendanceDate: today,
            clockIn: now,
            clockInLatitude: location.latitude.toString(),
            clockInLongitude: location.longitude.toString(),
            officeLocationId: nearestOffice.id,
            status,
            lateMinutes,
        }).returning();

        return result[0];
    },

    async clockOut(userId: string, location: Location) {
        const employee = await db.select().from(employees).where(eq(employees.userId, userId)).limit(1);
        if (!employee[0]) throw new Error('Employee not found');

        const today = new Date().toISOString().split('T')[0];

        const existing = await db.select().from(attendance)
            .where(and(
                eq(attendance.employeeId, employee[0].id),
                eq(attendance.attendanceDate, today)
            )).limit(1);

        if (!existing[0]?.clockIn) {
            throw new Error('Must clock in first');
        }

        if (existing[0]?.clockOut) {
            throw new Error('Already clocked out today');
        }

        const now = new Date();
        const result = await db.update(attendance)
            .set({
                clockOut: now,
                clockOutLatitude: location.latitude.toString(),
                clockOutLongitude: location.longitude.toString(),
                updatedAt: now,
            })
            .where(eq(attendance.id, existing[0].id))
            .returning();

        return result[0];
    },

    async getTodayAttendance(userId: string) {
        const employee = await db.select().from(employees).where(eq(employees.userId, userId)).limit(1);
        if (!employee[0]) return null;

        const today = new Date().toISOString().split('T')[0];
        const result = await db.select().from(attendance)
            .where(and(
                eq(attendance.employeeId, employee[0].id),
                eq(attendance.attendanceDate, today)
            )).limit(1);

        return result[0] || null;
    },

    async getHistory(userId: string, startDate?: string, endDate?: string) {
        const employee = await db.select().from(employees).where(eq(employees.userId, userId)).limit(1);
        if (!employee[0]) return [];

        // Default to current month if no dates provided
        const now = new Date();
        const start = startDate || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const end = endDate || new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

        return db.select().from(attendance)
            .where(and(
                eq(attendance.employeeId, employee[0].id),
                sql`${attendance.attendanceDate} >= ${start}`,
                sql`${attendance.attendanceDate} <= ${end}`
            ))
            .orderBy(sql`${attendance.attendanceDate} DESC`);
    },

    async getTeamAttendance() {
        const today = new Date().toISOString().split('T')[0];
        return db.select().from(attendance)
            .where(eq(attendance.attendanceDate, today));
    },

    async getTodayShift(employeeId: string, date: string) {
        const result = await db.select()
            .from(employeeShifts)
            .innerJoin(shiftTemplates, eq(employeeShifts.shiftTemplateId, shiftTemplates.id))
            .where(and(
                eq(employeeShifts.employeeId, employeeId),
                eq(employeeShifts.shiftDate, date)
            ))
            .limit(1);

        return result[0]?.shift_templates || null;
    },

    findNearestOffice(location: Location, offices: any[]) {
        for (const office of offices) {
            const distance = this.calculateDistance(
                location.latitude,
                location.longitude,
                parseFloat(office.latitude),
                parseFloat(office.longitude)
            );

            if (distance <= office.radiusMeters) {
                return office;
            }
        }
        return null;
    },

    calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = (lat1 * Math.PI) / 180;
        const φ2 = (lat2 * Math.PI) / 180;
        const Δφ = ((lat2 - lat1) * Math.PI) / 180;
        const Δλ = ((lon2 - lon1) * Math.PI) / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c; // Distance in meters
    },
};
