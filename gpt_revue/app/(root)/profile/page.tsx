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

  return <ProfileView profile={profile} userId={user.id} />;
}
