import { AccessToken } from "livekit-server-sdk";
import { NextResponse } from "next/server";
import { getCall } from "@/lib/calls";
import { isCallingConfigured, livekitUrl } from "@/lib/env";
import { getMyProfile } from "@/lib/profiles";

/** Issues a short-lived LiveKit token for a call the user is a member of. */
export async function POST(_request: Request, { params }: RouteContext<"/api/calls/[id]/token">) {
  if (!isCallingConfigured) {
    return NextResponse.json({ error: "Calling is not set up on this server." }, { status: 503 });
  }
  const { id } = await params;
  const { userId, profile } = await getMyProfile();
  if (!userId || !profile) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const call = await getCall(id);
  if (!call) return NextResponse.json({ error: "Call not found." }, { status: 404 });
  if (call.status !== "ringing" && call.status !== "active") {
    return NextResponse.json({ error: "This call has ended." }, { status: 410 });
  }

  const token = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
    identity: userId,
    name: profile.display_name,
    ttl: "2h",
  });
  token.addGrant({
    room: `call-${call.id}`,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  return NextResponse.json(
    { token: await token.toJwt(), serverUrl: livekitUrl },
    { headers: { "Cache-Control": "no-store" } },
  );
}
