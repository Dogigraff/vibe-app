"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export type JoinStatus = "none" | "pending" | "joined";

interface JoinVibeButtonProps {
  vibeId: string;
  currentUserId: string;
  initialStatus: JoinStatus;
}

export function JoinVibeButton({ vibeId, currentUserId, initialStatus }: JoinVibeButtonProps) {
  const [status, setStatus] = useState<JoinStatus>(initialStatus);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleJoin = async () => {
    if (status !== "none") return;

    setStatus("pending"); // Optimistic update
    
    startTransition(async () => {
      try {
        const response = await fetch("/api/vibes/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vibeId }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          // Если сервер отвечает, что пользователь уже там
          if (response.status === 409 && data.error === "already_joined") {
            setStatus("joined");
          } else {
            // На любую другую ошибку — откат состояния
            setStatus("none"); 
          }
          return;
        }

        // Если успешно, оставляем в pending (создатель должен одобрить)
        setStatus("pending");
        router.refresh();
      } catch (error) {
        // При ошибке сети тоже откатываем статус
        setStatus("none");
      }
    });
  };

  if (status === "joined") {
    return (
      <button
        disabled
        className="flex h-11 px-6 items-center justify-center rounded-xl font-semibold bg-emerald-500 text-white cursor-not-allowed opacity-90 transition-all"
      >
        Я здесь 🎉
      </button>
    );
  }

  if (status === "pending" || isPending) {
    return (
      <button
        disabled
        className="flex h-11 px-6 items-center justify-center rounded-xl font-semibold bg-zinc-200 text-zinc-500 cursor-wait transition-all dark:bg-zinc-800 dark:text-zinc-400"
      >
        Ожидаю... ⏳
      </button>
    );
  }

  return (
    <button
      onClick={handleJoin}
      className="flex h-11 px-6 items-center justify-center rounded-xl font-semibold bg-violet-600 text-white hover:bg-violet-700 active:scale-95 transition-all shadow-md hover:shadow-lg"
    >
      Стучусь 🚪
    </button>
  );
}
