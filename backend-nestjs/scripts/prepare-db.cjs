#!/usr/bin/env node

require('dotenv/config');

const { spawnSync } = require('node:child_process');
const { existsSync, readdirSync } = require('node:fs');
const { join } = require('node:path');
const { URL } = require('node:url');
const { Client } = require('pg');

function quoteIdentifier(identifier) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function runPrismaCommand(args, label) {
  console.log(`[prepare-db] Running ${label}`);

  const result = spawnSync(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['prisma', ...args],
    {
      stdio: 'inherit',
      env: process.env,
      cwd: process.cwd(),
    },
  );

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function hasMigrationFiles() {
  const migrationsDir = join(process.cwd(), 'prisma', 'migrations');

  if (!existsSync(migrationsDir)) {
    return false;
  }

  return readdirSync(migrationsDir, { withFileTypes: true }).some(
    (entry) =>
      entry.isDirectory() &&
      existsSync(join(migrationsDir, entry.name, 'migration.sql')),
  );
}

async function ensureDatabaseExists() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set');
  }

  const parsedUrl = new URL(databaseUrl);
  const databaseName = parsedUrl.pathname.replace(/^\//, '');

  if (!databaseName) {
    throw new Error('DATABASE_URL does not include a database name');
  }

  const adminUrl = new URL(databaseUrl);
  adminUrl.pathname = '/postgres';

  const client = new Client({ connectionString: adminUrl.toString() });

  await client.connect();

  try {
    const result = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [databaseName],
    );

    if (result.rowCount === 0) {
      console.log(`[prepare-db] Creating database "${databaseName}"`);
      await client.query(`CREATE DATABASE ${quoteIdentifier(databaseName)}`);
    } else {
      console.log(`[prepare-db] Database "${databaseName}" already exists`);
    }
  } finally {
    await client.end();
  }
}

function prepareSchema() {
  if (hasMigrationFiles()) {
    runPrismaCommand(['migrate', 'deploy'], 'prisma migrate deploy');
    return;
  }

  runPrismaCommand(['db', 'push'], 'prisma db push');
}

async function main() {
  await ensureDatabaseExists();
  prepareSchema();
}

main().catch((error) => {
  console.error('[prepare-db] Failed to prepare database');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
