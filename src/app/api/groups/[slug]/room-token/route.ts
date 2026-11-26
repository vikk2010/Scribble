import { AccessToken, TrackSource } from "livekit-server-sdk";
import { NextResponse } from "next/server";
import { isCallingConfigured, livekitUrl } from "@/lib/env";
import { getGroupBySlug } from "@/lib/groups";
import { getMyProfile } from "@/lib/profiles";
import { getSpeakerIds } from "@/lib/rooms";

/**
 * Token for a group's voice room. Everyone in the group can listen and send
 * data; only the (at most 5) people holding a stage seat may publish audio.
 */
export async function POST(_request: Request, { params }: RouteContext<"/api/groups/[slug]/room-token">) {
  if (!isCallingConfigured) {
    return NextResponse.json({ error: "Voice rooms are not set up on this server." }, { status: 503 });
  }
  const { slug } = await params;
  const { userId, profile } = await getMyProfile();
  if (!userId || !profile) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const group = await getGroupBySlug(slug, userId);
  if (!group) return NextResponse.json({ error: "Group not found." }, { status: 404 });
  if (!group.joined) return NextResponse.json({ error: "Join the group to enter its voice room." }, { status: 403 });

  const speaker = (await getSpeakerIds(group.id)).includes(userId);
  const token = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
    identity: userId,
    name: profile.display_name,
    ttl: "2h",
  });
  token.addGrant({
    room: `group-${group.id}`,
    roomJoin: true,
    canSubscribe: true,
    canPublish: speaker,
    canPublishSources: speaker ? [TrackSource.MICROPHONE] : [],
    canPublishData: true,
  });

  return NextResponse.json(
    { token: await token.toJwt(), serverUrl: livekitUrl, speaker },
    { headers: { "Cache-Control": "no-store" } },
  );
}
