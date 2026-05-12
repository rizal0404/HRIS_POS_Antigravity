import express from 'express';
import cors from 'cors';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './config/auth';

// Import routes
import { employeeRoutes } from './routes/employee.routes';
import { attendanceRoutes } from './routes/attendance.routes';
import { requestRoutes } from './routes/request.routes';
import { scheduleRoutes } from './routes/schedule.routes';
import { reportRoutes } from './routes/report.routes';
import { managerRoutes } from './routes/manager.routes';
import { officeRoutes } from './routes/office.routes';
import { notificationRoutes } from './routes/notification.routes';
import { disciplineRoutes } from './routes/discipline.routes';
import { telegramRoutes } from './routes/telegram.routes';

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
app.use('/api/notifications', notificationRoutes);
app.use('/api/discipline', disciplineRoutes);
app.use('/api/telegram', telegramRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export { app };
