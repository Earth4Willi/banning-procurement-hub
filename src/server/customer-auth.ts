import type { NextRequest } from "next/server";
import { audit } from "./audit";
import { badRequest, HttpError, unauthorized } from "./http-error";
import type { CustomerUser } from "./user-store";
import {
  autoAdoptQuotes,
  createUser,
  findUserByEmail,
  findUserByEmailWithPassword,
  findUserByPhone,
} from "./user-store";
import { hashPassword, verifyPassword } from "./passwords";
import { clientIp, enforceRateLimit } from "./rate-limit";
import type { CustomerPrincipal } from "./session";
import { emailSchema, phoneSchema } from "./validate";

export const GENERIC = "Invalid email or password.";

export async function registerCustomer(opts: {
  request: NextRequest;
  name: string;
  email: string;
  phone: string;
  password: string;
  area?: string;
  address?: string;
}): Promise<CustomerUser> {
  const ip = clientIp(opts.request);
  await enforceRateLimit(opts.request, {
    prefix: "rl:register:ip",
    identifier: ip,
    limit: 10,
    windowSeconds: 900,
  });

  const email = emailSchema.parse(opts.email);
  const phone = phoneSchema.parse(opts.phone);

  const existingEmail = await findUserByEmail(email);
  if (existingEmail) {
    throw badRequest("email_taken", "An account already exists with those details.");
  }

  const existingPhone = await findUserByPhone(phone);
  if (existingPhone) {
    throw badRequest("phone_taken", "An account already exists with those details.");
  }

  const passwordHash = await hashPassword(opts.password);
  const user = await createUser({
    email,
    phone,
    name: opts.name,
    area: opts.area,
    address: opts.address,
    passwordHash,
  });

  if (!user) {
    throw new HttpError(503, "storage_unavailable", "Live database not configured — account not created.");
  }

  await autoAdoptQuotes(phone, user.id);
  await audit("customer_registered", { userId: user.id, email: user.email });
  return user;
}

export async function loginCustomer(opts: {
  request: NextRequest;
  email: string;
  password: string;
}): Promise<CustomerPrincipal> {
  const ip = clientIp(opts.request);
  const email = emailSchema.parse(opts.email);
  await enforceRateLimit(opts.request, {
    prefix: "rl:customer-login:ip",
    identifier: ip,
    limit: 15,
    windowSeconds: 900,
  });
  await enforceRateLimit(opts.request, {
    prefix: "rl:customer-login:email",
    identifier: email,
    limit: 6,
    windowSeconds: 900,
  });

  const user = await findUserByEmailWithPassword(email);
  if (!user) {
    await bcryptDummy(opts.password);
    throw unauthorized("invalid_credentials", GENERIC);
  }

  const passwordOk = await verifyPassword(opts.password, user.password_hash);
  if (!passwordOk) {
    throw unauthorized("invalid_credentials", GENERIC);
  }

  await audit("customer_logged_in", { userId: user.id, email: user.email });
  return {
    id: user.id,
    role: "customer",
    email: user.email,
    name: user.name,
    phone: user.phone,
  };
}

async function bcryptDummy(_password: string): Promise<void> {
  await verifyPassword(_password, "$2a$12$" + "x".repeat(53));
}
