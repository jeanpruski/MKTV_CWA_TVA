import express from 'express';
import dotenv from 'dotenv';
import applyTaxRateRouter from './routes/applyTaxRate';
import { logger } from './utils/logger';

dotenv.config();

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/hubspot/workflow-actions/apply-tax-rate', applyTaxRateRouter);

const port = Number(process.env.PORT ?? 3000);
const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN;

if (!token) {
  logger.error('HUBSPOT_PRIVATE_APP_TOKEN is not defined. Vérifiez votre fichier .env.');
  process.exit(1);
}

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error', err.message);
  res.status(500).json({ outputFields: { status: 'error', message: 'Internal server error' } });
});

app.listen(port, () => {
  logger.info(`Server started on http://localhost:${port}`);
});
