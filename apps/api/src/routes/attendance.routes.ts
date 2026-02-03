import { Router } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware';
import { attendanceService } from '../services/attendance.service';

const router = Router();

// Clock in with GPS
router.post('/clock-in', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
        const { latitude, longitude } = req.body;

        if (!latitude || !longitude) {
            return res.status(400).json({ error: 'Location is required' });
        }

        const attendance = await attendanceService.clockIn(
            req.user!.id,
            { latitude, longitude }
        );

        res.json(attendance);
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to clock in' });
    }
});

// Clock out with GPS
router.post('/clock-out', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
        const { latitude, longitude } = req.body;

        if (!latitude || !longitude) {
            return res.status(400).json({ error: 'Location is required' });
        }

        const attendance = await attendanceService.clockOut(
            req.user!.id,
            { latitude, longitude }
        );

        res.json(attendance);
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to clock out' });
    }
});

// Get today's attendance
router.get('/today', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
        const attendance = await attendanceService.getTodayAttendance(req.user!.id);
        res.json(attendance);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get attendance history
router.get('/history', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
        const { startDate, endDate } = req.query;
        const history = await attendanceService.getHistory(
            req.user!.id,
            startDate as string,
            endDate as string
        );
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get team attendance (manager only)
router.get('/team', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
        if (req.user!.role !== 'manager' && req.user!.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const attendance = await attendanceService.getTeamAttendance();
        res.json(attendance);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

export { router as attendanceRoutes };
