import axios, { AxiosError, AxiosInstance } from 'axios';

const HUBSPOT_BASE_URL = 'https://api.hubapi.com';
const REQUEST_TIMEOUT_MS = 15000;

type AssociationResponse = {
  results?: Array<{
    toObjectId?: string | number;
  }>;
  paging?: {
    next?: {
      after?: string;
    };
  };
};

let client: AxiosInstance | undefined;

function getHubSpotClient(): AxiosInstance {
  if (client) {
    return client;
  }

  const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN;

  if (!token) {
    throw new Error('HUBSPOT_PRIVATE_APP_TOKEN is not defined');
  }

  client = axios.create({
    baseURL: HUBSPOT_BASE_URL,
    timeout: REQUEST_TIMEOUT_MS,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  return client;
}

export async function getDealLineItemIds(dealId: string): Promise<string[]> {
  const ids = new Set<string>();
  let after: string | undefined;

  do {
    const response = await getHubSpotClient().get<AssociationResponse>(
      `/crm/v4/objects/deals/${encodeURIComponent(dealId)}/associations/line_items`,
      {
        params: {
          limit: 500,
          after
        }
      }
    );

    for (const result of response.data.results ?? []) {
      if (result.toObjectId !== undefined && result.toObjectId !== null) {
        ids.add(String(result.toObjectId));
      }
    }

    after = response.data.paging?.next?.after;
  } while (after);

  return [...ids];
}

export async function updateLineItemTax(lineItemId: string, taxRateGroupId: string): Promise<void> {
  await getHubSpotClient().patch(`/crm/v3/objects/line_items/${encodeURIComponent(lineItemId)}`, {
    properties: {
      hs_tax_rate_group_id: taxRateGroupId
    }
  });
}

function extractHubSpotMessage(data: unknown): string | undefined {
  if (!data) {
    return undefined;
  }

  if (typeof data === 'object' && 'message' in data) {
    const message = (data as { message?: unknown }).message;
    return typeof message === 'string' ? message : undefined;
  }

  if (typeof data === 'string') {
    return data;
  }

  try {
    return JSON.stringify(data);
  } catch {
    return undefined;
  }
}

export function getHubSpotErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    const status = axiosError.response?.status;
    const hubspotMessage = extractHubSpotMessage(axiosError.response?.data);
    const statusText = status ? `HTTP ${status}` : 'HTTP request failed';

    return hubspotMessage ? `${statusText}: ${hubspotMessage}` : `${statusText}: ${axiosError.message}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown error';
}
