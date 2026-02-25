import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createHash } from "crypto";

const DEV_MOCK_EMAIL = "dev_mock@vibe.app";

function deriveDevMockPassword(secret: string): string {
  return createHash("sha256")
    .update(`${DEV_MOCK_EMAIL}${secret}`)
    .digest("hex");
}

export async function POST() {
  if (process.env.NEXT_PUBLIC_DEV_TG_MOCK !== "true") {
    return NextResponse.json(
      { error: "Dev mock login is disabled" },
      { status: 403 }
    );
  }

  const secret = process.env.TELEGRAM_AUTH_SECRET;
  if (!secret || secret.trim().length === 0) {
    return NextResponse.json(
      { error: "TELEGRAM_AUTH_SECRET is required for dev mock" },
      { status: 500 }
    );
  }

  const supabase = await createClient();
  const password = deriveDevMockPassword(secret);

  const { data: signInData, error: signInError } =
    await supabase.auth.signInWithPassword({
      email: DEV_MOCK_EMAIL,
      password,
    });

  if (!signInError) {
    return NextResponse.json({
      ok: true,
      user: signInData.user?.id,
    });
  }

  if (
    signInError.message?.toLowerCase().includes("email not confirmed") ||
    signInError.message?.includes("Email not confirmed")
  ) {
    try {
      const admin = createAdminClient();
      const { data: listData } = await admin.auth.admin.listUsers({
        perPage: 100,
      });
      const user = listData?.users?.find((u) => u.email === DEV_MOCK_EMAIL);
      if (user?.id) {
        await admin.auth.admin.updateUserById(user.id, { email_confirm: true });
        const { data: retryData, error: retryError } =
          await supabase.auth.signInWithPassword({
            email: DEV_MOCK_EMAIL,
            password,
          });
        if (!retryError) {
          return NextResponse.json({
            ok: true,
            user: retryData.user?.id,
          });
        }
      }
    } catch (adminErr) {
      const msg = adminErr instanceof Error ? adminErr.message : "Admin error";
      return NextResponse.json(
        { error: `Dev mock: ${msg}. Add SUPABASE_SERVICE_ROLE_KEY to .env` },
        { status: 500 }
      );
    }
  }

  if (signInError.message?.includes("Invalid login credentials")) {
    const { error: signUpError } = await supabase.auth.signUp({
      email: DEV_MOCK_EMAIL,
      password,
      options: {
        data: {
          telegram_id: 0,
          telegram_username: "dev_mock",
          telegram_first_name: "Dev",
          telegram_last_name: "Mock",
        },
      },
    });

    if (signUpError) {
      return NextResponse.json(
        { error: signUpError.message },
        { status: 500 }
      );
    }

    const { data: retryData, error: retryError } =
      await supabase.auth.signInWithPassword({
        email: DEV_MOCK_EMAIL,
        password,
      });

    if (retryError) {
      return NextResponse.json(
        { error: retryError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      user: retryData.user?.id,
    });
  }

  return NextResponse.json(
    { error: signInError.message },
    { status: 500 }
  );
}
