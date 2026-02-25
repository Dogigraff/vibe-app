import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RequestBody {
    party_id: string;
}

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
        if (
            typeof body !== "object" ||
            body === null ||
            typeof (body as RequestBody).party_id !== "string"
        ) {
            return NextResponse.json(
                { error: "party_id is required" },
                { status: 400 }
            );
        }

        const { party_id } = body as RequestBody;

        // Check if party exists and is active
        const { data: party, error: partyError } = await supabase
            .schema("public")
            .from("parties")
            .select("id, host_id, status, max_guests")
            .eq("id", party_id)
            .single();

        if (partyError || !party) {
            return NextResponse.json(
                { error: "Party not found" },
                { status: 404 }
            );
        }

        if (party.status !== "active") {
            return NextResponse.json(
                { error: "Party is no longer active" },
                { status: 400 }
            );
        }

        if (party.host_id === user.id) {
            return NextResponse.json(
                { error: "You are the host of this party" },
                { status: 400 }
            );
        }

        // Check if already a member
        const { data: existingMember } = await supabase
            .schema("public")
            .from("party_members")
            .select("id")
            .eq("party_id", party_id)
            .eq("user_id", user.id)
            .maybeSingle();

        if (existingMember) {
            return NextResponse.json(
                { error: "Already a member", status: "member" },
                { status: 409 }
            );
        }

        // Check if already has a pending request
        const { data: existingRequest } = await supabase
            .schema("public")
            .from("party_requests")
            .select("id, status")
            .eq("party_id", party_id)
            .eq("user_id", user.id)
            .maybeSingle();

        if (existingRequest) {
            return NextResponse.json(
                {
                    error:
                        existingRequest.status === "pending"
                            ? "Request already pending"
                            : "Request was rejected",
                    request_status: existingRequest.status,
                },
                { status: 409 }
            );
        }

        // Create the request
        const { data: newRequest, error: insertError } = await supabase
            .schema("public")
            .from("party_requests")
            .insert({
                party_id,
                user_id: user.id,
                status: "pending",
            })
            .select("id, status, created_at")
            .single();

        if (insertError) {
            return NextResponse.json(
                { error: insertError.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            ok: true,
            request: newRequest,
        });
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

        if (!partyId) {
            return NextResponse.json(
                { error: "party_id is required" },
                { status: 400 }
            );
        }

        // Check user's own request status for this party
        const { data: myRequest } = await supabase
            .schema("public")
            .from("party_requests")
            .select("id,status,created_at")
            .eq("party_id", partyId)
            .eq("user_id", user.id)
            .maybeSingle();

        // Check if already a member
        const { data: membership } = await supabase
            .schema("public")
            .from("party_members")
            .select("id,role")
            .eq("party_id", partyId)
            .eq("user_id", user.id)
            .maybeSingle();

        return NextResponse.json({
            is_member: !!membership,
            role: membership?.role ?? null,
            request: myRequest ?? null,
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
