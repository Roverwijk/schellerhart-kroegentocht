# Kroegentocht Spreekwoorden

Mobiele realtime webapp voor een kroegentochtspel met 4 teams. Teams uploaden foto's van uitgebeelde spreekwoorden, andere teams raden die foto's tijdens de stemfase, en de admin beheert fases, timers, correcties en eindscore.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Database
- Supabase Storage
- Supabase Realtime
- Vercel deployment

## Functies

- `/upload`: team kiest naam, uploadt foto en vult spreekwoord in met autosuggest
- `/vote`: team stemt mobiel per foto, ziet voortgang en timer, en krijgt na afloop een overzicht met goed/fout
- `/admin`: fasebeheer, countdowns, live voortgang, score-overzicht, overrides en canonical spreekwoorden
- Normalisatie van vrije tekst:
  - lowercase
  - trimmen
  - dubbele spaties verwijderen
  - leestekens verwijderen
- Fuzzy suggesties op basis van bestaande spreekwoorden
- Centrale game state in de database
- Invoer stopt automatisch zodra deadlines verlopen

## Lokale installatie

1. Installeer dependencies:

```bash
npm install
```

2. Maak een lokale env:

```bash
cp .env.local.example .env.local
```

3. Vul in `.env.local` je Supabase projectwaarden en admincode in.

4. Maak in Supabase de database en storage klaar:
   - Open de SQL Editor
   - Draai eerst [schema.sql](/C:/Users/roverwijk/OneDrive - Deltion College/Documenten/Codex/supabase/schema.sql)
   - Draai daarna [seed.sql](/C:/Users/roverwijk/OneDrive - Deltion College/Documenten/Codex/supabase/seed.sql)

5. Start lokaal:

```bash
npm run dev
```

6. Open:
   - `http://localhost:3000/upload`
   - `http://localhost:3000/vote`
   - `http://localhost:3000/admin`

## Supabase opzet

### Tabellen

- `teams`
- `proverbs`
- `submissions`
- `votes`
- `game_state`

### Storage

- Bucket: `submission-photos`
- Staat publiek voor read-only fotovertoning
- Uploads lopen via server-side API met service role key

### Realtime

- `game_state` staat in de `supabase_realtime` publication
- Clients luisteren live op fasewissels en timerupdates

## Spelregels in de app

- Alleen uploaden tijdens fase `upload`
- Alleen stemmen tijdens fase `voting`
- Bij verlopen deadline blokkeert invoer automatisch
- Een team kan niet op zijn eigen submission stemmen
- Per submission kan elk team maar één stem uitbrengen
- Correcte stemmen leveren 1 punt op voor het makersteam van die foto
- Stemteam krijgt zelf geen punten
- Admin kan antwoordbeoordelingen handmatig overriden

## Projectstructuur

- [app](/C:/Users/roverwijk/OneDrive - Deltion College/Documenten/Codex/app) - routes en API handlers
- [components](/C:/Users/roverwijk/OneDrive - Deltion College/Documenten/Codex/components) - mobiele UI componenten
- [lib](/C:/Users/roverwijk/OneDrive - Deltion College/Documenten/Codex/lib) - domeinlogica, Supabase helpers en normalisatie
- [supabase](/C:/Users/roverwijk/OneDrive - Deltion College/Documenten/Codex/supabase) - schema en seed scripts

## Vercel deploy

1. Push de repository naar GitHub.
2. Maak in Vercel een nieuw project op basis van deze repository.
3. Voeg in Vercel Environment Variables toe:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_STORAGE_BUCKET`
   - `ADMIN_PASSCODE`
4. Deploy het project.
5. Controleer na deploy:
   - upload werkt op mobiel
   - foto's verschijnen in storage
   - fasewissels updaten direct
   - stemmen en scoretelling lopen correct

## Productie-opmerkingen

- De adminroute gebruikt een eenvoudige pincode-cookie, bedoeld voor praktisch gebruik tijdens een evenement.
- Voor strengere productiebeveiliging kun je later Supabase Auth of Vercel password protection toevoegen.
- Omdat uploads server-side verlopen, hoeft de client geen directe schrijfrechten op Storage of database te hebben.
