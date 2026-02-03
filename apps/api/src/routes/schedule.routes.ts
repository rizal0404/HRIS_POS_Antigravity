import { Router } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware';
import { scheduleService } from '../services/schedule.service';

const router = Router();

// Get own weekly schedule
router.get('/my-schedule', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
        const { weekOffset } = req.query;
        const schedule = await scheduleService.getEmployeeSchedule(
            req.user!.id,
            parseInt(weekOffset as string) || 0
        );
        res.json(schedule);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get own monthly schedule
router.get('/my-schedule/monthly', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
        const { month, year } = req.query;
        const schedule = await scheduleService.getEmployeeMonthlySchedule(
            req.user!.id,
            parseInt(month as string),
            parseInt(year as string)
        );
        res.json(schedule);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get shift templates
router.get('/templates', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
        const templates = await scheduleService.getShiftTemplates();
        res.json(templates);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create shift template (manager only)
router.post('/templates', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
        if (req.user!.role !== 'manager' && req.user!.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const template = await scheduleService.createShiftTemplate(req.body);
        res.status(201).json(template);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get team schedule (manager only)
router.get('/team', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
        if (req.user!.role !== 'manager' && req.user!.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const { startDate, endDate } = req.query;
        const schedule = await scheduleService.getTeamSchedule(
            startDate as string,
            endDate as string
        );
        res.json(schedule);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Assign shift to employee (manager only)
router.post('/assign', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
        if (req.user!.role !== 'manager' && req.user!.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const assignment = await scheduleService.assignShift(req.body);
        res.status(201).json(assignment);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update shift assignment (manager only)
router.put('/assign/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
        if (req.user!.role !== 'manager' && req.user!.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const assignment = await scheduleService.updateShiftAssignment(req.params.id, req.body);
        res.json(assignment);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete shift assignment (manager only)
router.delete('/assign/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
        if (req.user!.role !== 'manager' && req.user!.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        await scheduleService.deleteShiftAssignment(req.params.id);
        res.json({ message: 'Shift assignment deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

export { router as scheduleRoutes };
