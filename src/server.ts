import dotenv from 'dotenv';
import { createApp } from './app';
import { logger } from './utils/logger';

dotenv.config();

const app = createApp();

const port = Number(process.env.PORT ?? 3000);
const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN;

if (!token) {
  logger.error('HUBSPOT_PRIVATE_APP_TOKEN is not defined. Verifiez votre fichier .env.');
  process.exit(1);
}

app.listen(port, () => {
  logger.info(`Server started on http://localhost:${port}`);
});
