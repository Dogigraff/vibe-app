"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Send, AlertTriangle, Lock, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

// E2E crypto imports
import {
    generateDeviceKeyPair,
    exportPublicKey,
    exportPrivateKey,
} from "@/lib/crypto/keys";
import {
    generateRoomKey,
    exportRoomKey,
    importRoomKey,
    sealRoomKey,
    unsealRoomKey,
} from "@/lib/crypto/room-key";
import { encryptMessage, decryptMessage } from "@/lib/crypto/message";
import {
    getStoredDeviceKey,
    storeDeviceKey,
    getStoredRoomKey,
    storeRoomKey as storeRoomKeyLocal,
    type StoredDeviceKey,
} from "@/lib/crypto/store";

// --- Types ---
interface WireMessage {
    id: string;
    party_id: string;
    user_id: string;
    ciphertext: string | null;
    nonce: string | null;
    e2e_version: number;
    sender_device_id: string | null;
    created_at: string;
}

interface DecryptedMessage {
    id: string;
    party_id: string;
    user_id: string;
    plaintext: string | null; // null = cannot decrypt
    created_at: string;
    decryptFailed: boolean;
}

interface PartyChatProps {
    partyId: string;
    currentUserId: string;
}

// --- Component ---
export function PartyChat({ partyId, currentUserId }: PartyChatProps) {
    const [messages, setMessages] = useState<DecryptedMessage[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [rateLimited, setRateLimited] = useState(false);
    const [e2eReady, setE2eReady] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Crypto state refs (non-reactive to avoid re-renders)
    const deviceKeyRef = useRef<StoredDeviceKey | null>(null);
    const roomKeyRef = useRef<CryptoKey | null>(null);

    // --- E2E Setup ---
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                // 1. Load or generate device keypair
                let device = await getStoredDeviceKey();
                const supabase = createClient();
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const pub = supabase.schema("public") as any;

                if (!device) {
                    // No local device key — check if server already has one for this user+label
                    const { data: existingDevice } = await pub
                        .from("user_devices")
                        .select("id, public_key_spki")
                        .eq("user_id", currentUserId)
                        .eq("device_label", "default")
                        .maybeSingle();

                    const kp = await generateDeviceKeyPair();
                    const pubSpki = await exportPublicKey(kp.publicKey);
                    const privPkcs8 = await exportPrivateKey(kp.privateKey);

                    if (existingDevice) {
                        // Device row exists on server — keep the id, update public key only
                        await pub
                            .from("user_devices")
                            .update({
                                public_key_spki: pubSpki,
                                updated_at: new Date().toISOString(),
                            })
                            .eq("id", existingDevice.id);

                        device = {
                            deviceId: existingDevice.id,
                            publicKeySpki: pubSpki,
                            privateKeyPkcs8: privPkcs8,
                        };
                    } else {
                        // No device exists — insert new row
                        const deviceId = crypto.randomUUID();
                        await pub.from("user_devices").insert({
                            id: deviceId,
                            user_id: currentUserId,
                            device_label: "default",
                            public_key_spki: pubSpki,
                        });

                        device = {
                            deviceId,
                            publicKeySpki: pubSpki,
                            privateKeyPkcs8: privPkcs8,
                        };
                    }
                    await storeDeviceKey(device);
                }
                deviceKeyRef.current = device;

                // 2. Load or obtain room key
                const storedRoomKeyB64 = await getStoredRoomKey(partyId);
                if (storedRoomKeyB64) {
                    roomKeyRef.current = await importRoomKey(storedRoomKeyB64);
                } else {
                    // Try to fetch sealed room key from server
                    const { data: sealed } = await pub
                        .from("party_room_keys")
                        .select("encrypted_room_key, sender_public_key_spki")
                        .eq("party_id", partyId)
                        .eq("user_id", currentUserId)
                        .maybeSingle();

                    if (sealed?.encrypted_room_key && sealed?.sender_public_key_spki) {
                        // Unseal with our private key
                        const rk = await unsealRoomKey(
                            sealed.encrypted_room_key,
                            device.privateKeyPkcs8,
                            sealed.sender_public_key_spki
                        );
                        roomKeyRef.current = rk;
                        const exported = await exportRoomKey(rk);
                        await storeRoomKeyLocal(partyId, exported);
                    } else {
                        // Generate room key (first writer wins via RPC)
                        const rk = await generateRoomKey();
                        roomKeyRef.current = rk;
                        const exported = await exportRoomKey(rk);
                        await storeRoomKeyLocal(partyId, exported);

                        // Seal for ourselves and use RPC (INSERT...ON CONFLICT DO NOTHING)
                        const selfSealed = await sealRoomKey(
                            rk,
                            device.privateKeyPkcs8,
                            device.publicKeySpki
                        );

                        await pub.rpc("ensure_party_room_key", {
                            p_party_id: partyId,
                            p_user_id: currentUserId,
                            p_encrypted_room_key: selfSealed,
                            p_sender_device_id: device.deviceId,
                            p_sender_public_key_spki: device.publicKeySpki,
                        });

                        // Distribute to other members via RPC
                        const { data: members } = await supabase
                            .schema("public")
                            .from("party_members")
                            .select("user_id")
                            .eq("party_id", partyId)
                            .neq("user_id", currentUserId);

                        if (members) {
                            for (const m of members) {
                                const { data: memberDevice } = await pub
                                    .from("user_devices")
                                    .select("public_key_spki")
                                    .eq("user_id", m.user_id)
                                    .limit(1)
                                    .maybeSingle();

                                if (memberDevice?.public_key_spki) {
                                    const sealed2 = await sealRoomKey(
                                        rk,
                                        device.privateKeyPkcs8,
                                        memberDevice.public_key_spki
                                    );
                                    await pub.rpc("ensure_party_room_key", {
                                        p_party_id: partyId,
                                        p_user_id: m.user_id,
                                        p_encrypted_room_key: sealed2,
                                        p_sender_device_id: device.deviceId,
                                        p_sender_public_key_spki: device.publicKeySpki,
                                    });
                                }
                            }
                        }

                        // Re-read our own key to check if someone else wrote first
                        const { data: finalKey } = await pub
                            .from("party_room_keys")
                            .select("encrypted_room_key, sender_public_key_spki")
                            .eq("party_id", partyId)
                            .eq("user_id", currentUserId)
                            .single();

                        if (finalKey && finalKey.encrypted_room_key !== selfSealed) {
                            // Someone else won the race — unseal THEIR key
                            const theirRk = await unsealRoomKey(
                                finalKey.encrypted_room_key,
                                device.privateKeyPkcs8,
                                finalKey.sender_public_key_spki
                            );
                            roomKeyRef.current = theirRk;
                            const exp2 = await exportRoomKey(theirRk);
                            await storeRoomKeyLocal(partyId, exp2);
                        }
                    }
                }

                if (!cancelled) setE2eReady(true);
            } catch (err) {
                console.error("E2E setup failed:", err);
                if (!cancelled) setError("E2E encryption setup failed");
            }
        })();
        return () => { cancelled = true; };
    }, [partyId, currentUserId]);

    // --- Decrypt wire messages ---
    const decryptWireMessages = useCallback(
        async (wires: WireMessage[]): Promise<DecryptedMessage[]> => {
            const rk = roomKeyRef.current;
            return Promise.all(
                wires.map(async (w) => {
                    if (!rk || !w.ciphertext || !w.nonce) {
                        return {
                            id: w.id,
                            party_id: w.party_id,
                            user_id: w.user_id,
                            plaintext: null,
                            created_at: w.created_at,
                            decryptFailed: true,
                        };
                    }
                    const pt = await decryptMessage(w.ciphertext, w.nonce, rk);
                    return {
                        id: w.id,
                        party_id: w.party_id,
                        user_id: w.user_id,
                        plaintext: pt,
                        created_at: w.created_at,
                        decryptFailed: pt === null,
                    };
                })
            );
        },
        []
    );

    // --- Load initial messages ---
    useEffect(() => {
        if (!e2eReady) return;
        setLoading(true);
        fetch(`/api/parties/messages?party_id=${partyId}`, {
            credentials: "include",
        })
            .then(async (res) => {
                if (!res.ok) {
                    const data = (await res.json()) as { error?: string };
                    setError(data.error || "Ошибка загрузки");
                    return;
                }
                const data = (await res.json()) as {
                    messages: WireMessage[];
                    has_more: boolean;
                };
                const decrypted = await decryptWireMessages(data.messages.reverse());
                setMessages(decrypted);
            })
            .catch(() => setError("Ошибка сети"))
            .finally(() => setLoading(false));
    }, [partyId, e2eReady, decryptWireMessages]);

    // --- Realtime subscription ---
    useEffect(() => {
        if (!e2eReady) return;
        const supabase = createClient();
        const channel = supabase
            .channel(`party-chat-${partyId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "messages",
                    filter: `party_id=eq.${partyId}`,
                },
                async (payload) => {
                    const wire = payload.new as WireMessage;
                    const [decrypted] = await decryptWireMessages([wire]);
                    setMessages((prev) => {
                        if (prev.some((m) => m.id === decrypted.id)) return prev;
                        return [...prev, decrypted];
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [partyId, e2eReady, decryptWireMessages]);

    // --- Auto-scroll ---
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // --- Send ---
    const handleSend = useCallback(async () => {
        const content = input.trim();
        if (!content || sending || rateLimited || !e2eReady) return;
        const rk = roomKeyRef.current;
        const dk = deviceKeyRef.current;
        if (!rk || !dk) return;

        setSending(true);
        setError(null);

        try {
            const { ciphertext, nonce } = await encryptMessage(content, rk);

            const res = await fetch("/api/parties/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    party_id: partyId,
                    ciphertext,
                    nonce,
                    e2e_version: 1,
                    sender_device_id: dk.deviceId,
                }),
            });

            if (res.status === 429) {
                setRateLimited(true);
                setTimeout(() => setRateLimited(false), 10_000);
                return;
            }

            if (!res.ok) {
                const data = (await res.json()) as { error?: string };
                setError(data.error || "Ошибка");
                return;
            }

            setInput("");
            inputRef.current?.focus();
        } catch {
            setError("Ошибка сети");
        } finally {
            setSending(false);
        }
    }, [input, sending, rateLimited, e2eReady, partyId]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
            }
        },
        [handleSend]
    );

    if (error && messages.length === 0 && !loading) {
        return (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {error}
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col">
            {/* E2E indicator */}
            <div className="flex items-center gap-1.5 border-b px-3 py-1.5 text-xs text-green-600">
                <Lock className="h-3 w-3" />
                <span>E2E шифрование {e2eReady ? "активно" : "настройка…"}</span>
            </div>

            {/* Messages area */}
            <div
                ref={scrollRef}
                className="flex-1 space-y-2 overflow-y-auto p-3"
                role="log"
                aria-label="Чат"
            >
                {(loading || !e2eReady) && (
                    <div className="flex justify-center py-4">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    </div>
                )}
                <AnimatePresence>
                    {messages.map((msg) => {
                        const isMine = msg.user_id === currentUserId;
                        return (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.15 }}
                                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                            >
                                <div
                                    className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${isMine
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted"
                                        }`}
                                >
                                    {!isMine && (
                                        <p className="mb-0.5 text-[10px] font-medium text-muted-foreground">
                                            {msg.user_id.slice(0, 8)}
                                        </p>
                                    )}
                                    {msg.decryptFailed ? (
                                        <div className="flex items-center gap-1 text-xs text-yellow-600">
                                            <ShieldAlert className="h-3 w-3" />
                                            <span>Cannot decrypt</span>
                                        </div>
                                    ) : (
                                        <p className="break-words">{msg.plaintext}</p>
                                    )}
                                    <p className="mt-0.5 text-right text-[10px] opacity-60">
                                        {new Date(msg.created_at).toLocaleTimeString("ru-RU", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </p>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
                {messages.length === 0 && !loading && e2eReady && (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                        Пока нет сообщений. Начните разговор!
                    </p>
                )}
            </div>

            {/* Rate limit warning */}
            {rateLimited && (
                <div className="bg-yellow-500/10 px-3 py-1.5 text-center text-xs text-yellow-600">
                    ⏳ Подождите несколько секунд перед следующим сообщением
                </div>
            )}

            {/* Input area */}
            <div className="flex gap-2 border-t p-3">
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Сообщение…"
                    maxLength={1000}
                    disabled={sending || rateLimited || !e2eReady}
                    aria-label="Написать сообщение"
                    className="flex-1 rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                />
                <Button
                    size="icon"
                    onClick={handleSend}
                    disabled={!input.trim() || sending || rateLimited || !e2eReady}
                    aria-label="Отправить"
                >
                    <Send className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
