/**
 * Provide helpers to require authenticated user and enforce route-level access control.
 */
import { getServerSession } from "@/server/auth/session";

export class UnauthorizedError extends Error {
  constructor() {
    super("UNAUTHORIZED");
  }
}

export async function requireUser() {
  const session = await getServerSession();
  if (!session) {
    throw new UnauthorizedError();
  }
  return session.user;
}

export function isUnauthorizedError(err: unknown) {
  return err instanceof UnauthorizedError;
}
