import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { ADMIN_COOKIE_NAME } from "@/lib/admin-auth";
import { env } from "@/lib/env";

export async function POST(request: Request) {
  const body = (await request.json()) as { passcode?: string };
  if (body.passcode !== env.adminPasscode) {
    return NextResponse.json({ error: "Onjuiste code." }, { status: 401 });
  }

  const store = await cookies();
  store.set(ADMIN_COOKIE_NAME, env.adminPasscode, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const store = await cookies();
  store.delete(ADMIN_COOKIE_NAME);
  return NextResponse.json({ ok: true });
}
