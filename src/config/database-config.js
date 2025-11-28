const { Pool } = require('pg');
const ServerConfig = require('./server-config');
const logger = require('./logger-config');

class Postgres {
  constructor() {
    this.client = new Pool({
      user: ServerConfig.DB_USERNAME,
      host: ServerConfig.DB_HOST,
      database: ServerConfig.DB_DATABASE,
      password: ServerConfig.DB_PASSWORD,
      port: ServerConfig.DB_PORT,
      // --- Recommended pool settings for resilience ---
      max: 20, // Max number of clients in the pool
      idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
      connectionTimeoutMillis: 2000, // How long to wait for a connection to be established
    });
  }

  async connect() {
    try {
      await this.client.connect();
      logger.info(`Database Connected at: ${ServerConfig.DB_HOST} & ${ServerConfig.DB_PORT}`);
    } catch (error) {
      logger.error('Error connecting to the postgres database :: ' + error.message);
      throw error;
    }
  }
}

module.exports = new Postgres();
