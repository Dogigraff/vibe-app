import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LandingOrLogin } from "@/components/landing-or-login";

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/map");
  }

  return <LandingOrLogin />;
}
