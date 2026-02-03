import { Router } from 'express';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth.middleware';
import { managerService } from '../services/manager.service';

const router = Router();

// Get dashboard stats
router.get('/dashboard', requireAuth, requireRole('manager', 'admin'), async (req: AuthenticatedRequest, res) => {
    try {
        const stats = await managerService.getDashboardStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get pending approvals
router.get('/pending-approvals', requireAuth, requireRole('manager', 'admin'), async (req: AuthenticatedRequest, res) => {
    try {
        const approvals = await managerService.getPendingApprovals();
        res.json(approvals);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Approve request
router.post('/approve/:requestId', requireAuth, requireRole('manager', 'admin'), async (req: AuthenticatedRequest, res) => {
    try {
        const { notes, substituteEmployeeId } = req.body;
        const result = await managerService.approveRequest(
            req.params.requestId,
            req.user!.id,
            notes,
            substituteEmployeeId
        );
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to approve request' });
    }
});

// Reject request
router.post('/reject/:requestId', requireAuth, requireRole('manager', 'admin'), async (req: AuthenticatedRequest, res) => {
    try {
        const { notes } = req.body;
        const result = await managerService.rejectRequest(
            req.params.requestId,
            req.user!.id,
            notes
        );
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to reject request' });
    }
});

// Request revision
router.post('/revise/:requestId', requireAuth, requireRole('manager', 'admin'), async (req: AuthenticatedRequest, res) => {
    try {
        const { notes } = req.body;
        if (!notes) {
            return res.status(400).json({ error: 'Revision notes are required' });
        }
        const result = await managerService.reviseRequest(
            req.params.requestId,
            req.user!.id,
            notes
        );
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to request revision' });
    }
});

// Get AI-suggested substitutes for a request
router.get('/substitutes/:requestId', requireAuth, requireRole('manager', 'admin'), async (req: AuthenticatedRequest, res) => {
    try {
        const substitutes = await managerService.getSuggestedSubstitutes(req.params.requestId);
        res.json(substitutes);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

export { router as managerRoutes };
