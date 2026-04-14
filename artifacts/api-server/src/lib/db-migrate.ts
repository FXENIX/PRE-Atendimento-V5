import { supabase } from "./supabase";
import { logger } from "./logger";

const SUPABASE_MIGRATION_SQL = `
-- Execute no Supabase SQL Editor
-- https://supabase.com/dashboard/project/_/sql/new

CREATE TABLE IF NOT EXISTS public.evolution_servers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  api_url text NOT NULL,
  api_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.evolution_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid NOT NULL REFERENCES public.evolution_servers(id) ON DELETE CASCADE,
  instance_name text NOT NULL,
  instance_token text NOT NULL DEFAULT '',
  instance_jid text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'created',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS evolution_instances_server_id_idx
  ON public.evolution_instances(server_id);
`;

function isMissingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    (error.message ?? "").includes("schema cache") ||
    (error.message ?? "").includes("does not exist")
  );
}

export async function runMigrations(): Promise<void> {
  logger.info("Checking Supabase tables…");

  const [serversCheck, instancesCheck] = await Promise.all([
    supabase.from("evolution_servers").select("id").limit(0),
    supabase.from("evolution_instances").select("id").limit(0),
  ]);

  const missing: string[] = [];
  if (isMissingTable(serversCheck.error)) missing.push("evolution_servers");
  if (isMissingTable(instancesCheck.error)) missing.push("evolution_instances");

  if (missing.length === 0) {
    logger.info("Supabase tables OK.");
    return;
  }

  logger.error(
    { missing },
    `\n\n❌ TABELAS FALTANDO NO SUPABASE: ${missing.join(", ")}\n\n` +
    `Execute o SQL abaixo no Supabase SQL Editor e reinicie o servidor:\n` +
    SUPABASE_MIGRATION_SQL + "\n",
  );

  throw new Error(
    `Tabelas faltando no Supabase: [${missing.join(", ")}]. ` +
    `Execute o SQL de migração exibido nos logs e reinicie o servidor.`,
  );
}
