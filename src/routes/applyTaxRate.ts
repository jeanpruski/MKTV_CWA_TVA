import { Router } from 'express';
import { ZodError } from 'zod';
import { getHubSpotErrorMessage, getDealLineItemIds, updateLineItemTax } from '../services/hubspotClient';
import { getTaxRateGroupId, getTaxRateLabel } from '../services/taxRateMapping';
import { getDealIdFromPayload, workflowPayloadSchema } from '../schemas/hubspotWorkflowPayload';
import { logger } from '../utils/logger';

type WorkflowStatus = 'success' | 'partial_success' | 'error';

type WorkflowOutputFields = {
  status: WorkflowStatus;
  selected_tax_rate: string;
  tax_rate_group_id: string;
  updated_count: number;
  error_count: number;
  updated_ids: string;
  error_ids: string;
  message: string;
};

const router = Router();

function workflowResponse(outputFields: WorkflowOutputFields): { outputFields: WorkflowOutputFields } {
  return { outputFields };
}

function emptyError(message: string, selectedTaxRate = '', taxRateGroupId = ''): { outputFields: WorkflowOutputFields } {
  return workflowResponse({
    status: 'error',
    selected_tax_rate: selectedTaxRate,
    tax_rate_group_id: taxRateGroupId,
    updated_count: 0,
    error_count: 0,
    updated_ids: '',
    error_ids: '',
    message
  });
}

function formatZodError(error: ZodError): string {
  return error.issues.map((issue) => `${issue.path.join('.') || 'payload'}: ${issue.message}`).join('; ');
}

router.post('/', async (req, res) => {
  const parsedPayload = workflowPayloadSchema.safeParse(req.body);

  if (!parsedPayload.success) {
    const message = `Payload HubSpot invalide: ${formatZodError(parsedPayload.error)}`;
    logger.warn('Invalid workflow payload', { message });
    return res.status(200).json(emptyError(message));
  }

  const payload = parsedPayload.data;
  const dealId = getDealIdFromPayload(payload);

  if (!dealId) {
    const message = 'deal_id manquant: fournissez inputFields.hs_object_id ou object.objectId.';
    logger.warn('Missing deal id in workflow payload');
    return res.status(200).json(emptyError(message));
  }

  const taxRateKey = payload.inputFields.tax_rate_key;
  const taxRateGroupId = getTaxRateGroupId(taxRateKey);
  const selectedTaxRate = getTaxRateLabel(taxRateKey);

  logger.info('Applying tax rate to deal line items', {
    dealId,
    taxRateKey,
    taxRateGroupId
  });

  let lineItemIds: string[];

  try {
    lineItemIds = await getDealLineItemIds(dealId);
  } catch (error) {
    const message = `Impossible de recuperer les line items du deal ${dealId}. ${getHubSpotErrorMessage(error)}`;
    logger.error('Failed to retrieve deal line items', {
      dealId,
      error: getHubSpotErrorMessage(error)
    });
    return res.status(200).json(emptyError(message, selectedTaxRate, taxRateGroupId));
  }

  if (lineItemIds.length === 0) {
    const message = `Aucun line item associe au deal ${dealId}. Aucune mise a jour effectuee.`;
    logger.info('No line items found for deal', { dealId });
    return res.status(200).json(workflowResponse({
      status: 'success',
      selected_tax_rate: selectedTaxRate,
      tax_rate_group_id: taxRateGroupId,
      updated_count: 0,
      error_count: 0,
      updated_ids: '',
      error_ids: '',
      message
    }));
  }

  const updatedIds: string[] = [];
  const errorIds: string[] = [];

  for (const lineItemId of lineItemIds) {
    try {
      await updateLineItemTax(lineItemId, taxRateGroupId);
      updatedIds.push(lineItemId);
      logger.info('Line item tax rate updated', { dealId, lineItemId, taxRateGroupId });
    } catch (error) {
      errorIds.push(lineItemId);
      logger.error('Line item tax rate update failed', {
        dealId,
        lineItemId,
        error: getHubSpotErrorMessage(error)
      });
    }
  }

  const status: WorkflowStatus =
    errorIds.length === 0 ? 'success' : updatedIds.length > 0 ? 'partial_success' : 'error';
  const message =
    status === 'success'
      ? `${updatedIds.length} line item(s) mis a jour avec ${selectedTaxRate}.`
      : status === 'partial_success'
        ? `${updatedIds.length} line item(s) mis a jour, ${errorIds.length} erreur(s).`
        : `Aucun line item mis a jour. ${errorIds.length} erreur(s).`;

  logger.info('Tax rate workflow action completed', {
    dealId,
    status,
    updatedCount: updatedIds.length,
    errorCount: errorIds.length
  });

  return res.status(200).json(workflowResponse({
    status,
    selected_tax_rate: selectedTaxRate,
    tax_rate_group_id: taxRateGroupId,
    updated_count: updatedIds.length,
    error_count: errorIds.length,
    updated_ids: updatedIds.join(','),
    error_ids: errorIds.join(','),
    message
  }));
});

export default router;
