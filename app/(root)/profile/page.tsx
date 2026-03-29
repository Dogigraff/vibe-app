import { createClient } from "@/lib/supabase/server";
import { ProfileView } from "@/features/profile/ProfileView";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center p-6">
        <p className="text-center text-muted-foreground">
          Войдите, чтобы увидеть профиль
        </p>
      </div>
    );
  }

  const { data: profile } = await supabase
    .schema("public")
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Fetch recent vibes (parties where user is a member)
  const { data: recentMemberships } = await (supabase as any)
    .from("party_members")
    .select("party_id, parties(id, location_name, mood, created_at)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false })
    .limit(5);

  const recentVibes = (recentMemberships || [])
    .map((m: any) => m.parties)
    .filter(Boolean);

  return <ProfileView profile={profile} userId={user.id} recentVibes={recentVibes} />;
}
