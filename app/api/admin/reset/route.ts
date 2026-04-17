import { NextResponse } from "next/server";

import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getAdminSnapshot, resetGameRound } from "@/lib/game-service";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      uploadMinutes?: number;
      votingMinutes?: number;
    };

    const supabase = createServiceClient();
    await resetGameRound(supabase, {
      uploadMinutes: body.uploadMinutes,
      votingMinutes: body.votingMinutes
    });

    const snapshot = await getAdminSnapshot(supabase);
    return NextResponse.json(snapshot);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Onbekende fout." },
      { status: 500 }
    );
  }
}
