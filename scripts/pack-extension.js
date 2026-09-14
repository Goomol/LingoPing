#!/usr/bin/env node

/**
 * LingoPing - Extension Release Packager
 * Validates Manifest V3 compliance and packages a deployable ZIP archive.
 * Usage: node scripts/pack-extension.js [development|staging|production]
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const extensionDir = path.join(rootDir, 'packages', 'extension');
const distDir = path.join(extensionDir, 'dist');
const releasesDir = path.join(rootDir, 'releases');

const envMode = process.argv[2] || 'production';

console.log('\n======================================================');
console.log(` 📦 Packaging LingoPing Extension [${envMode.toUpperCase()}]`);
console.log('======================================================\n');

// 1. Build the extension for the specified environment
console.log(`🔨 Building extension with mode: ${envMode}...`);
try {
  execSync(`npm run build --workspace=packages/extension -- --mode ${envMode}`, {
    cwd: rootDir,
    stdio: 'inherit',
  });
} catch (err) {
  console.error('\n❌ Build failed.');
  process.exit(1);
}

// 2. Validate dist and manifest
const manifestPath = path.join(distDir, 'manifest.json');
if (!fs.existsSync(manifestPath)) {
  console.error('❌ Error: dist/manifest.json not found after build.');
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
console.log(`\n📋 Manifest Details:`);
console.log(`   • Name:    ${manifest.name}`);
console.log(`   • Version: ${manifest.version}`);
console.log(`   • MV3:     ${manifest.manifest_version === 3 ? '✅ Manifest V3' : '❌ Non-MV3'}`);

// 3. Verify Icons
if (manifest.icons) {
  for (const [size, iconPath] of Object.entries(manifest.icons)) {
    const fullIconPath = path.join(distDir, iconPath);
    if (!fs.existsSync(fullIconPath)) {
      console.error(`❌ Missing icon: ${iconPath} (${size}px)`);
      process.exit(1);
    }
  }
  console.log('   • Icons:   ✅ All declared icons verified');
}

// 4. Validate CSP (Zero Inline Scripts)
const htmlFiles = ['popup.html', 'session.html', 'options.html'];
for (const file of htmlFiles) {
  const filePath = path.join(distDir, file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const inlineScriptRegex = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
    if (inlineScriptRegex.test(content)) {
      console.error(`❌ CSP Violation: Inline script detected in ${file}`);
      process.exit(1);
    }
  }
}
console.log('   • CSP:     ✅ Strict Manifest V3 compliant (no inline scripts)');

// 5. Package into ZIP
if (!fs.existsSync(releasesDir)) {
  fs.mkdirSync(releasesDir, { recursive: true });
}

const zipFileName = `lingoping-v${manifest.version}-${envMode}.zip`;
const zipFilePath = path.join(releasesDir, zipFileName);

if (fs.existsSync(zipFilePath)) {
  fs.unlinkSync(zipFilePath);
}

console.log(`\n🗜️  Compressing into: releases/${zipFileName}...`);
try {
  // Zip from within dist/ so the zip root has manifest.json directly
  execSync(`cd "${distDir}" && zip -r -q "${zipFilePath}" .`, { stdio: 'inherit' });
  const stats = fs.statSync(zipFilePath);
  const sizeKb = (stats.size / 1024).toFixed(1);

  console.log(`\n🎉 Success! Package created:`);
  console.log(`   • File: ${zipFilePath}`);
  console.log(`   • Size: ${sizeKb} KB`);
  console.log(`   • Mode: ${envMode}`);
  if (envMode === 'production') {
    console.log(`   • Note: Ready for Chrome Web Store Developer Dashboard upload!`);
  } else {
    console.log(`   • Note: Ready for QA / Staging testing distribution.`);
  }
  console.log('======================================================\n');
} catch (err) {
  console.error('❌ Failed to create zip package:', err);
  process.exit(1);
}
