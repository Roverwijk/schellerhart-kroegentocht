# Kroegentocht Spreekwoorden

Mobiele realtime webapp voor een kroegentochtspel met 4 teams. Elk team gebruikt een vaste teamlink, speelt 3 uploadrondes met 2 vaste spreekwoorden per ronde, en stemt daarna op de foto's van de andere teams.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Database
- Supabase Storage
- Supabase Realtime
- Vercel deployment

## Functies

- `/upload/[teamSlug]`: vaste teampagina die automatisch wisselt tussen wachten, uploaden, stemmen en resultaten
- `/vote`: losse stempagina voor testen of handmatig gebruik
- `/admin`: fasebeheer, rondes, countdowns, live voortgang, score-overzicht, overrides en canonical spreekwoorden
- 3 uploadrondes met per team 2 vaste spreekwoorden per ronde
- Centrale game state in de database met actieve ronde
- Invoer stopt automatisch zodra deadlines verlopen
- Fuzzy suggesties op basis van bestaande spreekwoorden tijdens stemmen
- Resetknop voor nieuwe speelrondes, inclusief verwijderen van geuploade foto's

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
   - Gebruik voor bestaande projecten ook [add-rounds-and-assignments.sql](/C:/Users/roverwijk/OneDrive - Deltion College/Documenten/Codex/supabase/add-rounds-and-assignments.sql)

5. Start lokaal:

```bash
npm run dev
```

6. Open:
   - `http://localhost:3000/upload/team-rood`
   - `http://localhost:3000/upload/team-blauw`
   - `http://localhost:3000/vote`
   - `http://localhost:3000/admin`

## Supabase opzet

### Tabellen

- `teams`
- `proverbs`
- `rounds`
- `assignments`
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

- Elk team gebruikt 1 vaste QR-code / teamlink
- De admin opent upload per ronde
- Per ronde heeft elk team precies 2 vaste spreekwoorden
- Alleen uploaden tijdens fase `upload`
- Alleen stemmen tijdens fase `voting`
- Bij verlopen deadline blokkeert invoer automatisch
- Een team kan niet op zijn eigen submission stemmen
- Per submission kan elk team maar 1 stem uitbrengen
- Correcte stemmen leveren 1 punt op voor het makersteam van die foto
- Het stemmende team krijgt zelf ook 1 punt bij een correct antwoord
- Admin kan antwoordbeoordelingen handmatig overriden

## Projectstructuur

- [app](/C:/Users/roverwijk/OneDrive - Deltion College/Documenten/Codex/app) - routes en API handlers
- [components](/C:/Users/roverwijk/OneDrive - Deltion College/Documenten/Codex/components) - mobiele UI componenten
- [lib](/C:/Users/roverwijk/OneDrive - Deltion College/Documenten/Codex/lib) - domeinlogica, Supabase helpers en normalisatie
- [supabase](/C:/Users/roverwijk/OneDrive - Deltion College/Documenten/Codex/supabase) - schema, seeds en migratiescripts

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
   - teamlinks werken op mobiel
   - foto's verschijnen in storage
   - fasewissels updaten direct
   - stemmen en scoretelling lopen correct

## Productie-opmerkingen

- De adminroute gebruikt een eenvoudige pincode-cookie, bedoeld voor praktisch gebruik tijdens een evenement.
- Voor strengere productiebeveiliging kun je later Supabase Auth of Vercel password protection toevoegen.
- Omdat uploads server-side verlopen, hoeft de client geen directe schrijfrechten op Storage of database te hebben.
