import { desc, sql } from "drizzle-orm";
import { db, auditLogTable } from "@workspace/db";
import { logger } from "../lib/logger";

export type AuditAction =
  | "user.create"
  | "user.update"
  | "user.delete"
  | "user.role.change"
  | "user.status.change"
  | "evolution-config.admin.view"
  | "evolution-config.admin.update"
  | "evolution-config.admin.delete";

export interface AuditEntry {
  id: string;
  timestamp: string;
  adminId: string;
  adminEmail: string;
  action: AuditAction;
  targetId: string;
  targetEmail?: string;
  detail: string;
}

export async function logAction(
  adminId: string,
  adminEmail: string,
  action: AuditAction,
  targetId: string,
  detail: string,
  targetEmail?: string,
): Promise<void> {
  try {
    await db.insert(auditLogTable).values({
      adminId,
      adminEmail,
      action,
      targetId,
      targetEmail: targetEmail ?? null,
      detail,
    });
  } catch (err) {
    logger.error({ err }, "Failed to write audit log");
  }
}

export async function getAuditLog(limit = 100): Promise<{ entries: AuditEntry[]; total: number }> {
  const safeLimit = Math.min(limit, 500);

  const [countResult, rows] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(auditLogTable),
    db
      .select()
      .from(auditLogTable)
      .orderBy(desc(auditLogTable.loggedAt))
      .limit(safeLimit),
  ]);

  const entries: AuditEntry[] = rows.map((r) => ({
    id: r.id,
    timestamp: r.loggedAt.toISOString(),
    adminId: r.adminId,
    adminEmail: r.adminEmail,
    action: r.action as AuditAction,
    targetId: r.targetId,
    targetEmail: r.targetEmail ?? undefined,
    detail: r.detail,
  }));

  return { entries, total: countResult[0]?.count ?? 0 };
}
