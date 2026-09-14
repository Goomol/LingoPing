#!/usr/bin/env node

/**
 * LingoPing - Safe Environment & API Key Health Check
 * Validates syntax, tests service availability, and displays masked summaries.
 * NEVER prints full secrets to stdout.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const envPath = path.join(rootDir, '.env');
const envLocalPath = path.join(rootDir, '.env.local');

console.log('\n======================================================');
console.log('       🛡️  LingoPing - Safe API Key Health Check       ');
console.log('======================================================\n');

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;

    const key = trimmed.substring(0, eqIdx).trim();
    let val = trimmed.substring(eqIdx + 1).trim();

    // Strip wrapping quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

const env = {
  ...parseEnvFile(envPath),
  ...parseEnvFile(envLocalPath),
};

function maskKey(val) {
  if (!val) return '(not configured)';
  if (val.length <= 10) return '••••••••';
  const prefix = val.substring(0, 7);
  const suffix = val.substring(val.length - 4);
  return `${prefix}••••••••${suffix}`;
}

async function runCheck() {
  const hasEnv = fs.existsSync(envPath) || fs.existsSync(envLocalPath);

  if (!hasEnv) {
    console.log('⚠️  No `.env` file detected in project root.');
    console.log('   Run `npm run env:setup` to generate one from the secure template.\n');
    return;
  }

  console.log(`📁 Reading local configuration from: ${fs.existsSync(envLocalPath) ? '.env.local' : '.env'}\n`);

  // 1. Supabase Check (Production)
  const sbUrl = env.VITE_SUPABASE_URL || '';
  const sbKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || '';
  const sbSecret = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || '';
  const isPublishableFormat = sbKey.startsWith('sb_publishable_');
  const isLegacyJwtFormat = sbKey.startsWith('eyJ') && sbKey.split('.').length === 3;

  console.log('📦 [1] Supabase Cloud Database (Production):');
  console.log(`   • URL:             ${sbUrl ? sbUrl : '(not configured)'}`);
  
  if (isPublishableFormat) {
    console.log(`   • Publishable Key: ${maskKey(sbKey)} (New Supabase Standard: sb_publishable_...)`);
  } else if (isLegacyJwtFormat) {
    console.log(`   • Anon Key:        ${maskKey(sbKey)} (Legacy JWT Anon Key)`);
  } else {
    console.log(`   • Client Key:      ${maskKey(sbKey)}`);
  }

  if (sbSecret) {
    const isSecretFormat = sbSecret.startsWith('sb_secret_');
    const label = isSecretFormat ? 'New Supabase Secret Key (sb_secret_...)' : 'Legacy JWT Service Role';
    console.log(`   • Secret Key:      ${maskKey(sbSecret)} [${label} - Private Admin Key]`);
  }

  let sbStatus = '❌ Not Configured';
  if (sbUrl && sbKey && !sbUrl.includes('your-project-ref') && !sbKey.includes('...')) {
    if ((isPublishableFormat || isLegacyJwtFormat) && sbUrl.startsWith('https://')) {
      try {
        const client = createClient(sbUrl, sbKey);
        const { status, error } = await client.from('cards').select('id').limit(1);

        if (!error) {
          sbStatus = '✅ Connected & Ready! (Database schema verified)';
        } else if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
          sbStatus = '✅ Valid Credentials & Connected! (Tables not initialized yet: run supabase/migrations in Supabase SQL Editor)';
        } else if (error.message?.includes('Invalid API key') || status === 401) {
          sbStatus = '❌ Invalid API Key. Please verify the key from your Supabase Dashboard.';
        } else {
          sbStatus = `⚠️ Connected, status: ${error.message} (HTTP ${status})`;
        }
      } catch (err) {
        sbStatus = `⚠️ Connection error: ${err?.message || 'Network unreachable'}`;
      }
    } else {
      sbStatus = '⚠️ Malformed URL or Key (expected https://... and sb_publishable_... or JWT eyJ...)';
    }
  }
  console.log(`   • Status:          ${sbStatus}\n`);

  // 1b. Supabase Check (Staging)
  const stagingEnvPath = path.join(rootDir, '.env.staging');
  if (fs.existsSync(stagingEnvPath)) {
    const stagingEnv = parseEnvFile(stagingEnvPath);
    const stagUrl = stagingEnv.VITE_SUPABASE_URL || '';
    const stagKey = stagingEnv.VITE_SUPABASE_PUBLISHABLE_KEY || stagingEnv.VITE_SUPABASE_ANON_KEY || '';
    const isStagPub = stagKey.startsWith('sb_publishable_');

    console.log('🧪 [1b] Supabase Cloud Database (Staging):');
    console.log(`   • Config File:     .env.staging`);
    console.log(`   • URL:             ${stagUrl ? stagUrl : '(not configured)'}`);
    console.log(`   • Publishable Key: ${maskKey(stagKey)}`);

    let stagStatus = '❌ Not Configured';
    if (stagUrl && stagKey && !stagUrl.includes('your-staging-ref') && !stagKey.includes('...')) {
      try {
        const stagClient = createClient(stagUrl, stagKey);
        const { status, error } = await stagClient.from('cards').select('id').limit(1);

        if (!error) {
          stagStatus = '✅ Connected & Ready! (Database schema verified)';
        } else if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
          stagStatus = '✅ Valid Credentials & Connected! (Tables not initialized yet: copy & run supabase/migrations/20260914000000_init_lingoping.sql in Staging SQL Editor)';
        } else if (error.message?.includes('Invalid API key') || status === 401) {
          stagStatus = '❌ Invalid API Key. Please verify the key from your Supabase Dashboard.';
        } else {
          stagStatus = `⚠️ Connected, status: ${error.message} (HTTP ${status})`;
        }
      } catch (err) {
        stagStatus = `⚠️ Connection error: ${err?.message || 'Network unreachable'}`;
      }
    }
    console.log(`   • Status:          ${stagStatus}\n`);
  }

  // 2. BYOK AI Services Check
  console.log('🤖 [2] AI Provider Keys (BYOK - Optional):');

  const openaiKey = env.VITE_OPENAI_API_KEY || '';
  const anthropicKey = env.VITE_ANTHROPIC_API_KEY || '';
  const geminiKey = env.VITE_GEMINI_API_KEY || '';

  let openaiStatus = 'Disabled (Defaults to free Pollinations)';
  if (openaiKey && !openaiKey.includes('...')) {
    openaiStatus = openaiKey.startsWith('sk-')
      ? '✅ Valid format (OpenAI enabled)'
      : '⚠️ Invalid format (should start with sk-)';
  }
  console.log(`   • OpenAI:    ${maskKey(openaiKey)}  ➔  ${openaiStatus}`);

  let anthropicStatus = 'Disabled (Defaults to free Pollinations)';
  if (anthropicKey && !anthropicKey.includes('...')) {
    anthropicStatus = anthropicKey.startsWith('sk-ant-')
      ? '✅ Valid format (Claude enabled)'
      : '⚠️ Invalid format (should start with sk-ant-)';
  }
  console.log(`   • Anthropic: ${maskKey(anthropicKey)}  ➔  ${anthropicStatus}`);

  let geminiStatus = 'Disabled (Defaults to free Pollinations)';
  if (geminiKey && !geminiKey.includes('...')) {
    geminiStatus = geminiKey.startsWith('AIzaSy')
      ? '✅ Valid format (Gemini enabled)'
      : '⚠️ Invalid format (should start with AIzaSy)';
  }
  console.log(`   • Gemini:    ${maskKey(geminiKey)}  ➔  ${geminiStatus}`);

  // 3. GitHub Automation Check
  const ghUser = env.GITHUB_USERNAME || '';
  const ghToken = env.GITHUB_TOKEN || '';
  console.log('\n🐙 [3] GitHub Automation:');
  console.log(`   • Username:  ${ghUser ? `@${ghUser}` : '(not configured)'}`);
  console.log(`   • Token:     ${maskKey(ghToken)}`);
  if (ghUser && ghToken) {
    console.log(`   • Ready to run: npm run repo:create`);
  } else {
    console.log(`   • Status:    Add GITHUB_USERNAME and GITHUB_TOKEN to .env to automate repo creation.`);
  }
  console.log('🔒 Security Notice:');
  console.log(' • All credentials remain strictly on your local machine.');
  console.log(' • .env is excluded from git via .gitignore.');
  console.log(' • The AI agent can read .env directly when executing');
  console.log('   local commands without exposing keys in chat logs.');
  console.log('======================================================\n');
}

runCheck().catch((err) => {
  console.error('Error during env check:', err);
});
