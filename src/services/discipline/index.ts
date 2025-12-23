import { supabase } from '../supabase';
import { Workplace, DisciplineScore, DisciplineCalculationResult } from '../../types/discipline';

// ==== DISCIPLINE SERVICE ====

export const disciplineService = {
    // ===== WORKPLACES =====

    /**
     * Get all workplaces
     */
    async getAllWorkplaces(activeOnly = true): Promise<Workplace[]> {
        let query = supabase.from('workplaces').select('*').order('name');
        if (activeOnly) {
            query = query.eq('is_active', true);
        }
        const { data, error } = await query;

        if (error) {
            console.error('Error fetching workplaces:', error);
            throw error;
        }
        return data || [];
    },

    /**
     * Get a single workplace by ID
     */
    async getWorkplaceById(id: string): Promise<Workplace | null> {
        const { data, error } = await supabase
            .from('workplaces')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching workplace:', error);
            return null;
        }
        return data;
    },

    /**
     * Create a new workplace
     */
    async createWorkplace(workplace: Omit<Workplace, 'id' | 'created_at' | 'updated_at'>): Promise<Workplace> {
        const { data, error } = await supabase
            .from('workplaces')
            .insert(workplace)
            .select()
            .single();

        if (error) {
            console.error('Error creating workplace:', error);
            throw error;
        }
        return data;
    },

    /**
     * Update an existing workplace
     */
    async updateWorkplace(id: string, updates: Partial<Omit<Workplace, 'id'>>): Promise<Workplace> {
        const { data, error } = await supabase
            .from('workplaces')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating workplace:', error);
            throw error;
        }
        return data;
    },

    /**
     * Delete a workplace (soft delete by setting is_active = false)
     */
    async deleteWorkplace(id: string): Promise<void> {
        const { error } = await supabase
            .from('workplaces')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (error) {
            console.error('Error deleting workplace:', error);
            throw error;
        }
    },

    /**
     * Assign a workplace to a user
     */
    async assignWorkplaceToUser(profileId: string, workplaceId: string | null): Promise<void> {
        const { error } = await supabase
            .from('profiles')
            .update({ workplace_id: workplaceId })
            .eq('id', profileId);

        if (error) {
            console.error('Error assigning workplace:', error);
            throw error;
        }
    },

    // ===== DISCIPLINE SCORES =====

    /**
     * Get discipline score for a specific user and period
     */
    async getDisciplineScore(profileId: string, month: number, year: number): Promise<DisciplineScore | null> {
        const { data, error } = await supabase
            .from('discipline_scores')
            .select('*')
            .eq('profile_id', profileId)
            .eq('period_month', month)
            .eq('period_year', year)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
            console.error('Error fetching discipline score:', error);
            return null;
        }
        return data;
    },

    /**
     * Get all discipline scores for a user (all periods)
     */
    async getUserDisciplineHistory(profileId: string, limit = 12): Promise<DisciplineScore[]> {
        const { data, error } = await supabase
            .from('discipline_scores')
            .select('*')
            .eq('profile_id', profileId)
            .order('period_year', { ascending: false })
            .order('period_month', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error fetching discipline history:', error);
            return [];
        }
        return data || [];
    },

    /**
     * Get discipline scores for all subordinates of a manager
     */
    async getSubordinatesDisciplineScores(managerId: string, month: number, year: number): Promise<(DisciplineScore & { profile_name?: string })[]> {
        const { data, error } = await supabase
            .from('discipline_scores')
            .select(`
                *,
                profiles!inner(full_name, manager_id)
            `)
            .eq('profiles.manager_id', managerId)
            .eq('period_month', month)
            .eq('period_year', year)
            .order('final_score', { ascending: true });

        if (error) {
            console.error('Error fetching subordinates discipline scores:', error);
            return [];
        }

        return (data || []).map(item => ({
            ...item,
            profile_name: (item.profiles as any)?.full_name,
        }));
    },

    /**
     * Calculate discipline score using database function
     */
    async calculateDisciplineScore(profileId: string, month: number, year: number): Promise<DisciplineCalculationResult | null> {
        const { data, error } = await supabase
            .rpc('calculate_discipline_score', {
                p_profile_id: profileId,
                p_month: month,
                p_year: year,
            });

        if (error) {
            console.error('Error calculating discipline score:', error);
            return null;
        }

        if (data && data.length > 0) {
            return data[0];
        }
        return null;
    },

    /**
     * Refresh (recalculate and save) discipline score
     */
    async refreshDisciplineScore(profileId: string, month: number, year: number): Promise<DisciplineScore | null> {
        console.log('[DisciplineService] Calling upsert_discipline_score RPC:', { profileId, month, year });
        const { data, error } = await supabase
            .rpc('upsert_discipline_score', {
                p_profile_id: profileId,
                p_month: month,
                p_year: year,
            });

        if (error) {
            console.error('[DisciplineService] RPC Error:', error);
            return null;
        }
        console.log('[DisciplineService] RPC Success, data:', data);
        return data;
    },

    /**
     * Batch refresh discipline scores for multiple users
     */
    async batchRefreshDisciplineScores(profileIds: string[], month: number, year: number): Promise<void> {
        const promises = profileIds.map(id => this.refreshDisciplineScore(id, month, year));
        await Promise.all(promises);
    },

    // ===== DISCIPLINE CONFIGURATION =====

    /**
     * Get discipline configuration
     */
    async getDisciplineConfiguration(): Promise<import('../../types/discipline').DisciplineConfigurationDB | null> {
        const { data, error } = await supabase
            .from('discipline_configuration')
            .select('*')
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Error fetching discipline configuration:', error);
            return null;
        }
        return data;
    },

    /**
     * Update discipline configuration
     */
    async updateDisciplineConfiguration(
        config: Partial<Omit<import('../../types/discipline').DisciplineConfigurationDB, 'id' | 'updated_at'>>,
        updatedBy?: string
    ): Promise<import('../../types/discipline').DisciplineConfigurationDB | null> {
        // First get the existing config to get its ID
        const existing = await this.getDisciplineConfiguration();

        if (!existing) {
            // If no config exists, insert a new one
            const { data, error } = await supabase
                .from('discipline_configuration')
                .insert({
                    ...config,
                    updated_by: updatedBy,
                })
                .select()
                .single();

            if (error) {
                console.error('Error creating discipline configuration:', error);
                throw error;
            }
            return data;
        }

        // Update existing config
        const { data, error } = await supabase
            .from('discipline_configuration')
            .update({
                ...config,
                updated_at: new Date().toISOString(),
                updated_by: updatedBy,
            })
            .eq('id', existing.id)
            .select()
            .single();

        if (error) {
            console.error('Error updating discipline configuration:', error);
            throw error;
        }
        return data;
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

