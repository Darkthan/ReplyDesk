import dotenv from 'dotenv';
dotenv.config();

if (process.env.NODE_ENV === 'production') {
  const missing = ['JWT_SECRET', 'ENCRYPTION_KEY', 'ADMIN_PASSWORD'].filter(
    (key) => !process.env[key]
  );
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables in production: ${missing.join(', ')}`);
  }
}

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
  adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
  pollingIntervalMs: parseInt(process.env.POLLING_INTERVAL_MS || '60000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
};
