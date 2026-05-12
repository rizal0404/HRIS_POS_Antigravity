import api from '../apiClient';
import { UserProfile } from '../../types';

// ==== PROFILES SERVICE ====

export const profilesService = {
    async getProfiles(): Promise<UserProfile[]> {
        return api.get<UserProfile[]>('/api/employees');
    },

    async saveProfile(profileData: Partial<UserProfile>): Promise<UserProfile> {
        const { id, isManager, ...updateData } = profileData;
        return api.patch<UserProfile>(`/api/employees/${id}`, updateData);
    },

    async createProfile(profileData: Partial<UserProfile>): Promise<UserProfile> {
        return api.post<UserProfile>('/api/employees', profileData);
    },

    async deleteUser(userId: string): Promise<void> {
        await api.delete(`/api/employees/${userId}`);
    },
};

// Export individual functions for granular imports
export const {
    getProfiles,
    saveProfile,
    createProfile,
    deleteUser,
} = profilesService;
