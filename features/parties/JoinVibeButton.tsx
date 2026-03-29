"use client";

import { useState, useEffect, useCallback } from "react";
import { Smartphone } from "lucide-react";
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
        initial: { scale: 0.97, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        exit: { scale: 0.97, opacity: 0 },
    };

    const primaryClass =
        "w-full min-h-[52px] gap-2 rounded-2xl text-base font-semibold shadow-vibe-accent transition-transform duration-vibe ease-vibe-out active:scale-[0.98]";

    return (
        <AnimatePresence mode="wait">
            {status === "idle" && (
                <motion.div key="idle" variants={variants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.25, ease: [0.33, 1, 0.68, 1] }}>
                    <Button
                        size="lg"
                        onClick={handleJoin}
                        className={primaryClass}
                        aria-label="Присоединиться к вайбу"
                    >
                        <Smartphone className="h-5 w-5 shrink-0 opacity-95" aria-hidden />
                        Присоединиться
                    </Button>
                </motion.div>
            )}
            {status === "loading" && (
                <motion.div key="loading" variants={variants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.25, ease: [0.33, 1, 0.68, 1] }}>
                    <Button size="lg" disabled className={primaryClass}>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Отправка…
                    </Button>
                </motion.div>
            )}
            {status === "pending" && (
                <motion.div key="pending" variants={variants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.25, ease: [0.33, 1, 0.68, 1] }}>
                    <div className="rounded-2xl border border-yellow-500/25 bg-yellow-500/10 px-4 py-3 text-center text-sm font-medium text-yellow-500/95">
                        Запрос отправлен
                    </div>
                </motion.div>
            )}
            {status === "member" && (
                <motion.div key="member" variants={variants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.25, ease: [0.33, 1, 0.68, 1] }}>
                    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-center text-sm font-medium text-emerald-400">
                        Вы в вайбе
                    </div>
                </motion.div>
            )}
            {status === "rejected" && (
                <motion.div key="rejected" variants={variants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.25, ease: [0.33, 1, 0.68, 1] }}>
                    <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-center text-sm font-medium text-red-400">
                        Запрос отклонён
                    </div>
                </motion.div>
            )}
            {status === "error" && (
                <motion.div key="error" variants={variants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.25, ease: [0.33, 1, 0.68, 1] }}>
                    <div className="space-y-2">
                        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-center text-sm text-destructive">
                            {errorMsg || "Ошибка"}
                        </div>
                        <Button variant="outline" onClick={handleJoin} className="w-full min-h-11 rounded-2xl text-sm">
                            Повторить
                        </Button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
