import express from 'express';
import applyTaxRateRouter from './routes/applyTaxRate';
import { logger } from './utils/logger';

export function createApp(): express.Application {
  const app = express();

  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'hubspot-apply-tax-rate'
    });
  });

  app.use('/hubspot/workflow-actions/apply-tax-rate', applyTaxRateRouter);

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error('Unhandled error', { error: err.message });
    res.status(500).json({
      outputFields: {
        status: 'error',
        selected_tax_rate: '',
        tax_rate_group_id: '',
        updated_count: 0,
        error_count: 0,
        updated_ids: '',
        error_ids: '',
        message: 'Internal server error'
      }
    });
  });

  return app;
}
