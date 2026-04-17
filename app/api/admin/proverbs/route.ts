import { NextResponse } from "next/server";

import { isAdminAuthenticated } from "@/lib/admin-auth";
import { canonicalizeText, normalizeText } from "@/lib/text";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("proverbs")
      .select("id, canonical_text, normalized_text")
      .order("canonical_text");

    if (error) {
      throw new Error("Spreekwoorden laden mislukte.");
    }

    return NextResponse.json({ proverbs: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Onbekende fout." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { canonicalText?: string };
    const canonicalText = canonicalizeText(body.canonicalText ?? "");
    const normalizedText = normalizeText(canonicalText);

    if (!normalizedText) {
      return NextResponse.json({ error: "Typ een spreekwoord." }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { error } = await supabase.from("proverbs").insert({
      canonical_text: canonicalText,
      normalized_text: normalizedText
    });

    if (error) {
      throw new Error("Spreekwoord toevoegen mislukte.");
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Onbekende fout." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      id?: string;
      canonicalText?: string;
    };

    if (!body.id) {
      return NextResponse.json({ error: "ID ontbreekt." }, { status: 400 });
    }

    const canonicalText = canonicalizeText(body.canonicalText ?? "");
    const normalizedText = normalizeText(canonicalText);

    if (!normalizedText) {
      return NextResponse.json({ error: "Typ een spreekwoord." }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { error } = await supabase
      .from("proverbs")
      .update({
        canonical_text: canonicalText,
        normalized_text: normalizedText
      })
      .eq("id", body.id);

    if (error) {
      throw new Error("Spreekwoord bijwerken mislukte.");
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Onbekende fout." },
      { status: 500 }
    );
  }
}
