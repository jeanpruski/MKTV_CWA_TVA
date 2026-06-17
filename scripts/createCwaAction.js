const fs = require('node:fs');
const path = require('node:path');
const axios = require('axios');
require('dotenv').config();

const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
const appId = process.env.HUBSPOT_APP_ID;
const definitionPath = path.resolve(__dirname, '..', 'generated', 'custom-workflow-action-definition.json');

async function main() {
  if (!token) {
    throw new Error('HUBSPOT_PRIVATE_APP_TOKEN is required');
  }

  if (!appId) {
    throw new Error('HUBSPOT_APP_ID is required');
  }

  if (!fs.existsSync(definitionPath)) {
    throw new Error('generated/custom-workflow-action-definition.json not found. Run npm run cwa:prepare first.');
  }

  const definition = JSON.parse(fs.readFileSync(definitionPath, 'utf8'));

  const response = await axios.post(
    `https://api.hubapi.com/automation/v4/actions/${encodeURIComponent(appId)}`,
    definition,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    }
  );

  console.log(JSON.stringify({
    id: response.data.id,
    actionUrl: response.data.actionUrl,
    published: response.data.published,
    revisionId: response.data.revisionId
  }, null, 2));
}

main().catch((error) => {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data;
    console.error(`HubSpot API error${status ? ` HTTP ${status}` : ''}`);
    console.error(typeof data === 'string' ? data : JSON.stringify(data, null, 2));
    process.exit(1);
  }

  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
