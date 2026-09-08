import bcrypt from "bcryptjs";

export const BCRYPT_COST = 12;

export async function hashPassword(password: string, cost = BCRYPT_COST): Promise<string> {
  return bcrypt.hash(password, cost);
}

/** Constant-time comparison handled by bcryptjs. */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}