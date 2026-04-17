import { NextResponse } from "next/server";

import { isAdminAuthenticated } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      voteId?: string;
      isCorrect?: boolean;
    };

    if (!body.voteId || typeof body.isCorrect !== "boolean") {
      return NextResponse.json({ error: "Onvolledige override." }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { error } = await supabase
      .from("votes")
      .update({ override_is_correct: body.isCorrect })
      .eq("id", body.voteId);

    if (error) {
      throw new Error("Override opslaan mislukte.");
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Onbekende fout." },
      { status: 500 }
    );
  }
}
