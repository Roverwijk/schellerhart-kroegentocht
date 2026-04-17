"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import type { ProverbSuggestion } from "@/lib/types";

type ProverbAutosuggestProps = {
  value: string;
  onChange: (value: string) => void;
  onCanonicalPick: (suggestion: ProverbSuggestion | null) => void;
  disabled?: boolean;
  label?: string;
  placeholder?: string;
};

export function ProverbAutosuggest({
  value,
  onChange,
  onCanonicalPick,
  disabled,
  label = "Spreekwoord",
  placeholder = "Typ het spreekwoord"
}: ProverbAutosuggestProps) {
  const [suggestions, setSuggestions] = useState<ProverbSuggestion[]>([]);
  const [pending, startTransition] = useTransition();
  const onCanonicalPickRef = useRef(onCanonicalPick);

  useEffect(() => {
    onCanonicalPickRef.current = onCanonicalPick;
  }, [onCanonicalPick]);

  useEffect(() => {
    if (value.trim().length < 4) {
      setSuggestions([]);
      onCanonicalPickRef.current(null);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      startTransition(async () => {
        try {
          const response = await fetch(
            `/api/proverbs/suggest?q=${encodeURIComponent(value)}`,
            { signal: controller.signal }
          );
          if (!response.ok) {
            setSuggestions([]);
            return;
          }

          const payload = (await response.json()) as { suggestions: ProverbSuggestion[] };
          setSuggestions(payload.suggestions);
          onCanonicalPickRef.current(payload.suggestions[0] ?? null);
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") {
            return;
          }

          setSuggestions([]);
        }
      });
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [value]);

  const best = suggestions[0];

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
        <input
          className="w-full rounded-3xl border-slate-200 bg-white px-4 py-4 text-base font-semibold text-ink shadow-sm placeholder:text-slate-400 focus:border-accent focus:ring-accent"
          disabled={disabled}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>

      {best && best.similarity >= 0.9 && !best.exact ? (
        <button
          className="w-full rounded-3xl border border-accent/20 bg-accent-soft px-4 py-3 text-left text-sm text-accent-dark transition hover:border-accent"
          type="button"
          onClick={() => {
            onChange(best.canonical_text);
            onCanonicalPick(best);
          }}
        >
          Bedoel je <span className="font-bold">{best.canonical_text}</span>?
        </button>
      ) : null}

      {suggestions.length > 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Suggesties
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                className="rounded-full bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                type="button"
                onClick={() => {
                  onChange(suggestion.canonical_text);
                  onCanonicalPick(suggestion);
                }}
              >
                {suggestion.canonical_text}
              </button>
            ))}
          </div>
          {pending ? <p className="mt-2 text-xs text-slate-500">Zoeken...</p> : null}
        </div>
      ) : value.trim().length >= 4 ? (
        <p className="rounded-3xl bg-slate-100 px-4 py-3 text-sm text-slate-500">
          Geen sterke match gevonden. Je kunt gewoon je eigen tekst insturen.
        </p>
      ) : null}
    </div>
  );
}
