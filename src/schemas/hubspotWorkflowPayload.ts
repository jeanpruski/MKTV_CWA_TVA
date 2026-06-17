import { z } from 'zod';
import { isTaxRateKey, TAX_RATE_KEYS, type TaxRateKey } from '../services/taxRateMapping';

const idLikeSchema = z.preprocess((value) => {
  if (typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  return value;
}, z.string().min(1));

const taxRateKeySchema = z.preprocess((value) => {
  if (typeof value === 'string') {
    return value.trim();
  }

  return value;
}, z.string().min(1)).refine(isTaxRateKey, {
  message: `tax_rate_key invalide. Valeurs acceptees: ${TAX_RATE_KEYS.join(', ')}`
}).transform((value) => value as TaxRateKey);

export const workflowPayloadSchema = z.object({
  inputFields: z.object({
    hs_object_id: idLikeSchema.optional(),
    tax_rate_key: taxRateKeySchema
  }).passthrough(),
  object: z.object({
    objectId: idLikeSchema.optional()
  }).passthrough().optional()
}).passthrough();

export type HubSpotWorkflowPayload = z.infer<typeof workflowPayloadSchema>;

export function getDealIdFromPayload(payload: HubSpotWorkflowPayload): string | undefined {
  return payload.inputFields.hs_object_id ?? payload.object?.objectId;
}
