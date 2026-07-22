import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import healthRoutes from './routes/healthRoutes.js';
import apiRoutes from './routes/apiRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5000;

/*
  CORS setup
  ----------
  Development mode:
  - Allows localhost
  - Allows 127.0.0.1
  - Allows local Wi-Fi IP such as 172.28.31.154
  - Allows phone browser access in same Wi-Fi

  Production mode:
  - Uses CLIENT_URL from .env
*/
const allowedOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const isProduction = process.env.NODE_ENV === 'production';

const isLocalNetworkOrigin = (origin) => {
  if (!origin) return true;

  return (
    origin.startsWith('http://localhost:') ||
    origin.startsWith('http://127.0.0.1:') ||
    origin.startsWith('http://172.') ||
    origin.startsWith('http://192.168.') ||
    origin.startsWith('http://10.')
  );
};

const corsOptions = {
  origin(origin, callback) {
    // Allow Postman, mobile apps, curl, and same-origin requests
    if (!origin) {
      return callback(null, true);
    }

    // In development, allow local laptop + phone testing
    if (!isProduction && isLocalNetworkOrigin(origin)) {
      return callback(null, true);
    }

    // In production, allow only listed frontend URLs
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.error(`CORS blocked origin: ${origin}`);
    return callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.disable('x-powered-by');

app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));

app.use('/api/health', healthRoutes);
app.use('/api', apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Fancy Shop API running on http://localhost:${PORT}`);
  console.log(`Fancy Shop API network URL may be http://172.28.31.154:${PORT}`);
  console.log('Allowed origins from .env:', allowedOrigins);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(
      `Port ${PORT} is already in use. Stop the other process or change PORT in backend/.env.`
    );
  } else {
    console.error('Backend server failed:', error);
  }

  process.exit(1);
});

const shutdown = (signal) => {
  console.log(`\n${signal} received. Closing server...`);
  server.close(() => process.exit(0));
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));