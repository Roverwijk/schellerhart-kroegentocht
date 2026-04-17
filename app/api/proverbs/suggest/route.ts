import { NextRequest, NextResponse } from "next/server";

import { getProverbs } from "@/lib/game-service";
import { rankProverbs } from "@/lib/text";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get("q") ?? "";
    const supabase = createServiceClient();
    const proverbs = await getProverbs(supabase);
    const suggestions = rankProverbs(query, proverbs);

    return NextResponse.json({ suggestions });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Onbekende fout." },
      { status: 500 }
    );
  }
}
