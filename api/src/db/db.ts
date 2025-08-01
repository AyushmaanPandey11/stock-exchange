import { Client } from "pg";

const pgClient = new Client({
  user: "user",
  host: "localhost",
  database: "my_db",
  password: "password123",
  port: 5432,
});

pgClient.connect();

export { pgClient };
