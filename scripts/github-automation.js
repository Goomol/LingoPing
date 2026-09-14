#!/usr/bin/env node

/**
 * LingoPing - GitHub Automation Suite
 * Automates GitHub Actions workflow status monitoring, automated staging & production
 * releases, PR creation, and repository health checks.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const REPO_OWNER = 'Goomol';
const REPO_NAME = 'LingoPing';

function parseEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    let val = trimmed.substring(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[trimmed.substring(0, eqIdx).trim()] = val;
  }
  return env;
}

const env = {
  ...parseEnv(path.join(rootDir, '.env')),
  ...parseEnv(path.join(rootDir, '.env.local')),
};

const token = env.GITHUB_TOKEN || process.env.GITHUB_TOKEN || '';

async function fetchGithub(endpoint) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'LingoPing-Automation',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}${endpoint}`, {
    headers,
  });

  if (!res.ok) {
    throw new Error(`GitHub API HTTP ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

/**
 * Checks real-time status of all GitHub Actions workflows
 */
async function checkWorkflowStatus() {
  console.log('\n======================================================');
  console.log(` 🐙 GitHub Actions Real-Time Status [${REPO_OWNER}/${REPO_NAME}]`);
  console.log('======================================================\n');

  try {
    const data = await fetchGithub('/actions/runs?per_page=8');
    const runs = data.workflow_runs || [];

    if (runs.length === 0) {
      console.log('ℹ️  No workflow runs found yet.');
      return;
    }

    for (const run of runs) {
      const statusIcon =
        run.status === 'in_progress'
          ? '⏳ In Progress'
          : run.conclusion === 'success'
          ? '✅ Passed'
          : run.conclusion === 'failure'
          ? '❌ Failed'
          : run.conclusion === 'cancelled'
          ? '🚫 Cancelled'
          : `• ${run.status}`;

      console.log(`▶ Workflow:  ${run.name}`);
      console.log(`   • Branch:    ${run.head_branch}`);
      console.log(`   • Status:    ${statusIcon}`);
      console.log(`   • Event:     ${run.event}`);
      console.log(`   • Commit:    ${run.head_commit?.message?.split('\n')[0] || run.head_sha.slice(0, 7)}`);
      console.log(`   • Author:    @${run.triggering_actor?.login || 'unknown'}`);
      console.log(`   • Run URL:   ${run.html_url}`);
      console.log('------------------------------------------------------');
    }
  } catch (err) {
    console.error('❌ Could not fetch GitHub Actions status:', err.message);
  }
  console.log('');
}

/**
 * Automates releasing to Staging: merges develop into staging and pushes
 */
async function releaseStaging() {
  console.log('\n🚀 [GitHub Automation] Triggering Staging Release...');

  // Ensure working directory is clean
  const status = execSync('git status --porcelain', { cwd: rootDir }).toString().trim();
  if (status) {
    console.error('❌ Working directory has uncommitted changes. Please commit or stash first.');
    process.exit(1);
  }

  try {
    console.log('1. Checking out develop and syncing...');
    execSync('git checkout develop', { cwd: rootDir, stdio: 'inherit' });

    console.log('2. Merging develop into staging...');
    execSync('git checkout staging', { cwd: rootDir, stdio: 'inherit' });
    execSync('git merge develop', { cwd: rootDir, stdio: 'inherit' });

    console.log('3. Pushing staging branch to GitHub...');
    execSync('git push origin staging', { cwd: rootDir, stdio: 'inherit' });

    console.log('4. Returning to develop...');
    execSync('git checkout develop', { cwd: rootDir, stdio: 'inherit' });

    console.log('\n🎉 Staging release triggered!');
    console.log('   GitHub Actions is building and packaging your staging extension.');
    console.log(`   Monitor live at: https://github.com/${REPO_OWNER}/${REPO_NAME}/actions\n`);
  } catch (err) {
    console.error('❌ Error releasing to staging:', err.message);
    process.exit(1);
  }
}

/**
 * Automates releasing to Production: merges staging into main, tags version, and pushes
 */
async function releaseProduction(customTag) {
  console.log('\n🏆 [GitHub Automation] Triggering Production Release...');

  const status = execSync('git status --porcelain', { cwd: rootDir }).toString().trim();
  if (status) {
    console.error('❌ Working directory has uncommitted changes. Please commit or stash first.');
    process.exit(1);
  }

  // Get current version from package.json
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  const version = customTag || `v${pkg.version}`;

  try {
    console.log(`1. Fast-forwarding main to staging...`);
    execSync('git checkout main', { cwd: rootDir, stdio: 'inherit' });
    execSync('git merge staging', { cwd: rootDir, stdio: 'inherit' });

    console.log(`2. Tagging release: ${version}...`);
    try {
      execSync(`git tag -a ${version} -m "Release ${version} - Production Store Build"`, {
        cwd: rootDir,
        stdio: 'inherit',
      });
    } catch {
      console.log(`ℹ️  Tag ${version} already exists locally. Continuing push...`);
    }

    console.log('3. Pushing main and tags to GitHub...');
    execSync('git push origin main --tags', { cwd: rootDir, stdio: 'inherit' });

    console.log('4. Returning to develop...');
    execSync('git checkout develop', { cwd: rootDir, stdio: 'inherit' });

    console.log('\n🎉 Production release triggered!');
    console.log(`   GitHub Actions is packaging ${version} and creating an official GitHub Release.`);
    console.log(`   Check release at: https://github.com/${REPO_OWNER}/${REPO_NAME}/releases\n`);
  } catch (err) {
    console.error('❌ Error releasing to production:', err.message);
    process.exit(1);
  }
}

const command = process.argv[2] || 'status';

switch (command) {
  case 'status':
  case 'runs':
    checkWorkflowStatus();
    break;
  case 'staging':
    releaseStaging();
    break;
  case 'prod':
  case 'production':
    releaseProduction(process.argv[3]);
    break;
  default:
    console.log(`Unknown command: ${command}`);
    console.log('Available commands: status, staging, prod');
    process.exit(1);
}
