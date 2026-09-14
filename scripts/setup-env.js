#!/usr/bin/env node

/**
 * LingoPing - Secure Environment Setup Script
 * Creates `.env` from `.env.example` with strict 0600 file permissions.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const envExamplePath = path.join(rootDir, '.env.example');
const envPath = path.join(rootDir, '.env');

console.log('\n🔒 [LingoPing] Secure Environment Setup\n');

if (!fs.existsSync(envExamplePath)) {
  console.error('❌ Error: .env.example template not found.');
  process.exit(1);
}

if (fs.existsSync(envPath)) {
  console.log('ℹ️  .env already exists at:');
  console.log(`   ${envPath}`);
  console.log('\nTo update your keys, simply open this file in your editor.');
} else {
  fs.copyFileSync(envExamplePath, envPath);
  try {
    fs.chmodSync(envPath, 0o600); // Read/write only for owner
    console.log('✅ Created .env with strict permissions (0600 - Owner read/write only).');
  } catch {
    console.log('✅ Created .env.');
  }
  console.log(`   Location: ${envPath}`);
}

console.log('\nNext Steps:');
console.log('1. Open `.env` in your editor and paste your API keys.');
console.log('2. Run `npm run env:check` to safely validate your setup.\n');
