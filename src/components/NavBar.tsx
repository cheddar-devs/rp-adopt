import { getServerSession } from "next-auth";
import { authOptions } from "../app/lib/auth";
import NavBarClient from "./NavBarClient";

export default async function NavBar() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any | undefined;

  return (
    <NavBarClient
      isAuthed={!!session}
      role={user?.role ?? null}
      username={user?.name ?? user?.discordId ?? "User"}
      avatarUrl={(user as any)?.image ?? (user as any)?.avatarUrl ?? null}
    />
  );
}