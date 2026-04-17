"use client";

import type { FormEvent } from "react";
import { useState } from "react";

import { MobileShell } from "@/components/mobile-shell";

export function AdminLogin() {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const response = await fetch("/api/admin/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ passcode })
    });
    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(payload.error ?? "Inloggen mislukt.");
      setPending(false);
      return;
    }

    window.location.reload();
  }

  return (
    <MobileShell
      title="Admin"
      subtitle="Beveiligd met een eenvoudige pincode zodat alleen de spelleiding fases en scores kan aanpassen."
    >
      <section className="rounded-4xl border border-white/70 bg-white/90 p-5 shadow-card">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Admincode</span>
            <input
              className="w-full rounded-3xl border-slate-200 bg-white px-4 py-4 text-base font-semibold text-ink shadow-sm focus:border-accent focus:ring-accent"
              placeholder="Voer code in"
              type="password"
              value={passcode}
              onChange={(event) => setPasscode(event.target.value)}
            />
          </label>
          <button
            className="w-full rounded-3xl bg-ink px-4 py-4 text-base font-black text-white transition hover:bg-slate-800 disabled:bg-slate-300"
            disabled={!passcode.trim() || pending}
            type="submit"
          >
            {pending ? "Bezig..." : "Open admin"}
          </button>
        </form>
      </section>
      {error ? (
        <section className="rounded-4xl border border-berry/20 bg-rose-50 p-4 text-sm font-semibold text-berry">
          {error}
        </section>
      ) : null}
    </MobileShell>
  );
}
