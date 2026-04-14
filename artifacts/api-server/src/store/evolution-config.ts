import { eq } from "drizzle-orm";
import { db, evolutionConfigsTable } from "@workspace/db";
import { logger } from "../lib/logger";

export interface PublicEvolutionConfig {
  url: string;
  instanceName: string;
  hasApiKey: boolean;
  updatedAt: string;
}

function rowToPublic(row: typeof evolutionConfigsTable.$inferSelect): PublicEvolutionConfig {
  return {
    url: row.url,
    instanceName: row.instanceName,
    hasApiKey: typeof row.apiKey === "string" && row.apiKey.length > 0,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getConfig(userId: string): Promise<{ url: string; apiKey: string; instanceName: string } | undefined> {
  const rows = await db
    .select({ url: evolutionConfigsTable.url, apiKey: evolutionConfigsTable.apiKey, instanceName: evolutionConfigsTable.instanceName })
    .from(evolutionConfigsTable)
    .where(eq(evolutionConfigsTable.userId, userId))
    .limit(1);
  if (rows.length === 0) return undefined;
  return rows[0];
}

export async function getPublicConfig(userId: string): Promise<PublicEvolutionConfig | null> {
  const rows = await db
    .select()
    .from(evolutionConfigsTable)
    .where(eq(evolutionConfigsTable.userId, userId))
    .limit(1);
  if (rows.length === 0) return null;
  return rowToPublic(rows[0]);
}

export async function saveConfig(
  userId: string,
  url: string,
  apiKey: string,
  instanceName: string,
): Promise<PublicEvolutionConfig> {
  const cleanUrl = url.replace(/\/$/, "");

  const existing = await getConfig(userId);
  const finalApiKey = apiKey || existing?.apiKey || "";

  const rows = await db
    .insert(evolutionConfigsTable)
    .values({
      userId,
      url: cleanUrl,
      apiKey: finalApiKey,
      instanceName,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: evolutionConfigsTable.userId,
      set: {
        url: cleanUrl,
        apiKey: finalApiKey,
        instanceName,
        updatedAt: new Date(),
      },
    })
    .returning();

  if (rows.length === 0) throw new Error("Failed to save evolution config");
  return rowToPublic(rows[0]);
}

export async function deleteConfig(userId: string): Promise<void> {
  try {
    await db.delete(evolutionConfigsTable).where(eq(evolutionConfigsTable.userId, userId));
  } catch (err) {
    logger.error({ err }, "deleteConfig error");
    throw new Error("Failed to delete config");
  }
}

export async function listAllConfigs(): Promise<Array<{ userId: string } & PublicEvolutionConfig>> {
  const rows = await db.select().from(evolutionConfigsTable);
  return rows.map((r) => ({ userId: r.userId, ...rowToPublic(r) }));
}
