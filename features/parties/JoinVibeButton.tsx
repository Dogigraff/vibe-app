"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

type RequestStatus = "idle" | "loading" | "pending" | "member" | "rejected" | "error";

interface JoinVibeButtonProps {
    partyId: string;
    hostId: string;
    currentUserId?: string;
}

export function JoinVibeButton({ partyId, hostId, currentUserId }: JoinVibeButtonProps) {
    const [status, setStatus] = useState<RequestStatus>("idle");
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Check existing status on mount
    useEffect(() => {
        if (!currentUserId || currentUserId === hostId) return;

        fetch(`/api/parties/request?party_id=${partyId}`, {
            credentials: "include",
        })
            .then(async (res) => {
                if (!res.ok) return;
                const data = (await res.json()) as {
                    is_member: boolean;
                    role: string | null;
                    request: { status: string } | null;
                };
                if (data.is_member) {
                    setStatus("member");
                } else if (data.request?.status === "pending") {
                    setStatus("pending");
                } else if (data.request?.status === "rejected") {
                    setStatus("rejected");
                }
            })
            .catch(() => {
                // Silent fail on status check
            });
    }, [partyId, hostId, currentUserId]);

    const handleJoin = useCallback(async () => {
        setStatus("loading");
        setErrorMsg(null);

        try {
            const res = await fetch("/api/parties/request", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ party_id: partyId }),
            });
            const data = (await res.json()) as {
                ok?: boolean;
                error?: string;
                request_status?: string;
            };

            if (res.status === 409) {
                if (data.request_status === "pending") setStatus("pending");
                else if (data.error === "Already a member") setStatus("member");
                else setStatus("rejected");
                return;
            }

            if (!res.ok) {
                setStatus("error");
                setErrorMsg(data.error || "Ошибка");
                return;
            }

            setStatus("pending");
        } catch {
            setStatus("error");
            setErrorMsg("Ошибка сети");
        }
    }, [partyId]);

    // Don't show button if user is the host
    if (currentUserId === hostId) return null;

    const variants = {
        initial: { scale: 0.95, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        exit: { scale: 0.95, opacity: 0 },
    };

    return (
        <AnimatePresence mode="wait">
            {status === "idle" && (
                <motion.div key="idle" variants={variants} initial="initial" animate="animate" exit="exit">
                    <Button
                        size="sm"
                        onClick={handleJoin}
                        className="w-full"
                        aria-label="Присоединиться к вайбу"
                    >
                        🚪 Стучусь
                    </Button>
                </motion.div>
            )}
            {status === "loading" && (
                <motion.div key="loading" variants={variants} initial="initial" animate="animate" exit="exit">
                    <Button size="sm" disabled className="w-full">
                        <div className="mr-2 h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
                        Отправка…
                    </Button>
                </motion.div>
            )}
            {status === "pending" && (
                <motion.div key="pending" variants={variants} initial="initial" animate="animate" exit="exit">
                    <div className="rounded-md bg-yellow-500/10 px-3 py-2 text-center text-xs font-medium text-yellow-600">
                        ⏳ Запрос отправлен
                    </div>
                </motion.div>
            )}
            {status === "member" && (
                <motion.div key="member" variants={variants} initial="initial" animate="animate" exit="exit">
                    <div className="rounded-md bg-green-500/10 px-3 py-2 text-center text-xs font-medium text-green-600">
                        ✅ Вы участник
                    </div>
                </motion.div>
            )}
            {status === "rejected" && (
                <motion.div key="rejected" variants={variants} initial="initial" animate="animate" exit="exit">
                    <div className="rounded-md bg-red-500/10 px-3 py-2 text-center text-xs font-medium text-red-600">
                        ❌ Запрос отклонён
                    </div>
                </motion.div>
            )}
            {status === "error" && (
                <motion.div key="error" variants={variants} initial="initial" animate="animate" exit="exit">
                    <div className="space-y-1">
                        <div className="rounded-md bg-destructive/10 px-3 py-2 text-center text-xs text-destructive">
                            {errorMsg || "Ошибка"}
                        </div>
                        <Button size="sm" variant="outline" onClick={handleJoin} className="w-full text-xs">
                            Повторить
                        </Button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
