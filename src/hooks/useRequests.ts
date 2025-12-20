import { useState, useEffect, useCallback } from 'react';
import { Request, RequestStatus } from '../types';
import { requestsService } from '../services/requests';

// ==== REQUESTS HOOK ====

interface UseRequestsReturn {
    requests: Request[];
    loading: boolean;
    error: Error | null;
    submitRequest: (data: Omit<Request, 'id' | 'created_at' | 'status'>) => Promise<Request>;
    refetch: () => Promise<void>;
}

export function useRequests(profileId?: string): UseRequestsReturn {
    const [requests, setRequests] = useState<Request[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchRequests = useCallback(async () => {
        if (!profileId) {
            setRequests([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const data = await requestsService.getRequestsForUser(profileId, 100);
            setRequests(data);
        } catch (err) {
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    }, [profileId]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    const submitRequest = useCallback(async (data: Omit<Request, 'id' | 'created_at' | 'status'>) => {
        setError(null);
        try {
            const newRequest = await requestsService.submitRequest(data);
            setRequests(prev => [newRequest, ...prev]);
            return newRequest;
        } catch (err) {
            setError(err as Error);
            throw err;
        }
    }, []);

    return { requests, loading, error, submitRequest, refetch: fetchRequests };
}

// ==== SUBORDINATE REQUESTS HOOK ====

interface UseSubordinateRequestsReturn {
    requests: Request[];
    loading: boolean;
    error: Error | null;
    approveRequest: (requestId: string, approverId: string) => Promise<Request>;
    rejectRequest: (requestId: string, approverId: string) => Promise<Request>;
    refetch: () => Promise<void>;
}

export function useSubordinateRequests(subordinateIds: string[]): UseSubordinateRequestsReturn {
    const [requests, setRequests] = useState<Request[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchRequests = useCallback(async () => {
        if (subordinateIds.length === 0) {
            setRequests([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const data = await requestsService.getSubordinateRequests(subordinateIds);
            setRequests(data);
        } catch (err) {
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    }, [subordinateIds]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    const approveRequest = useCallback(async (requestId: string, approverId: string) => {
        setError(null);
        try {
            const updated = await requestsService.updateRequestStatus(requestId, RequestStatus.APPROVED, approverId);
            setRequests(prev => prev.map(r => r.id === requestId ? updated : r));
            return updated;
        } catch (err) {
            setError(err as Error);
            throw err;
        }
    }, []);

    const rejectRequest = useCallback(async (requestId: string, approverId: string) => {
        setError(null);
        try {
            const updated = await requestsService.updateRequestStatus(requestId, RequestStatus.REJECTED, approverId);
            setRequests(prev => prev.map(r => r.id === requestId ? updated : r));
            return updated;
        } catch (err) {
            setError(err as Error);
            throw err;
        }
    }, []);

    return { requests, loading, error, approveRequest, rejectRequest, refetch: fetchRequests };
}
