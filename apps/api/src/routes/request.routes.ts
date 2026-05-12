import { Router } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { requestService } from '../services/request.service.js';

const router = Router();

// Submit leave request
router.post('/leave', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
        const request = await requestService.createLeaveRequest(req.user!.id, req.body);
        res.status(201).json(request);
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to create request' });
    }
});

// Submit overtime request
router.post('/overtime', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
        const request = await requestService.createOvertimeRequest(req.user!.id, req.body);
        res.status(201).json(request);
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to create request' });
    }
});

// Submit sick leave request
router.post('/sick', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
        const request = await requestService.createSickRequest(req.user!.id, req.body);
        res.status(201).json(request);
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to create request' });
    }
});

// Submit correction request
router.post('/correction', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
        const request = await requestService.createCorrectionRequest(req.user!.id, req.body);
        res.status(201).json(request);
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to create request' });
    }
});

// Submit shift swap request
router.post('/shift-swap', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
        const request = await requestService.createShiftSwapRequest(req.user!.id, req.body);
        res.status(201).json(request);
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to create request' });
    }
});

// Get own request history
router.get('/my-requests', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
        const requests = await requestService.getByEmployee(req.user!.id);
        res.json(requests);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get request by ID
router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
        const request = await requestService.getById(req.params.id);
        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }
        res.json(request);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Cancel pending request
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
        await requestService.cancel(req.params.id, req.user!.id);
        res.json({ message: 'Request cancelled' });
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to cancel request' });
    }
});

export { router as requestRoutes };
