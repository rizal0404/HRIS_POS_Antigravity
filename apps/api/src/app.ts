import express from 'express';
import cors from 'cors';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './config/auth.js';

// Import routes
import { employeeRoutes } from './routes/employee.routes.js';
import { attendanceRoutes } from './routes/attendance.routes.js';
import { requestRoutes } from './routes/request.routes.js';
import { scheduleRoutes } from './routes/schedule.routes.js';
import { reportRoutes } from './routes/report.routes.js';
import { managerRoutes } from './routes/manager.routes.js';
import { officeRoutes } from './routes/office.routes.js';
import { telegramRoutes } from './routes/telegram.routes.js';

const app = express();

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
}));
app.use(express.json());

// Better Auth handler - must be before other routes
app.all('/api/auth/*', toNodeHandler(auth));

// API Routes
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/manager', managerRoutes);
app.use('/api/offices', officeRoutes);
app.use('/api/telegram', telegramRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export { app };
