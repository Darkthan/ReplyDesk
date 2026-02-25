import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'emailauto',
    user: process.env.DB_USER || 'emailauto',
    password: process.env.DB_PASSWORD || 'changeme',
  },
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  encryptionKey: process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  adminEmail: process.env.ADMIN_EMAIL || '',
  pollingIntervalMs: parseInt(process.env.POLLING_INTERVAL_MS || '60000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
};
