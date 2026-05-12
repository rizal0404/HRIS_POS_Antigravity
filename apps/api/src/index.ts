import 'dotenv/config';
import { app } from './app.js';

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`🚀 HRIS API server running on http://localhost:${PORT}`);
    console.log(`📚 Auth endpoints: http://localhost:${PORT}/api/auth/*`);
    console.log(`💚 Health check: http://localhost:${PORT}/api/health`);
});
