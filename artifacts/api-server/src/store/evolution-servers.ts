import { db, evolutionServersTable, evolutionInstancesTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { logger } from "../lib/logger";

// ── Re-export types from schema ───────────────────────────────

export type { EvolutionServer, EvolutionInstance } from "@workspace/db";

// ── Server functions ──────────────────────────────────────────

export async function createEvolutionServer(
  name: string,
  apiUrl: string,
  apiKey: string,
) {
  const [row] = await db
    .insert(evolutionServersTable)
    .values({ name, apiUrl, apiKey })
    .returning();
  if (!row) throw new Error("Erro ao criar servidor: nenhuma linha retornada.");
  return row;
}

export async function listEvolutionServers() {
  return db
    .select({
      id: evolutionServersTable.id,
      name: evolutionServersTable.name,
      apiUrl: evolutionServersTable.apiUrl,
      createdAt: evolutionServersTable.createdAt,
    })
    .from(evolutionServersTable)
    .orderBy(asc(evolutionServersTable.createdAt));
}

export async function getEvolutionServerWithKey(serverId: string) {
  const [row] = await db
    .select()
    .from(evolutionServersTable)
    .where(eq(evolutionServersTable.id, serverId))
    .limit(1);
  return row ?? undefined;
}

// ── Instance functions ────────────────────────────────────────

export async function createEvolutionInstance(
  serverId: string,
  instanceName: string,
  instanceToken: string,
  instanceJid: string,
  status: string,
) {
  const [row] = await db
    .insert(evolutionInstancesTable)
    .values({ serverId, instanceName, instanceToken, instanceJid, status })
    .returning();
  if (!row) throw new Error("Erro ao salvar instância: nenhuma linha retornada.");
  return row;
}

export async function listEvolutionInstances(serverId?: string) {
  if (serverId) {
    return db
      .select()
      .from(evolutionInstancesTable)
      .where(eq(evolutionInstancesTable.serverId, serverId))
      .orderBy(asc(evolutionInstancesTable.createdAt));
  }
  return db
    .select()
    .from(evolutionInstancesTable)
    .orderBy(asc(evolutionInstancesTable.createdAt));
}

export async function updateInstanceStatus(
  instanceId: string,
  status: string,
  instanceJid?: string,
) {
  const updates: Partial<typeof evolutionInstancesTable.$inferInsert> = { status };
  if (instanceJid !== undefined) updates.instanceJid = instanceJid;

  const [row] = await db
    .update(evolutionInstancesTable)
    .set(updates)
    .where(eq(evolutionInstancesTable.id, instanceId))
    .returning();

  if (!row) { logger.warn({ instanceId }, "updateInstanceStatus: not found"); return null; }
  return row;
}

export async function getEvolutionInstanceByName(serverId: string, instanceName: string) {
  const [row] = await db
    .select()
    .from(evolutionInstancesTable)
    .where(eq(evolutionInstancesTable.serverId, serverId))
    .limit(1);

  if (!row || row.instanceName !== instanceName) return undefined;
  return row;
}
