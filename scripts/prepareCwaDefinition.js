const fs = require('node:fs');
const path = require('node:path');

const actionBaseUrl = process.env.ACTION_BASE_URL;

if (!actionBaseUrl) {
  console.error('ACTION_BASE_URL is required, for example https://your-service.onrender.com');
  process.exit(1);
}

const normalizedBaseUrl = actionBaseUrl.replace(/\/+$/, '');
const sourcePath = path.resolve(__dirname, '..', 'examples', 'custom-workflow-action-definition.json');
const outputDir = path.resolve(__dirname, '..', 'generated');
const outputPath = path.join(outputDir, 'custom-workflow-action-definition.json');

const definition = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
definition.actionUrl = `${normalizedBaseUrl}/hubspot/workflow-actions/apply-tax-rate`;

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(definition, null, 2)}\n`);

console.log(`Generated ${outputPath}`);
console.log(`actionUrl=${definition.actionUrl}`);
