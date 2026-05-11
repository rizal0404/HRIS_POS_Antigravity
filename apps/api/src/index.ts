import 'dotenv/config';
import { app } from './app';
import { notificationService } from './services/notification.service';

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`ðŸš€ HRIS API server running on http://localhost:${PORT}`);
    console.log(`ðŸ“š Auth endpoints: http://localhost:${PORT}/api/auth/*`);
    console.log(`ðŸ’š Health check: http://localhost:${PORT}/api/health`);
});

// Notification Worker (Polls every 1 minute)
setInterval(async () => {
    console.log('--- Processing notification queue ---');
    await notificationService.processQueue();
}, 60 * 1000);
