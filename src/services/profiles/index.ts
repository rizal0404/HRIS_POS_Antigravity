import { supabase } from '../supabase';
import { UserProfile } from '../../types';
import { handleSupabaseError } from '../helpers';

// ==== PROFILES SERVICE ====

export const profilesService = {
    async getProfiles(): Promise<UserProfile[]> {
        const { data, error } = await supabase
            .from('profiles')
            .select('*');
        return handleSupabaseError({ data, error }, 'getProfiles');
    },

    async saveProfile(profileData: Partial<UserProfile>): Promise<UserProfile> {
        // Destructure id and isManager (which is not a DB column) to exclude them from the update payload.
        const { id, isManager, ...updateData } = profileData;
        const { data, error } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();
        return handleSupabaseError({ data, error }, 'saveProfile');
    },

    async createProfile(profileData: Partial<UserProfile>): Promise<UserProfile> {
        const { data, error } = await supabase
            .from('profiles')
            .insert([profileData])
            .select()
            .single();
        return handleSupabaseError({ data, error }, 'createProfile');
    },

    async deleteUser(userId: string): Promise<void> {
        const { error } = await supabase.rpc('delete_user', { p_user_id: userId });
        if (error) {
            handleSupabaseError({ data: null, error }, 'deleteUser');
        }
    },
};

// Export individual functions for granular imports
export const {
    getProfiles,
    saveProfile,
    createProfile,
    deleteUser,
} = profilesService;
