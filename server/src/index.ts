import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import { app, pool } from './app';
import { NotificationService } from './services/notificationService';
import { initializeSocketIO } from './socketHandler';

dotenv.config();

const PORT = process.env.PORT || 3001;
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5000',
    credentials: true
  }
});

initializeSocketIO(io, pool);

setInterval(() => {
  NotificationService.cleanupOldNotifications().catch(console.error);
}, 24 * 60 * 60 * 1000);

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});