"use client";

import { User, Star, Tag, Shield, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";
import type { Profile } from "@/types/db";

interface ProfileViewProps {
    profile: Profile | null;
    userId: string;
}

function ReputationBadge({ reputation }: { reputation: number }) {
    if (reputation >= 50) return <Shield className="h-4 w-4 text-green-500" aria-label="Trusted" />;
    if (reputation >= 20) return <Star className="h-4 w-4 text-yellow-500" aria-label="Active" />;
    if (reputation < 5) return <ShieldAlert className="h-4 w-4 text-red-500" aria-label="Low reputation" />;
    return <Star className="h-4 w-4 text-muted-foreground" aria-label="Neutral" />;
}

export function ProfileView({ profile, userId }: ProfileViewProps) {
    if (!profile) {
        return (
            <div className="flex flex-col items-center justify-center p-6">
                <p className="text-center text-muted-foreground">
                    Профиль не найден. Попробуйте войти снова.
                </p>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mx-auto max-w-md space-y-6 p-6"
        >
            {/* Avatar & Username */}
            <div className="flex flex-col items-center gap-3">
                {profile.avatar_url ? (
                    <img
                        src={profile.avatar_url}
                        alt={profile.username || "Avatar"}
                        className="h-20 w-20 rounded-full border-2 border-primary object-cover"
                    />
                ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-muted bg-muted">
                        <User className="h-10 w-10 text-muted-foreground" />
                    </div>
                )}
                <h2 className="text-xl font-bold">{profile.username || "Без имени"}</h2>
            </div>

            {/* Reputation */}
            <div className="flex items-center justify-center gap-2 rounded-lg border bg-muted/50 p-3">
                <ReputationBadge reputation={profile.reputation} />
                <span className="text-sm font-medium">Репутация: {profile.reputation}</span>
            </div>

            {/* Bio */}
            {profile.bio && (
                <div className="rounded-lg border p-4">
                    <p className="text-sm font-medium text-muted-foreground">О себе</p>
                    <p className="mt-1 text-sm">{profile.bio}</p>
                </div>
            )}

            {/* Tags */}
            {profile.tags && profile.tags.length > 0 && (
                <div className="rounded-lg border p-4">
                    <div className="mb-2 flex items-center gap-1">
                        <Tag className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm font-medium text-muted-foreground">Интересы</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {profile.tags.map((tag) => (
                            <span
                                key={tag}
                                className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Verification badge */}
            {profile.is_verified && (
                <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 p-3">
                    <Shield className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium text-green-500">Верифицирован</span>
                </div>
            )}

            {/* User ID for debugging in dev */}
            <p className="text-center text-xs text-muted-foreground/50">id: {userId}</p>
        </motion.div>
    );
}
