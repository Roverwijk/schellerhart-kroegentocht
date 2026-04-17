import { TeamPlayScreen } from "@/components/team-play-screen";

export default async function TeamUploadPage({
  params
}: {
  params: Promise<{ teamSlug: string }>;
}) {
  const { teamSlug } = await params;
  return <TeamPlayScreen teamSlug={teamSlug} />;
}
