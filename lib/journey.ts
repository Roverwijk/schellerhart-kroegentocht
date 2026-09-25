import type { JourneyStage } from "@/lib/types";

export type JourneyPresentation = {
  title: string;
  subtitle: string;
  explanation: string;
  artwork: {
    src: string;
    alt: string;
    label: string;
  };
  drinkTip: {
    drink: string;
    note: string;
  };
};

const venueRotation: Record<"round-1" | "round-2" | "round-3", Record<string, string>> = {
  "round-1": {
    "team-rood": "De Tagrijn",
    "team-blauw": "De Belgische Keizer",
    "team-groen": "Swolsch Caf\u00e9"
  },
  "round-2": {
    "team-rood": "De Belgische Keizer",
    "team-blauw": "Swolsch Caf\u00e9",
    "team-groen": "De Tagrijn"
  },
  "round-3": {
    "team-rood": "Swolsch Caf\u00e9",
    "team-blauw": "De Tagrijn",
    "team-groen": "De Belgische Keizer"
  }
};

const artworkVersion = "20260417b";

const venueCopy: Record<string, string> = {
  "De Tagrijn": "Tijd om aan te meren. Zoek een goed plekje en houd de creatieve bemanning bij elkaar.",
  "De Belgische Keizer": "Treed binnen als keizers. De kroon mag scheef, maar de foto moet raak zijn.",
  "Swolsch Caf\u00e9": "Zwolle roept. Bestel de sfeer alvast; de opdracht volgt zodra iedereen binnen is."
};

export function getJourneyPresentation(
  stage: JourneyStage,
  teamSlug: string
): JourneyPresentation {
  if (stage === "central-1" || stage === "central-2") {
    const gameNumber = stage === "central-1" ? 1 : 2;
    return {
      title: "De Glazen Engel",
      subtitle: `Vleugels uit, glazen bij elkaar. Tijd voor tussenspel ${gameNumber} en 3 kostbare bonuspunten.`,
      explanation:
        "Ga met het hele team naar De Glazen Engel aan de Grote Markt. Daar spelen de teams een kort spel tegen elkaar. De winnaar krijgt 3 punten.",
      artwork: {
        src: "/nel/nel-glazen-engel.png?v=20260925a",
        alt: "Tante Nel proost naast de groene Glazen Engel in Zwolle",
        label: `Tussenstop ${gameNumber}`
      },
      drinkTip: gameNumber === 1
        ? { drink: "Westmalle Dubbel", note: "Een stevige tussenstop voor een spannend spel." }
        : { drink: "La Chouffe", note: "Klein van stuk, groots genoeg voor bonuspunten." }
    };
  }

  if (stage === "final") {
    return {
      title: "Het Proeflokaal",
      subtitle: "Alle wegen leiden naar de finale. Verzamel de troepen en houd jullie antwoorden paraat.",
      explanation:
        "Hier komen alle teams samen. Zodra iedereen binnen is, opent de spelleiding de stemronde en raden jullie de foto's van de andere teams.",
      artwork: {
        src: `/nel/nel-e.png?v=${artworkVersion}`,
        alt: "Nel Bannink heft het glas voor de finale",
        label: "Op naar de finale"
      },
      drinkTip: {
        drink: "Delirium",
        note: "Proef gerust, maar houd het hoofd scherp voor de stemronde."
      }
    };
  }

  const roundNumber = Number(stage.slice(-1));
  const venue = venueRotation[stage][teamSlug] ?? "Jullie volgende kroeg";
  const artworkName = roundNumber === 1 ? "a" : roundNumber === 2 ? "c" : "d";
  const drinkTip = roundNumber === 1
    ? { drink: "Texels Skuumkoppe", note: "Rustig inkomen met een klassieker." }
    : roundNumber === 2
      ? { drink: "La Chouffe", note: "Een vrolijke opsteker voor de jubileumronde." }
      : { drink: "Blauwe Handje", note: "Lokaal karakter voor de laatste fotoronde." };

  return {
    title: venue,
    subtitle: venueCopy[venue] ?? "Ga samen op pad en meld je zodra het hele team binnen is.",
    explanation:
      roundNumber === 2
        ? "Als iedereen is aangekomen, opent de spelleiding de jubileumronde. Jullie beelden dan een uniek Schellerhart-moment uit."
        : `Als iedereen is aangekomen, opent de spelleiding ronde ${roundNumber}. Jullie krijgen dan twee spreekwoorden om uit te beelden en te fotograferen.`,
    artwork: {
      src: `/nel/nel-${artworkName}.png?v=${artworkVersion}`,
      alt: `Nel Bannink op weg naar ronde ${roundNumber}`,
      label: `Op weg naar ronde ${roundNumber}`
    },
    drinkTip
  };
}
