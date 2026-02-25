import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const VALID_TARGET_TYPES = ["user", "party"] as const;
type TargetType = (typeof VALID_TARGET_TYPES)[number];

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = (await request.json()) as unknown;
        if (typeof body !== "object" || body === null) {
            return NextResponse.json({ error: "Invalid body" }, { status: 400 });
        }

        const b = body as Record<string, unknown>;
        const reportedId = b.reported_id;
        const reason = b.reason;
        const targetType = (b.target_type as string) || "user";

        if (typeof reportedId !== "string" || reportedId.length === 0) {
            return NextResponse.json(
                { error: "reported_id is required" },
                { status: 400 }
            );
        }

        if (!VALID_TARGET_TYPES.includes(targetType as TargetType)) {
            return NextResponse.json(
                { error: "target_type must be 'user' or 'party'" },
                { status: 400 }
            );
        }

        if (reportedId === user.id) {
            return NextResponse.json(
                { error: "Cannot report yourself" },
                { status: 400 }
            );
        }

        // Insert report — UNIQUE constraint (reporter_id, target_type, reported_id)
        // handles duplicates at DB level
        const { data: report, error: insertError } = await supabase
            .schema("public")
            .from("reports")
            .insert({
                reporter_id: user.id,
                reported_id: reportedId,
                target_type: targetType,
                reason: typeof reason === "string" ? reason.slice(0, 500) : null,
                status: "pending",
            })
            .select("id, status")
            .single();

        if (insertError) {
            // Unique constraint violation = already reported
            if (insertError.code === "23505") {
                return NextResponse.json(
                    { error: "Already reported" },
                    { status: 409 }
                );
            }
            return NextResponse.json(
                { error: insertError.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ ok: true, report });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
