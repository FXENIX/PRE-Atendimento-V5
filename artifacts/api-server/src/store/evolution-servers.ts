import { supabase } from "../lib/supabase";
import { logger } from "../lib/logger";

// ── Types ────────────────────────────────────────────────────

export interface EvolutionServer {
  id: string;
  name: string;
  apiUrl: string;
  createdAt: string;
}

export interface EvolutionInstance {
  id: string;
  serverId: string;
  instanceName: string;
  instanceToken: string;
  instanceJid: string;
  status: string;
  createdAt: string;
}

// ── Row mappers ───────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToServer(row: any): EvolutionServer {
  return {
    id: row.id as string,
    name: row.name as string,
    apiUrl: row.api_url as string,
    createdAt: row.created_at as string,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToInstance(row: any): EvolutionInstance {
  return {
    id: row.id as string,
    serverId: row.server_id as string,
    instanceName: row.instance_name as string,
    instanceToken: row.instance_token as string,
    instanceJid: row.instance_jid as string,
    status: row.status as string,
    createdAt: row.created_at as string,
  };
}

// ── Server functions ─────────────────────────────────────────

export async function createEvolutionServer(
  name: string,
  apiUrl: string,
  apiKey: string,
): Promise<EvolutionServer> {
  const { data, error } = await supabase
    .from("evolution_servers")
    .insert({ name, api_url: apiUrl, api_key: apiKey })
    .select("id, name, api_url, created_at")
    .single();

  if (error) throw new Error("Erro ao criar servidor: " + error.message);
  return rowToServer(data);
}

export async function listEvolutionServers(): Promise<EvolutionServer[]> {
  const { data, error } = await supabase
    .from("evolution_servers")
    .select("id, name, api_url, created_at")
    .order("created_at", { ascending: true });

  if (error) { logger.error({ error }, "listEvolutionServers error"); return []; }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => rowToServer(r));
}

export async function getEvolutionServerWithKey(
  serverId: string,
): Promise<{ id: string; name: string; apiUrl: string; apiKey: string } | undefined> {
  const { data, error } = await supabase
    .from("evolution_servers")
    .select("id, name, api_url, api_key")
    .eq("id", serverId)
    .maybeSingle();

  if (error || !data) return undefined;
  return {
    id: data.id as string,
    name: data.name as string,
    apiUrl: data.api_url as string,
    apiKey: data.api_key as string,
  };
}

// ── Instance functions ────────────────────────────────────────

export async function createEvolutionInstance(
  serverId: string,
  instanceName: string,
  instanceToken: string,
  instanceJid: string,
  status: string,
): Promise<EvolutionInstance> {
  const { data, error } = await supabase
    .from("evolution_instances")
    .insert({
      server_id: serverId,
      instance_name: instanceName,
      instance_token: instanceToken,
      instance_jid: instanceJid,
      status,
    })
    .select("id, server_id, instance_name, instance_token, instance_jid, status, created_at")
    .single();

  if (error) throw new Error("Erro ao salvar instância: " + error.message);
  return rowToInstance(data);
}

export async function listEvolutionInstances(serverId?: string): Promise<EvolutionInstance[]> {
  let query = supabase
    .from("evolution_instances")
    .select("id, server_id, instance_name, instance_token, instance_jid, status, created_at")
    .order("created_at", { ascending: true });

  if (serverId) query = query.eq("server_id", serverId);

  const { data, error } = await query;
  if (error) { logger.error({ error }, "listEvolutionInstances error"); return []; }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => rowToInstance(r));
}

export async function updateInstanceStatus(
  instanceId: string,
  status: string,
  instanceJid?: string,
): Promise<EvolutionInstance | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = { status };
  if (instanceJid !== undefined) updates["instance_jid"] = instanceJid;

  const { data, error } = await supabase
    .from("evolution_instances")
    .update(updates)
    .eq("id", instanceId)
    .select("id, server_id, instance_name, instance_token, instance_jid, status, created_at")
    .maybeSingle();

  if (error) { logger.error({ error }, "updateInstanceStatus error"); return null; }
  if (!data) return null;
  return rowToInstance(data);
}

export async function getEvolutionInstanceByName(
  serverId: string,
  instanceName: string,
): Promise<EvolutionInstance | undefined> {
  const { data, error } = await supabase
    .from("evolution_instances")
    .select("id, server_id, instance_name, instance_token, instance_jid, status, created_at")
    .eq("server_id", serverId)
    .eq("instance_name", instanceName)
    .maybeSingle();

  if (error || !data) return undefined;
  return rowToInstance(data);
}
