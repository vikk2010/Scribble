import Link from "next/link";
import { acceptFriendRequest, openDirectChat, removeFriendship, sendFriendRequest } from "@/app/actions/friends";
import type { FriendState } from "@/lib/friends";
import { primaryButton, secondaryButton } from "@/lib/ui";

type Props = { state: FriendState; userId: string; username: string; signedIn: boolean };

const small = "!px-4 !py-1.5 text-sm";

function Action({ action, userId, username, label, primary }: { action: (f: FormData) => Promise<void>; userId: string; username: string; label: string; primary?: boolean }) {
  return (
    <form action={action}>
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="username" value={username} />
      <button type="submit" className={primary ? `${primaryButton} ${small}` : secondaryButton}>
        {label}
      </button>
    </form>
  );
}

export function FriendButton({ state, userId, username, signedIn }: Props) {
  if (!signedIn) {
    return (
      <Link href={`/login?next=/u/${username}`} className={`${primaryButton} ${small}`}>
        Add friend
      </Link>
    );
  }
  switch (state) {
    case "self":
      return null;
    case "none":
      return <Action action={sendFriendRequest} userId={userId} username={username} label="Add friend" primary />;
    case "outgoing":
      return <Action action={removeFriendship} userId={userId} username={username} label="Cancel request" />;
    case "incoming":
      return (
        <div className="flex gap-2">
          <Action action={acceptFriendRequest} userId={userId} username={username} label="Accept" primary />
          <Action action={removeFriendship} userId={userId} username={username} label="Decline" />
        </div>
      );
    case "friends":
      return (
        <div className="flex gap-2">
          <Action action={openDirectChat} userId={userId} username={username} label="Message" primary />
          <Action action={removeFriendship} userId={userId} username={username} label="Unfriend" />
        </div>
      );
  }
}
