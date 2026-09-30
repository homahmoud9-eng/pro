import { redirect } from "next/navigation";
import { getSessionActor } from "@/lib/auth/session";

export default async function HomePage() {
  const actor = await getSessionActor();
  if (!actor) {
    redirect("/login");
  }
  redirect("/dashboard");
}
