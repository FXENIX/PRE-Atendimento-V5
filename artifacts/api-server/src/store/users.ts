import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { logger } from "../lib/logger";

export type Role = "admin" | "user";

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

function rowToStored(row: typeof usersTable.$inferSelect): StoredUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.passwordHash,
    role: row.role as Role,
    active: row.active,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toPublic(u: StoredUser): PublicUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    active: u.active,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

export async function seedAdmin(): Promise<void> {
  const existing = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, "admin@example.com"))
    .limit(1);

  if (existing.length > 0) {
    logger.info("Admin user already exists.");
    return;
  }

  const passwordHash = await bcrypt.hash("password123", 10);
  await db.insert(usersTable).values({
    name: "Administrador",
    email: "admin@example.com",
    passwordHash,
    role: "admin",
    active: true,
  });

  logger.info("Admin user seeded.");
}

export async function findByEmail(email: string): Promise<StoredUser | undefined> {
  const rows = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);
  if (rows.length === 0) return undefined;
  return rowToStored(rows[0]);
}

export async function findById(id: string): Promise<StoredUser | undefined> {
  const rows = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, id))
    .limit(1);
  if (rows.length === 0) return undefined;
  return rowToStored(rows[0]);
}

export async function createUser(
  name: string,
  email: string,
  password: string,
  role: Role = "user",
): Promise<PublicUser> {
  const passwordHash = await bcrypt.hash(password, 10);
  const rows = await db
    .insert(usersTable)
    .values({ name, email, passwordHash, role, active: true })
    .returning();
  return toPublic(rowToStored(rows[0]));
}

export async function updateUser(
  id: string,
  fields: Partial<Pick<StoredUser, "name" | "role" | "active">>,
): Promise<PublicUser | null> {
  const updateData: Partial<typeof usersTable.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (fields.name !== undefined) updateData.name = fields.name;
  if (fields.role !== undefined) updateData.role = fields.role as "admin" | "user";
  if (fields.active !== undefined) updateData.active = fields.active;

  const rows = await db
    .update(usersTable)
    .set(updateData)
    .where(eq(usersTable.id, id))
    .returning();

  if (rows.length === 0) return null;
  return toPublic(rowToStored(rows[0]));
}

export async function deleteUser(id: string): Promise<boolean> {
  try {
    await db.delete(usersTable).where(eq(usersTable.id, id));
    return true;
  } catch (err) {
    logger.error({ err }, "deleteUser error");
    return false;
  }
}

export async function listUsers(): Promise<PublicUser[]> {
  const rows = await db
    .select()
    .from(usersTable)
    .orderBy(usersTable.createdAt);
  return rows.map((r) => toPublic(rowToStored(r)));
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
