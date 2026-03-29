import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const supabaseUser = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Checking filesize limit just in case
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "File exceeds 2MB limit" }, { status: 400 });
    }

    // We use the service role key to bypass RLS for storage
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
       return NextResponse.json({ error: "Storage configuration missing" }, { status: 500 });
    }

    const serviceClient = createServiceClient(supabaseUrl, serviceKey);

    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const filePath = `${user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await serviceClient.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json({ error: "Failed to upload to storage" }, { status: 500 });
    }

    // Get the public URL for the newly uploaded avatar
    const { data: publicData } = serviceClient.storage
      .from('avatars')
      .getPublicUrl(filePath);

    const avatarUrl = publicData.publicUrl;

    // Update the profile table for this user with the new avatar URL
    // We use service client to ensure it bypasses any restrictive RLS
    const { error: profileUpdateError } = await serviceClient
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', user.id);

    if (profileUpdateError) {
      console.error("Profile update error:", profileUpdateError);
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }

    return NextResponse.json({ url: avatarUrl });
  } catch (error: any) {
    console.error("Avatar API err:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
