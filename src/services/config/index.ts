import api from '../apiClient';
import {
    Shift,
    Department,
    Bureau,
    Section,
    LeaveType,
    Holiday,
    OvertimeConfiguration,
    NotificationPreferences,
} from '../../types';

// ==== CONFIG SERVICE ====

export const configService = {
    // NOTIFICATION PREFERENCES
    async getNotificationPreferences(): Promise<NotificationPreferences> {
        return api.get<NotificationPreferences>('/api/notifications/preferences');
    },

    async updateNotificationPreferences(prefs: NotificationPreferences): Promise<NotificationPreferences> {
        return api.put<NotificationPreferences>('/api/notifications/preferences', prefs);
    },

    async updateTelegramChatId(chatId: string | null): Promise<NotificationPreferences> {
        return api.put<NotificationPreferences>('/api/notifications/telegram-chat-id', { telegram_chat_id: chatId });
    },

    // SHIFTS
    async getShifts(): Promise<Shift[]> {
        return api.get<Shift[]>('/api/schedules/shifts');
    },

    async saveShift(shiftData: Partial<Shift>): Promise<Shift> {
        if (shiftData.code) {
            return api.put<Shift>(`/api/schedules/shifts/${shiftData.code}`, shiftData);
        }
        return api.post<Shift>('/api/schedules/shifts', shiftData);
    },

    async deleteShift(shiftCode: string): Promise<void> {
        await api.delete(`/api/schedules/shifts/${shiftCode}`);
    },

    // ORGANIZATION STRUCTURE
    async getOrganizationStructure(): Promise<Department[]> {
        return api.get<Department[]>('/api/employees/organization');
    },

    async saveDepartment(dept: Partial<Department>): Promise<Department> {
        if (dept.id) {
            return api.put<Department>(`/api/employees/departments/${dept.id}`, dept);
        }
        return api.post<Department>('/api/employees/departments', dept);
    },

    async deleteDepartment(id: number): Promise<void> {
        await api.delete(`/api/employees/departments/${id}`);
    },

    async saveBureau(bureau: Partial<Bureau>): Promise<Bureau> {
        if (bureau.id) {
            return api.put<Bureau>(`/api/employees/bureaus/${bureau.id}`, bureau);
        }
        return api.post<Bureau>('/api/employees/bureaus', bureau);
    },

    async deleteBureau(id: number): Promise<void> {
        await api.delete(`/api/employees/bureaus/${id}`);
    },

    async saveSection(section: Partial<Section>): Promise<Section> {
        if (section.id) {
            return api.put<Section>(`/api/employees/sections/${section.id}`, section);
        }
        return api.post<Section>('/api/employees/sections', section);
    },

    async deleteSection(id: number): Promise<void> {
        await api.delete(`/api/employees/sections/${id}`);
    },

    // LEAVE TYPES
    async getLeaveTypes(): Promise<LeaveType[]> {
        return api.get<LeaveType[]>('/api/requests/leave-types');
    },

    async saveLeaveType(leaveType: Partial<LeaveType>): Promise<LeaveType> {
        if (leaveType.id) {
            return api.put<LeaveType>(`/api/requests/leave-types/${leaveType.id}`, leaveType);
        }
        return api.post<LeaveType>('/api/requests/leave-types', leaveType);
    },

    async deleteLeaveType(id: number): Promise<void> {
        await api.delete(`/api/requests/leave-types/${id}`);
    },

    // HOLIDAYS
    async getHolidays(): Promise<Holiday[]> {
        return api.get<Holiday[]>('/api/schedules/holidays');
    },

    async saveHoliday(holiday: Partial<Holiday>): Promise<Holiday> {
        if (holiday.id) {
            return api.put<Holiday>(`/api/schedules/holidays/${holiday.id}`, holiday);
        }
        return api.post<Holiday>('/api/schedules/holidays', holiday);
    },

    async deleteHoliday(id: number): Promise<void> {
        await api.delete(`/api/schedules/holidays/${id}`);
    },

    // OVERTIME CONFIGURATION
    async getOvertimeConfiguration(): Promise<OvertimeConfiguration | null> {
        try {
            return await api.get<OvertimeConfiguration>('/api/requests/overtime-config');
        } catch {
            return null;
        }
    },

    async saveOvertimeConfiguration(config: Partial<OvertimeConfiguration>): Promise<OvertimeConfiguration> {
        return api.put<OvertimeConfiguration>('/api/requests/overtime-config', config);
    },
};

// Export individual functions for granular imports
export const {
    getNotificationPreferences,
    updateNotificationPreferences,
    updateTelegramChatId,
    getShifts,
    saveShift,
    deleteShift,
    getOrganizationStructure,
    saveDepartment,
    deleteDepartment,
    saveBureau,
    deleteBureau,
    saveSection,
    deleteSection,
    getLeaveTypes,
    saveLeaveType,
    deleteLeaveType,
    getHolidays,
    saveHoliday,
    deleteHoliday,
    getOvertimeConfiguration,
    saveOvertimeConfiguration,
} = configService;
