import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { FriendButton } from "@/components/FriendButton";
import { getMyFriendships, searchPeople, type FriendState, type Person } from "@/lib/friends";
import { getCurrentUserId } from "@/lib/profiles";
import { card, inputClass, primaryButton } from "@/lib/ui";

export const metadata: Metadata = { title: "Friends" };

function PersonRow({ person, state }: { person: Person; state: FriendState }) {
  return (
    <li className="flex items-center gap-3 py-3">
      <Avatar name={person.display_name} url={person.avatar_url} size={44} />
      <div className="min-w-0 flex-1 leading-tight">
        <Link href={`/u/${person.username}`} className="font-semibold hover:underline">
          {person.display_name}
        </Link>
        <p className="text-sm text-muted">@{person.username}</p>
      </div>
      <FriendButton state={state} userId={person.id} username={person.username} signedIn />
    </li>
  );
}

type SectionProps = { title: string; people: Person[]; state: FriendState | ((id: string) => FriendState); empty?: string };

function Section({ title, people, state, empty }: SectionProps) {
  if (!people.length && !empty) return null;
  return (
    <section className={`${card} px-4 py-2`}>
      <h2 className="pt-2 font-semibold">
        {title} <span className="text-muted">({people.length})</span>
      </h2>
      {people.length ? (
        <ul className="divide-y divide-border">
          {people.map((p) => (
            <PersonRow key={p.id} person={p} state={typeof state === "function" ? state(p.id) : state} />
          ))}
        </ul>
      ) : (
        <p className="py-4 text-sm text-muted">{empty}</p>
      )}
    </section>
  );
}

export default async function FriendsPage({ searchParams }: PageProps<"/friends">) {
  const me = await getCurrentUserId();
  if (!me) redirect("/login?next=/friends");
  const sp = await searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim() ?? "";
  const [{ friends, incoming, outgoing }, results] = await Promise.all([getMyFriendships(me), searchPeople(q, me)]);

  const stateOf = (id: string): FriendState =>
    friends.some((p) => p.id === id) ? "friends" : incoming.some((p) => p.id === id) ? "incoming" : outgoing.some((p) => p.id === id) ? "outgoing" : "none";

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold">Friends</h1>
      {sp.error === "chat" ? (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">You can only message people who are your friends.</p>
      ) : null}

      <form role="search" action="/friends" className="flex gap-2">
        <label className="flex-1">
          <span className="sr-only">Find people</span>
          <input type="search" name="q" defaultValue={q} placeholder="Find people by name or username" className={inputClass} />
        </label>
        <button type="submit" className={`${primaryButton} !py-2`}>
          Search
        </button>
      </form>

      {q ? (
        <Section title={`People matching “${q}”`} people={results} state={stateOf} empty="Nobody found. Try another name." />
      ) : null}
      {q ? null : (
        <>
          <Section title="Friend requests" people={incoming} state="incoming" />
          <Section title="Your friends" people={friends} state="friends" empty="No friends yet. Search for people above to add them." />
          <Section title="Requests you sent" people={outgoing} state="outgoing" />
        </>
      )}
    </main>
  );
}
