import { Router } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { employeeService } from '../services/employee.service.js';

const router = Router();

// Get current employee profile
router.get('/me', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
        const employee = await employeeService.getByUserId(req.user!.id);
        if (!employee) {
            return res.status(404).json({ error: 'Employee profile not found' });
        }
        res.json(employee);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update current employee profile
router.put('/me', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
        const employee = await employeeService.updateByUserId(req.user!.id, req.body);
        res.json(employee);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// List all employees (manager only)
router.get('/', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
        if (req.user!.role !== 'manager' && req.user!.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const employees = await employeeService.getAll();
        res.json(employees);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get employee by ID (manager only)
router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
        if (req.user!.role !== 'manager' && req.user!.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const employee = await employeeService.getById(req.params.id);
        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        res.json(employee);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update employee email (admin only)
router.put('/:id/email', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
        if (req.user!.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const employee = await employeeService.getById(req.params.id);
        if (!employee) return res.status(404).json({ error: 'Employee not found' });

        await employeeService.updateEmail(employee.userId, req.body.email);
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export { router as employeeRoutes };

