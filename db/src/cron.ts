import { Client } from "pg";

const client = new Client({
  user: "user",
  host: "localhost",
  database: "my_db",
  password: "password123",
  port: 5433,
});

async function initialize() {
  try {
    await client.connect();
    console.log("Connected to database");
  } catch (error) {
    console.error("Failed to connect to database:", error);
    process.exit(1);
  }
}

async function refreshViews() {
  try {
    await client.query("REFRESH MATERIALIZED VIEW klines_1m");
    await client.query("REFRESH MATERIALIZED VIEW klines_1h");
    await client.query("REFRESH MATERIALIZED VIEW klines_1w");
    console.log("Materialized views refreshed successfully");
  } catch (error) {
    console.error("Error refreshing views:", error);
  }
}

initialize()
  .then(() => {
    refreshViews();
    setInterval(async () => {
      await refreshViews();
    }, 1000 * 60); // Increased to 1 minute for less frequent refreshes
  })
  .catch(console.error);

// Handle process termination
process.on("SIGINT", async () => {
  await client.end();
  console.log("Database connection closed");
  process.exit(0);
});
