import { db } from '../config/database';
import { requests, profiles } from '../db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

export const requestService = {
    async getByProfile(profileId: string) {
        return db.select().from(requests)
            .where(eq(requests.profile_id, profileId))
            .orderBy(desc(requests.created_at));
    },

    async getById(id: string) {
        const result = await db.select().from(requests)
            .where(eq(requests.id, BigInt(id)))
            .limit(1);
        return result[0] || null;
    },

    async create(data: {
        profile_id: string;
        request_type: 'Cuti' | 'Lembur' | 'Izin' | 'Sakit' | 'Koreksi Absensi' | 'Registrasi Pegawai' | 'Substitusi';
        start_date: string;
        end_date: string;
        reason: string;
        start_time?: string;
        end_time?: string;
        approver_id?: string;
        attachment_url?: string;
        attendance_id_to_correct?: bigint;
        is_manager_assigned?: boolean;
        assigned_by_id?: string;
        day_shift_substitute_id?: string;
        night_shift_substitute_id?: string;
    }) {
        const result = await db.insert(requests).values({
            profile_id: data.profile_id,
            request_type: data.request_type,
            status: 'pending',
            start_date: data.start_date,
            end_date: data.end_date,
            reason: data.reason,
            start_time: data.start_time,
            end_time: data.end_time,
            approver_id: data.approver_id,
            attachment_url: data.attachment_url,
            attendance_id_to_correct: data.attendance_id_to_correct,
            is_manager_assigned: data.is_manager_assigned ?? false,
            assigned_by_id: data.assigned_by_id,
            day_shift_substitute_id: data.day_shift_substitute_id,
            night_shift_substitute_id: data.night_shift_substitute_id,
        }).returning();
        return result[0];
    },

    async updateStatus(id: string, status: 'approved' | 'rejected' | 'revised' | 'revision', approverNotes?: string) {
        const result = await db.update(requests)
            .set({
                status,
                approver_notes: approverNotes,
                updated_at: new Date(),
            })
            .where(eq(requests.id, BigInt(id)))
            .returning();
        return result[0];
    },

    async cancel(id: string, profileId: string) {
        const request = await this.getById(id);
        if (!request) throw new Error('Request not found');
        if (request.profile_id !== profileId) throw new Error('Not authorized');
        if (request.status !== 'pending') throw new Error('Can only cancel pending requests');

        await db.delete(requests).where(eq(requests.id, BigInt(id)));
    },

    async getPending() {
        return db.select().from(requests)
            .where(eq(requests.status, 'pending'))
            .orderBy(desc(requests.created_at));
    },

    async getByFilters(filters: {
        profile_id?: string;
        request_type?: string;
        status?: string;
        year?: number;
    }) {
        const conditions = [];
        if (filters.profile_id) conditions.push(eq(requests.profile_id, filters.profile_id));
        if (filters.request_type) conditions.push(eq(requests.request_type, filters.request_type as any));
        if (filters.status) conditions.push(eq(requests.status, filters.status as any));
        if (filters.year) {
            conditions.push(sql`EXTRACT(YEAR FROM ${requests.start_date}::date) = ${filters.year}`);
        }

        if (conditions.length === 0) {
            return db.select().from(requests).orderBy(desc(requests.created_at));
        }

        return db.select().from(requests)
            .where(and(...conditions))
            .orderBy(desc(requests.created_at));
    },
};
