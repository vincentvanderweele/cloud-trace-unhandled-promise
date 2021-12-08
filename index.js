// This is a hack to get pg v8 instrumented
// See https://github.com/googleapis/cloud-trace-nodejs/issues/1272
// This bug also occurs without this hack but requires Node<=12
for (const patch of require('@google-cloud/trace-agent/build/src/plugins/plugin-pg')) {
  if (patch.versions === '^7.x') {
    patch.versions = '^7.x || ^8.x';
  }
}

// Enable the tracing
const tracing = require('@google-cloud/trace-agent');
tracing.start();

const express = require('express');
const { Client } = require('pg');

main();

async function main() {
  const client = new Client({
    host: process.env.host || 'localhost',
    port: process.env.port || 5432,
    user: process.env.user || 'user',
    password: process.env.password || 'password',
    database: process.env.database || 'database',
  });

  await client.connect();

  await createTable(client);

  // Trigger the conflict on startup.
  // The error gets caught and no unhandled promise occurs.
  await triggerConflict(client);

  const app = express();

  app.get('/', async () => {
    // Trigger the conflict in an http handler.
    // The error gets caught but an unhandled promise occurs too.
    await triggerConflict(client);
  });

  app.listen(3000, () => {
    console.log('Express listening at localhost:3000');
  });
}

const table = 'dummy';
const column = 'name';

async function createTable(client) {
  try {
    // Create a dummy table with a unique column.
    // Any constraint that can cause database errors works but this is simplest.
    await client.query(`
        CREATE TABLE ${table} (
          id SERIAL PRIMARY KEY,
          ${column} VARCHAR (50) UNIQUE
        );
      `);
  } catch {
    console.log('Table already exists');
  }
}

async function triggerConflict(client) {
  try {
    // trigger a conflict by inserting the same name twice
    await client.query(`INSERT INTO ${table} (${column}) VALUES ('John')`);
    await client.query(`INSERT INTO ${table} (${column}) VALUES ('John')`);
  } catch (e) {
    console.log('Error handled');
  }
}
