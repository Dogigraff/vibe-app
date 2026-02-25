"use client";

import { useState, useCallback } from "react";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface ReportButtonProps {
    reportedId: string;
    label?: string;
}

export function ReportButton({ reportedId, label = "Пожаловаться" }: ReportButtonProps) {
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState("");
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/reports", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    reported_id: reportedId,
                    reason: reason.trim() || undefined,
                }),
            });

            if (res.status === 409) {
                setDone(true);
                return;
            }

            const data = (await res.json()) as { ok?: boolean; error?: string };
            if (!res.ok) {
                setError(data.error || "Ошибка");
                return;
            }

            setDone(true);
        } catch {
            setError("Ошибка сети");
        } finally {
            setLoading(false);
        }
    }, [reportedId, reason]);

    if (done) {
        return (
            <span className="text-xs text-muted-foreground">✓ Жалоба отправлена</span>
        );
    }

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                aria-label={label}
            >
                <Flag className="h-3 w-3" />
                {label}
            </button>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Жалоба</DialogTitle>
                        <DialogDescription>
                            Опишите причину жалобы (опционально)
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <Textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Причина…"
                            rows={3}
                            maxLength={500}
                            className="resize-none"
                        />
                        {error && (
                            <p className="text-sm text-destructive">{error}</p>
                        )}
                        <div className="flex gap-2 justify-end">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setOpen(false)}
                            >
                                Отмена
                            </Button>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={handleSubmit}
                                disabled={loading}
                            >
                                {loading ? "Отправка…" : "Отправить жалобу"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
