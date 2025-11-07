// Directly assign persona with comprehensive metrics (no need for frontend)
const path = require('path');

// Since TypeScript isn't compiled, we'll use ts-node
const tsNodePath = path.join(__dirname, '..', 'backend', 'node_modules', '.bin', 'ts-node');
const assignPersonaPath = path.join(__dirname, '..', 'backend', 'personas', 'assignPersona.ts');

const { execSync } = require('child_process');

const userId = process.argv[2];

if (!userId) {
  console.error('Usage: node assign-persona-direct.js <user_id>');
  process.exit(1);
}

console.log(`Assigning persona with comprehensive metrics for: ${userId}\n`);

// Create a temporary script that imports and runs the persona assignment
const tempScript = `
import { assignPersona } from '${assignPersonaPath}';
import { get, run } from '../backend/db/db';

async function main() {
  const userId = '${userId}';
  
  console.log('Calculating comprehensive financial metrics...\\n');
  const result = await assignPersona(userId);
  
  if (!result) {
    console.log('❌ No persona matched for this user');
    process.exit(1);
  }
  
  console.log('✅ Persona assigned:');
  console.log('Primary:', result.primary.personaType);
  console.log('Confidence:', result.primary.confidence);
  console.log('Secondary:', result.secondary.map(s => s.personaType).join(', ') || 'None');
  
  console.log('\\n📊 Available Metrics:');
  const signals = result.primary.signals;
  
  if (signals.utilization) {
    const util = typeof signals.utilization === 'number' 
      ? signals.utilization 
      : signals.utilization.utilization;
    console.log(\`  ✅ Credit utilization: \${util?.toFixed(1)}%\`);
  }
  if (signals.savingsRate !== undefined && signals.savingsRate !== null) {
    console.log(\`  ✅ Savings rate: \${signals.savingsRate.toFixed(1)}%\`);
  }
  if (signals.emergencyFundCoverage !== undefined && signals.emergencyFundCoverage !== null) {
    console.log(\`  ✅ Emergency fund coverage: \${signals.emergencyFundCoverage.toFixed(1)} months\`);
  }
  if (signals.monthlyIncome !== undefined && signals.monthlyIncome !== null) {
    console.log(\`  ✅ Monthly income: $\${signals.monthlyIncome.toFixed(2)}\`);
  }
  if (signals.cashFlowBuffer !== undefined && signals.cashFlowBuffer !== null) {
    console.log(\`  ✅ Cash flow buffer: \${signals.cashFlowBuffer.toFixed(1)} months\`);
  }
  if (signals.monthlyRecurringSpend !== undefined && signals.monthlyRecurringSpend !== null) {
    console.log(\`  ✅ Monthly recurring spend: $\${signals.monthlyRecurringSpend.toFixed(2)}\`);
  }
  if (signals.paymentFrequency) {
    console.log(\`  ✅ Payment frequency: \${signals.paymentFrequency}\`);
  }
  if (signals.subscriptionCount !== undefined && signals.subscriptionCount !== null) {
    console.log(\`  ✅ Subscription count: \${signals.subscriptionCount}\`);
  }
  
  // Store the persona
  console.log('\\nStoring persona in database...');
  const personaId = \`persona-\${Date.now()}-\${Math.random().toString(36).substring(2, 11)}\`;
  const secondaryTypes = JSON.stringify(result.secondary.map(s => s.personaType));
  
  await run(
    \`INSERT INTO personas (persona_id, user_id, persona_type, signals, secondary_personas, window_days)
     VALUES (?, ?, ?, ?, ?, 90)\`,
    [personaId, userId, result.primary.personaType, JSON.stringify(result.primary.signals), secondaryTypes]
  );
  
  console.log('✅ Persona stored successfully!\\n');
  console.log('You can now test this user in the AI chat!');
  console.log(\`User ID: \${userId}\`);
  
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
`;

const fs = require('fs');
const tempFile = path.join(__dirname, 'temp-assign.ts');
fs.writeFileSync(tempFile, tempScript);

try {
  execSync(`cd ${path.join(__dirname, '..')} && npx ts-node ${tempFile}`, {
    stdio: 'inherit',
    env: { ...process.env }
  });
  fs.unlinkSync(tempFile);
} catch (err) {
  console.error('Failed to run persona assignment');
  fs.unlinkSync(tempFile);
  process.exit(1);
}

