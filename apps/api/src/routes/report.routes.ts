import { Router } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware';
import { reportService } from '../services/report.service';

const router = Router();

// Get monthly attendance summary
router.get('/my-summary', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
        const { month, year } = req.query;
        const summary = await reportService.getEmployeeSummary(
            req.user!.id,
            parseInt(month as string),
            parseInt(year as string)
        );
        res.json(summary);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get leave/overtime quotas
router.get('/my-quotas', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
        const quotas = await reportService.getEmployeeQuotas(req.user!.id);
        res.json(quotas);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get team summary (manager only)
router.get('/team-summary', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
        if (req.user!.role !== 'manager' && req.user!.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const { month, year } = req.query;
        const summary = await reportService.getTeamSummary(
            parseInt(month as string),
            parseInt(year as string)
        );
        res.json(summary);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Export report (manager only)
router.get('/export', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
        if (req.user!.role !== 'manager' && req.user!.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const { format, month, year } = req.query;
        const data = await reportService.exportReport(
            format as string || 'csv',
            parseInt(month as string),
            parseInt(year as string)
        );

        res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
        res.send(data);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

export { router as reportRoutes };
