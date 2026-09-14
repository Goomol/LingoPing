#!/usr/bin/env node

/**
 * LingoPing - Automated GitHub Repository Creator & Pusher
 * Reads GITHUB_TOKEN and GITHUB_USERNAME from .env, creates the remote repo via GitHub API,
 * and pushes main, staging, and develop branches.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const envPath = path.join(rootDir, '.env');

console.log('\n======================================================');
console.log('       🚀  LingoPing - GitHub Repository Setup         ');
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
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

const env = parseEnvFile(envPath);
const token = env.GITHUB_TOKEN || process.env.GITHUB_TOKEN;
const username = env.GITHUB_USERNAME || process.env.GITHUB_USERNAME;
const repoName = env.GITHUB_REPO_NAME || process.env.GITHUB_REPO_NAME || 'LingoPing';
const isPrivate = env.GITHUB_REPO_PRIVATE === 'false' ? false : true; // default private

if (!token || !username) {
  console.log('ℹ️  GitHub credentials needed to automate repository creation.');
  console.log('   Add the following lines to your local `.env` file:');
  console.log('\n   GITHUB_USERNAME=your-github-username');
  console.log('   GITHUB_TOKEN=ghp_yourPersonalAccessToken');
  console.log('   GITHUB_REPO_NAME=LingoPing   # (optional, defaults to LingoPing)');
  console.log('   GITHUB_REPO_PRIVATE=true     # (optional, defaults to true)');
  console.log('\n   To generate a token: https://github.com/settings/tokens/new');
  console.log('   (Scopes needed: [x] repo)\n');
  console.log('======================================================\n');
  process.exit(1);
}

async function createAndPush() {
  console.log(`Connecting to GitHub as @${username}...`);

  // 1. Create Repository via GitHub REST API
  const apiUrl = 'https://api.github.com/user/repos';
  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'LingoPing-Setup-Script',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        name: repoName,
        description: 'LingoPing - Contextual FSRS Spaced-Repetition Micro-Sessions & Grammar Reviews (Chrome Extension MV3)',
        private: isPrivate,
        has_issues: true,
        has_projects: true,
        has_wiki: false,
      }),
    });

    const data = await res.json();
    if (res.status === 201) {
      console.log(`✅ Created GitHub repository: ${data.html_url} (${isPrivate ? 'Private' : 'Public'})`);
    } else if (res.status === 422 && data.errors?.[0]?.message?.includes('already exists')) {
      console.log(`ℹ️  Repository "${repoName}" already exists on your GitHub account.`);
    } else {
      console.error(`❌ GitHub API returned HTTP ${res.status}:`, data.message || data);
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Failed to connect to GitHub API:', err.message);
    process.exit(1);
  }

  // 2. Configure Git Remote
  const remoteUrlWithAuth = `https://${username}:${token}@github.com/${username}/${repoName}.git`;
  const cleanRemoteUrl = `https://github.com/${username}/${repoName}.git`;

  try {
    try {
      execSync('git remote remove origin', { cwd: rootDir, stdio: 'ignore' });
    } catch {}

    execSync(`git remote add origin "${remoteUrlWithAuth}"`, { cwd: rootDir, stdio: 'ignore' });
    console.log(`🔗 Configured git remote "origin"`);

    // 3. Push Branches
    console.log('📤 Pushing branch: main...');
    execSync('git push -u origin main', { cwd: rootDir, stdio: 'inherit' });

    console.log('📤 Pushing branch: staging...');
    execSync('git push -u origin staging', { cwd: rootDir, stdio: 'inherit' });

    console.log('📤 Pushing branch: develop...');
    execSync('git push -u origin develop', { cwd: rootDir, stdio: 'inherit' });

    // Clean remote URL so token is not saved in plaintext in .git/config
    execSync(`git remote set-url origin "${cleanRemoteUrl}"`, { cwd: rootDir, stdio: 'ignore' });
    console.log(`🔒 Sanitized remote URL (credentials removed from .git/config)`);

    console.log('\n🎉 Successfully linked and pushed to GitHub!');
    console.log(`   Repository: https://github.com/${username}/${repoName}`);
    console.log('   Branches pushed: [main, staging, develop]');
    console.log('   GitHub Actions CI/CD workflows are now live!\n');
    console.log('======================================================\n');
  } catch (err) {
    // Ensure remote URL is sanitized even on error
    try {
      execSync(`git remote set-url origin "${cleanRemoteUrl}"`, { cwd: rootDir, stdio: 'ignore' });
    } catch {}
    console.error('❌ Error while pushing branches:', err.message);
    process.exit(1);
  }
}

createAndPush();
