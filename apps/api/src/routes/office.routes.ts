import { Router } from 'express';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { officeService } from '../services/office.service.js';

const router = Router();

// Get all office locations
router.get('/', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
        const offices = await officeService.getAll();
        res.json(offices);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get active office locations (for clock in validation)
router.get('/active', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
        const offices = await officeService.getActive();
        res.json(offices);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create office location (admin only)
router.post('/', requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
    try {
        const office = await officeService.create(req.body);
        res.status(201).json(office);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update office location (admin only)
router.put('/:id', requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
    try {
        const office = await officeService.update(req.params.id, req.body);
        res.json(office);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete office location (admin only)
router.delete('/:id', requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
    try {
        await officeService.delete(req.params.id);
        res.json({ message: 'Office location deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

export { router as officeRoutes };
