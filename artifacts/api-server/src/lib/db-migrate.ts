import { pool } from "@workspace/db";
import { logger } from "./logger";

export async function runMigrations(): Promise<void> {
  logger.info("Running auto-migrations…");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS evolution_servers (
      id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
      name        text        NOT NULL,
      api_url     text        NOT NULL,
      api_key     text        NOT NULL,
      created_at  timestamptz NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS evolution_instances (
      id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
      server_id       uuid        NOT NULL REFERENCES evolution_servers(id) ON DELETE CASCADE,
      instance_name   text        NOT NULL,
      instance_token  text        NOT NULL DEFAULT '',
      instance_jid    text        NOT NULL DEFAULT '',
      status          text        NOT NULL DEFAULT 'created',
      created_at      timestamptz NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS evolution_instances_server_id_idx
      ON evolution_instances(server_id);
  `);

  logger.info("Auto-migrations complete.");
}
