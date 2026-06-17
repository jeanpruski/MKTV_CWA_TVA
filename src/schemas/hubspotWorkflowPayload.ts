import { z } from 'zod';

export const workflowPayloadSchema = z.object({
  inputFields: z.object({
    hs_object_id: z.string().min(1, 'hs_object_id est requis'),
    tax_rate_key: z.string().min(1, 'tax_rate_key est requis')
  })
});

export type HubSpotWorkflowPayload = z.infer<typeof workflowPayloadSchema>;
