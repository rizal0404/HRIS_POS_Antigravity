// Services Barrel Export
// This file provides backward compatibility with existing imports
// while exposing the new modular service structure

// Re-export all services
export { attendanceService } from './attendance';
export { requestsService } from './requests';
export { profilesService } from './profiles';
export { schedulesService } from './schedules';
export { configService } from './config';
export { reportsService } from './reports';
export { disciplineService } from './discipline';

// Re-export helpers
export { handleSupabaseError, getAddressFromCoords } from './helpers';

// Re-export API client
export { default as api } from './apiClient';

// Re-export individual functions for granular imports
export * from './attendance';
export * from './requests';
export * from './profiles';
export * from './schedules';
export * from './config';
export * from './reports';
export * from './discipline';

// Import all services for the combined apiService object
import { attendanceService } from './attendance';
import { requestsService } from './requests';
import { profilesService } from './profiles';
import { schedulesService } from './schedules';
import { configService } from './config';
import { reportsService } from './reports';
import { disciplineService } from './discipline';

// Combined apiService object for backward compatibility
// This maintains the same interface as the original apiService
export const apiService = {
    // Attendance
    getActiveAttendance: attendanceService.getActiveAttendance.bind(attendanceService),
    getAttendanceById: attendanceService.getAttendanceById.bind(attendanceService),
    submitClockIn: attendanceService.submitClockIn.bind(attendanceService),
    createAttendanceForSubordinate: attendanceService.createAttendanceForSubordinate.bind(attendanceService),
    updateAttendanceAsManager: attendanceService.updateAttendanceAsManager.bind(attendanceService),
    submitClockOut: attendanceService.submitClockOut.bind(attendanceService),
    submitClockEvent: attendanceService.submitClockEvent.bind(attendanceService),
    getHistory: attendanceService.getHistory.bind(attendanceService),
    updateAttendance: attendanceService.updateAttendance.bind(attendanceService),

    // Requests
    getSubordinateRequests: requestsService.getSubordinateRequests.bind(requestsService),
    getAllRequests: requestsService.getAllRequests.bind(requestsService),
    submitRequest: requestsService.submitRequest.bind(requestsService),
    updateRequestStatus: requestsService.updateRequestStatus.bind(requestsService),
    getRequestsForUser: requestsService.getRequestsForUser.bind(requestsService),
    getRequestPrerequisites: requestsService.getRequestPrerequisites.bind(requestsService),
    getApprovedLeaves: requestsService.getApprovedLeaves.bind(requestsService),
    getRequestUpdatesForUser: requestsService.getRequestUpdatesForUser.bind(requestsService),
    reviseRequest: requestsService.reviseRequest.bind(requestsService),
    // Manager assignment methods
    assignRequestForSubordinate: requestsService.assignRequestForSubordinate.bind(requestsService),
    getSubordinatesMissingAttendance: requestsService.getSubordinatesMissingAttendance.bind(requestsService),

    // Profiles
    getProfiles: profilesService.getProfiles.bind(profilesService),
    saveProfile: profilesService.saveProfile.bind(profilesService),
    createProfile: profilesService.createProfile.bind(profilesService),
    deleteUser: profilesService.deleteUser.bind(profilesService),

    // Schedules
    getTeamSchedules: schedulesService.getTeamSchedules.bind(schedulesService),
    updateWorkSchedule: schedulesService.updateWorkSchedule.bind(schedulesService),
    bulkUpdateWorkSchedules: schedulesService.bulkUpdateWorkSchedules.bind(schedulesService),

    // Config
    getNotificationPreferences: configService.getNotificationPreferences.bind(configService),
    updateNotificationPreferences: configService.updateNotificationPreferences.bind(configService),
    updateTelegramChatId: configService.updateTelegramChatId.bind(configService),
    getShifts: configService.getShifts.bind(configService),
    saveShift: configService.saveShift.bind(configService),
    deleteShift: configService.deleteShift.bind(configService),
    getOrganizationStructure: configService.getOrganizationStructure.bind(configService),
    saveDepartment: configService.saveDepartment.bind(configService),
    deleteDepartment: configService.deleteDepartment.bind(configService),
    saveBureau: configService.saveBureau.bind(configService),
    deleteBureau: configService.deleteBureau.bind(configService),
    saveSection: configService.saveSection.bind(configService),
    deleteSection: configService.deleteSection.bind(configService),
    getLeaveTypes: configService.getLeaveTypes.bind(configService),
    saveLeaveType: configService.saveLeaveType.bind(configService),
    deleteLeaveType: configService.deleteLeaveType.bind(configService),
    getHolidays: configService.getHolidays.bind(configService),
    saveHoliday: configService.saveHoliday.bind(configService),
    deleteHoliday: configService.deleteHoliday.bind(configService),
    getOvertimeConfiguration: configService.getOvertimeConfiguration.bind(configService),
    saveOvertimeConfiguration: configService.saveOvertimeConfiguration.bind(configService),

    // Reports
    getAttendanceForSubordinates: reportsService.getAttendanceForSubordinates.bind(reportsService),
    getOvertimeRequestsForSubordinates: reportsService.getOvertimeRequestsForSubordinates.bind(reportsService),
    getLeaveRequestsForSubordinates: reportsService.getLeaveRequestsForSubordinates.bind(reportsService),
    getCorrectionRequestsForSubordinates: reportsService.getCorrectionRequestsForSubordinates.bind(reportsService),
    getOtherApprovedRequestsForPeriod: reportsService.getOtherApprovedRequestsForPeriod.bind(reportsService),
    getApprovedSubstitutionRequests: reportsService.getApprovedSubstitutionRequests.bind(reportsService),

    // Special function that needs cross-service access
    async addPembetulanPresensi(payload: {
        user: any;
        tanggalPembetulan: string;
        jamPembetulan: string;
        clockType: 'in' | 'out';
        alasan: string;
        todayAttendanceId?: string;
    }) {
        return attendanceService.addPembetulanPresensi(
            payload,
            requestsService.submitRequest.bind(requestsService)
        );
    },
};
