import api from '../apiClient';
import { Workplace, DisciplineScore, DisciplineCalculationResult, DisciplineConfigurationDB } from '../../types/discipline';

// ==== DISCIPLINE SERVICE ====

export const disciplineService = {
    // ===== WORKPLACES =====

    async getAllWorkplaces(activeOnly = true): Promise<Workplace[]> {
        return api.get<Workplace[]>('/api/offices', { active_only: activeOnly });
    },

    async getWorkplaceById(id: string): Promise<Workplace | null> {
        try {
            return await api.get<Workplace>(`/api/offices/${id}`);
        } catch {
            return null;
        }
    },

    async createWorkplace(workplace: Omit<Workplace, 'id' | 'created_at' | 'updated_at'>): Promise<Workplace> {
        return api.post<Workplace>('/api/offices', workplace);
    },

    async updateWorkplace(id: string, updates: Partial<Omit<Workplace, 'id'>>): Promise<Workplace> {
        return api.patch<Workplace>(`/api/offices/${id}`, updates);
    },

    async deleteWorkplace(id: string): Promise<void> {
        await api.delete(`/api/offices/${id}`);
    },

    async assignWorkplaceToUser(profileId: string, workplaceId: string | null): Promise<void> {
        await api.patch(`/api/employees/${profileId}`, { workplace_id: workplaceId });
    },

    // ===== DISCIPLINE SCORES =====

    async getDisciplineScore(profileId: string, month: number, year: number): Promise<DisciplineScore | null> {
        try {
            return await api.get<DisciplineScore>(`/api/discipline/scores/${profileId}`, { month, year });
        } catch {
            return null;
        }
    },

    async getUserDisciplineHistory(profileId: string, limit = 12): Promise<DisciplineScore[]> {
        try {
            return await api.get<DisciplineScore[]>(`/api/discipline/scores/${profileId}/history`, { limit });
        } catch {
            return [];
        }
    },

    async getSubordinatesDisciplineScores(managerId: string, month: number, year: number): Promise<(DisciplineScore & { profile_name?: string })[]> {
        try {
            return await api.get<(DisciplineScore & { profile_name?: string })[]>(
                '/api/discipline/subordinates-scores',
                { manager_id: managerId, month, year }
            );
        } catch {
            return [];
        }
    },

    async calculateDisciplineScore(profileId: string, month: number, year: number): Promise<DisciplineCalculationResult | null> {
        try {
            return await api.post<DisciplineCalculationResult>('/api/discipline/calculate', {
                profile_id: profileId, month, year,
            });
        } catch {
            return null;
        }
    },

    async refreshDisciplineScore(profileId: string, month: number, year: number): Promise<DisciplineScore | null> {
        try {
            return await api.post<DisciplineScore>('/api/discipline/refresh', {
                profile_id: profileId, month, year,
            });
        } catch {
            return null;
        }
    },

    async batchRefreshDisciplineScores(profileIds: string[], month: number, year: number): Promise<void> {
        await api.post('/api/discipline/batch-refresh', { profile_ids: profileIds, month, year });
    },

    // ===== DISCIPLINE CONFIGURATION =====

    async getDisciplineConfiguration(): Promise<DisciplineConfigurationDB | null> {
        try {
            return await api.get<DisciplineConfigurationDB>('/api/discipline/configuration');
        } catch {
            return null;
        }
    },

    async updateDisciplineConfiguration(
        config: Partial<Omit<DisciplineConfigurationDB, 'id' | 'updated_at'>>,
        updatedBy?: string
    ): Promise<DisciplineConfigurationDB | null> {
        return api.put<DisciplineConfigurationDB>('/api/discipline/configuration', {
            ...config,
            updated_by: updatedBy,
        });
    },
};

// Export individual functions for granular imports
export const {
    getAllWorkplaces,
    getWorkplaceById,
    createWorkplace,
    updateWorkplace,
    deleteWorkplace,
    assignWorkplaceToUser,
    getDisciplineScore,
    getUserDisciplineHistory,
    getSubordinatesDisciplineScores,
    calculateDisciplineScore,
    refreshDisciplineScore,
    batchRefreshDisciplineScores,
    getDisciplineConfiguration,
    updateDisciplineConfiguration,
} = disciplineService;
