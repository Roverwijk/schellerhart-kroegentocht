import type { Team } from "@/lib/types";

type TeamSelectProps = {
  teams: Team[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  disabled?: boolean;
};

export function TeamSelect({
  teams,
  value,
  onChange,
  label = "Team",
  disabled
}: TeamSelectProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
      <select
        className="w-full rounded-3xl border-slate-200 bg-white px-4 py-4 text-base font-semibold text-ink shadow-sm focus:border-accent focus:ring-accent"
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Kies een team</option>
        {teams.map((team) => (
          <option key={team.id} value={team.id}>
            {team.name}
          </option>
        ))}
      </select>
    </label>
  );
}
