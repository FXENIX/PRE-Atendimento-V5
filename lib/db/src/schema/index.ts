import { pgTable, text, boolean, timestamp, uuid, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["admin", "user"] }).notNull().default("user"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const evolutionConfigsTable = pgTable("evolution_configs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }).unique(),
  url: text("url").notNull().default(""),
  apiKey: text("api_key").notNull().default(""),
  instanceName: text("instance_name").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const auditLogTable = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  loggedAt: timestamp("logged_at", { withTimezone: true }).notNull().defaultNow(),
  adminId: text("admin_id").notNull(),
  adminEmail: text("admin_email").notNull(),
  action: text("action").notNull(),
  targetId: text("target_id").notNull(),
  targetEmail: text("target_email"),
  detail: text("detail").notNull(),
}, (table) => [
  index("audit_log_logged_at_idx").on(table.loggedAt),
]);

export const evolutionServersTable = pgTable("evolution_servers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  apiUrl: text("api_url").notNull(),
  apiKey: text("api_key").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const evolutionInstancesTable = pgTable("evolution_instances", {
  id: uuid("id").primaryKey().defaultRandom(),
  serverId: uuid("server_id").notNull().references(() => evolutionServersTable.id, { onDelete: "cascade" }),
  instanceName: text("instance_name").notNull(),
  instanceToken: text("instance_token").notNull().default(""),
  instanceJid: text("instance_jid").notNull().default(""),
  status: text("status").notNull().default("created"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("evolution_instances_server_id_idx").on(table.serverId),
]);

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;

export const insertEvolutionConfigSchema = createInsertSchema(evolutionConfigsTable).omit({ id: true, updatedAt: true });
export type InsertEvolutionConfig = z.infer<typeof insertEvolutionConfigSchema>;
export type EvolutionConfig = typeof evolutionConfigsTable.$inferSelect;

export const insertAuditLogSchema = createInsertSchema(auditLogTable).omit({ id: true, loggedAt: true });
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogTable.$inferSelect;

export type EvolutionServer = typeof evolutionServersTable.$inferSelect;
export type EvolutionInstance = typeof evolutionInstancesTable.$inferSelect;
