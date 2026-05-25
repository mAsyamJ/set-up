import fs from 'node:fs';
import path from 'node:path';

const requiredFiles = [
  'src/KreditAgentIdentityRegistry.sol',
  'src/KreditAccessController.sol',
  'src/KreditConsentRegistry.sol',
  'src/KreditScoreRegistry.sol',
  'src/KreditValidationRegistry.sol',
  'src/KreditReputationRegistry.sol',
  'src/KreditPaymentReceiptRegistry.sol',
  'test/KreditProtocol.t.sol',
  'script/DeployKreditProtocol.s.sol',
  'docs/SMART_CONTRACT_ARCHITECTURE.md',
  'docs/SECURITY_REVIEW.md'
];

const requiredPatterns = [
  ['identity uses agentURI', /agentURI/],
  ['consent revocation exists', /revokeConsent/],
  ['score requires consent', /canUseConsent/],
  ['validation blocks self validation', /SelfValidation/],
  ['reputation dispute exists', /openDispute/],
  ['payment replay protection exists', /DuplicatePaymentReceipt/],
  ['pause exists', /requireNotPaused/],
  ['no raw PII terms in storage comments', /Forbidden on-chain|No raw/]
];

const findings = [];
for (const f of requiredFiles) {
  if (!fs.existsSync(f)) findings.push(`missing ${f}`);
}

const corpus = requiredFiles.filter(f => fs.existsSync(f)).map(f => fs.readFileSync(f, 'utf8')).join('\n');
for (const [name, re] of requiredPatterns) {
  if (!re.test(corpus)) findings.push(`missing pattern: ${name}`);
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}
for (const f of walk('src').concat(walk('script'), walk('test')).filter(f => f.endsWith('.sol'))) {
  const s = fs.readFileSync(f, 'utf8');
  let balance = 0;
  for (const ch of s) {
    if (ch === '{') balance++;
    if (ch === '}') balance--;
  }
  if (balance !== 0) findings.push(`brace imbalance ${f}: ${balance}`);
  if (/TODO|FIXME|PRIVATE_KEY\s*=|0x[0-9a-fA-F]{64}/.test(s)) findings.push(`unsafe marker in ${f}`);
}

const result = { ok: findings.length === 0, findingCount: findings.length, findings };
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);
