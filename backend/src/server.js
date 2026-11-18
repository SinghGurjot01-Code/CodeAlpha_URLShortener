const config = require('./config');
const { openDatabase } = require('./db/database');
const { createApp } = require('./app');

const db = openDatabase(config.databasePath);
const app = createApp({ db, config });

const server = app.listen(config.port, () => {
  console.log(`[${config.env}] URL Shortener listening on port ${config.port}`);
  console.log(`  Public base URL : ${config.baseUrl}`);
  console.log(`  Database        : ${config.databasePath}`);
});

function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
