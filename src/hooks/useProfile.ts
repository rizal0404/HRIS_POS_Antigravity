import { useState, useEffect, useCallback } from 'react';
import { UserProfile } from '../types';
import { profilesService } from '../services/profiles';
import { supabase } from '../services/supabase';

// ==== PROFILE HOOK ====

interface UseProfileReturn {
    profile: UserProfile | null;
    allUsers: UserProfile[];
    loading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
    updateProfile: (data: Partial<UserProfile>) => Promise<UserProfile>;
}

export function useProfile(userId?: string): UseProfileReturn {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchProfiles = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const profiles = await profilesService.getProfiles();
            setAllUsers(profiles);

            if (userId) {
                const currentProfile = profiles.find(p => p.id === userId);
                setProfile(currentProfile || null);
            }
        } catch (err) {
            setError(err as Error);
            console.error('Error fetching profiles:', err);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchProfiles();
    }, [fetchProfiles]);

    const updateProfile = useCallback(async (data: Partial<UserProfile>) => {
        if (!profile) throw new Error('No profile to update');

        setError(null);
        try {
            const updated = await profilesService.saveProfile({ ...data, id: profile.id });
            setProfile(updated);
            return updated;
        } catch (err) {
            setError(err as Error);
            throw err;
        }
    }, [profile]);

    return { profile, allUsers, loading, error, refetch: fetchProfiles, updateProfile };
}

// ==== SUBORDINATES HOOK ====

interface UseSubordinatesReturn {
    subordinates: UserProfile[];
    subordinateIds: string[];
    loading: boolean;
    error: Error | null;
}

export function useSubordinates(managerId?: string): UseSubordinatesReturn {
    const [subordinates, setSubordinates] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!managerId) {
            setSubordinates([]);
            setLoading(false);
            return;
        }

        const fetchSubordinates = async () => {
            setLoading(true);
            try {
                const profiles = await profilesService.getProfiles();
                const subs = profiles.filter(p => p.manager_id === managerId);
                setSubordinates(subs);
            } catch (err) {
                setError(err as Error);
            } finally {
                setLoading(false);
            }
        };

        fetchSubordinates();
    }, [managerId]);

    return {
        subordinates,
        subordinateIds: subordinates.map(s => s.id),
        loading,
        error
    };
}
