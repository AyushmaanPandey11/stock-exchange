import { Client } from "pg";

const pgClient = new Client({
  user: "user",
  host: "localhost",
  database: "my_db",
  password: "password123",
  port: 5433,
});

const initDB = async () => {
  try {
    await pgClient.connect();
    console.log("Connected to database");
    await pgClient.query(`CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;`);

    await pgClient.query(`DROP TABLE IF EXISTS "laddoo_prices"`);
    await pgClient.query(`
      CREATE TABLE "laddoo_prices" (
        id BIGINT PRIMARY KEY,
        time TIMESTAMP WITH TIME ZONE NOT NULL,
        price DOUBLE PRECISION,
        volume DOUBLE PRECISION,
        is_buyer_maker BOOLEAN
      );
    `);
    await pgClient.query(`
      SELECT create_hypertable('laddoo_prices', 'time', chunk_time_interval => '1 day');
    `);

    // Create continuous aggregate for 1-minute klines
    await pgClient.query(`
      CREATE MATERIALIZED VIEW klines_1m
      WITH (timescaledb.continuous) AS
      SELECT
        time_bucket('1 minute', time) AS bucket,
        first(price, time) AS open,
        max(price) AS high,
        min(price) AS low,
        last(price, time) AS close,
        sum(volume) AS volume
      FROM laddoo_prices
      GROUP BY bucket
      WITH NO DATA;
    `);

    // Create continuous aggregate for 1-hour klines
    await pgClient.query(`
      CREATE MATERIALIZED VIEW klines_1h
      WITH (timescaledb.continuous) AS
      SELECT
        time_bucket('1 hour', time) AS bucket,
        first(price, time) AS open,
        max(price) AS high,
        min(price) AS low,
        last(price, time) AS close,
        sum(volume) AS volume
      FROM laddoo_prices
      GROUP BY bucket
      WITH NO DATA;
    `);

    // Create continuous aggregate for 1-week klines
    await pgClient.query(`
      CREATE MATERIALIZED VIEW klines_1w
      WITH (timescaledb.continuous) AS
      SELECT
        time_bucket('1 week', time) AS bucket,
        first(price, time) AS open,
        max(price) AS high,
        min(price) AS low,
        last(price, time) AS close,
        sum(volume) AS volume
      FROM laddoo_prices
      GROUP BY bucket
      WITH NO DATA;
    `);

    // Add policies for automatic refresh of continuous aggregates
    await pgClient.query(`
      SELECT add_continuous_aggregate_policy('klines_1m',
        start_offset => INTERVAL '1 hour',
        end_offset => INTERVAL '1 minute',
        schedule_interval => INTERVAL '1 minute');
    `);

    await pgClient.query(`
      SELECT add_continuous_aggregate_policy('klines_1h',
        start_offset => INTERVAL '1 day',
        end_offset => INTERVAL '1 hour',
        schedule_interval => INTERVAL '1 hour');
    `);

    await pgClient.query(`
      SELECT add_continuous_aggregate_policy('klines_1w',
        start_offset => INTERVAL '1 month',
        end_offset => INTERVAL '1 week',
        schedule_interval => INTERVAL '1 week');
    `);

    console.log("Database initialized successfully");
  } catch (error) {
    console.error("Error initializing database:", error);
  }
};

initDB().catch(console.error);
