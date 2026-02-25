import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Max ciphertext payload size in characters (base64) */
const MAX_CIPHERTEXT_LENGTH = 8192;

/** Rate limit config from env with sane defaults */
const RATE_WINDOW_S = Number(process.env.RATE_LIMIT_MESSAGES_WINDOW_S || "10");
const RATE_MAX = Number(process.env.RATE_LIMIT_MESSAGES_MAX || "5");

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // --- Atomic Postgres rate limit ---
        const { data: allowed, error: rlError } = await (supabase.schema("public") as any).rpc(
            "allow_action",
            {
                p_user_id: user.id,
                p_action: "send_message",
                p_window_s: RATE_WINDOW_S,
                p_max_count: RATE_MAX,
            }
        );

        if (rlError) {
            console.error("Rate limit RPC error:", rlError.message);
            // Fail-closed in production: block messages when rate limiter is down
            if (process.env.NODE_ENV === "production") {
                return NextResponse.json(
                    { error: "rate_limit_unavailable" },
                    { status: 503 }
                );
            }
            // Fail-open in development only
        } else if (allowed === false) {
            return NextResponse.json(
                { error: "Too many messages. Wait a few seconds." },
                { status: 429 }
            );
        }

        const body = (await request.json()) as unknown;
        if (typeof body !== "object" || body === null) {
            return NextResponse.json({ error: "Invalid body" }, { status: 400 });
        }

        const b = body as Record<string, unknown>;
        const partyId = b.party_id;
        const ciphertext = b.ciphertext;
        const nonce = b.nonce;
        const e2eVersion = b.e2e_version;

        if (typeof partyId !== "string" || partyId.length === 0) {
            return NextResponse.json(
                { error: "party_id is required" },
                { status: 400 }
            );
        }

        // --- E2E validation: reject plaintext, require ciphertext ---
        if ("content" in b) {
            return NextResponse.json(
                { error: "Plaintext content field is not accepted. Use ciphertext." },
                { status: 400 }
            );
        }

        if (typeof ciphertext !== "string" || ciphertext.length === 0) {
            return NextResponse.json(
                { error: "ciphertext is required (base64)" },
                { status: 400 }
            );
        }

        if (ciphertext.length > MAX_CIPHERTEXT_LENGTH) {
            return NextResponse.json(
                { error: `ciphertext must be at most ${MAX_CIPHERTEXT_LENGTH} characters` },
                { status: 400 }
            );
        }

        if (typeof nonce !== "string" || nonce.length === 0) {
            return NextResponse.json(
                { error: "nonce is required (base64)" },
                { status: 400 }
            );
        }

        // AES-GCM IV is 12 bytes → 16 chars base64; allow some slack
        if (nonce.length < 12 || nonce.length > 32) {
            return NextResponse.json(
                { error: "nonce must be 12-32 characters (base64 of 12-byte IV)" },
                { status: 400 }
            );
        }

        if (e2eVersion !== 1) {
            return NextResponse.json(
                { error: "e2e_version must be 1" },
                { status: 400 }
            );
        }

        // Base64 format validation
        const b64Regex = /^[A-Za-z0-9+/=]+$/;
        if (!b64Regex.test(ciphertext)) {
            return NextResponse.json(
                { error: "ciphertext must be valid base64" },
                { status: 400 }
            );
        }
        if (!b64Regex.test(nonce)) {
            return NextResponse.json(
                { error: "nonce must be valid base64" },
                { status: 400 }
            );
        }

        // Check membership
        const { data: membership } = await supabase
            .schema("public")
            .from("party_members")
            .select("id")
            .eq("party_id", partyId)
            .eq("user_id", user.id)
            .maybeSingle();

        if (!membership) {
            return NextResponse.json(
                { error: "Not a member of this party" },
                { status: 403 }
            );
        }

        // Insert E2E message — no plaintext stored
        const senderDeviceId =
            typeof b.sender_device_id === "string" ? b.sender_device_id : null;

        const messagesTable = supabase.schema("public").from("messages") as any;
        const { data: msg, error: insertError } = await messagesTable
            .insert({
                party_id: partyId,
                user_id: user.id,
                ciphertext,
                nonce,
                e2e_version: 1,
                sender_device_id: senderDeviceId,
            })
            .select("id, party_id, user_id, ciphertext, nonce, e2e_version, sender_device_id, created_at")
            .single();

        if (insertError) {
            return NextResponse.json(
                { error: insertError.message },
                { status: 500 }
            );
        }

        return NextResponse.json(msg);
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const partyId = searchParams.get("party_id");
        const cursor = searchParams.get("cursor");
        const limit = Math.min(
            Number(searchParams.get("limit") || "50"),
            100
        );

        if (!partyId) {
            return NextResponse.json(
                { error: "party_id is required" },
                { status: 400 }
            );
        }

        // Check membership
        const { data: membership } = await supabase
            .schema("public")
            .from("party_members")
            .select("id")
            .eq("party_id", partyId)
            .eq("user_id", user.id)
            .maybeSingle();

        if (!membership) {
            return NextResponse.json(
                { error: "Not a member of this party" },
                { status: 403 }
            );
        }

        const msgsTable = supabase.schema("public").from("messages") as any;
        let query = msgsTable
            .select("id, party_id, user_id, ciphertext, nonce, e2e_version, sender_device_id, created_at")
            .eq("party_id", partyId)
            .order("created_at", { ascending: false })
            .limit(limit);

        if (cursor) {
            query = query.lt("created_at", cursor);
        }

        const { data, error } = await query;

        if (error) {
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            messages: data ?? [],
            has_more: (data?.length ?? 0) === limit,
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
