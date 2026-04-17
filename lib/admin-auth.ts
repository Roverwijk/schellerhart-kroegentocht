import { cookies } from "next/headers";

import { env } from "@/lib/env";

export const ADMIN_COOKIE_NAME = "kroegentocht_admin";

export async function isAdminAuthenticated(): Promise<boolean> {
  const store = await cookies();
  return store.get(ADMIN_COOKIE_NAME)?.value === env.adminPasscode;
}
