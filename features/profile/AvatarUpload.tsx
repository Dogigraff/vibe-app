"use client";

import { useState, useRef } from "react";
import { Camera } from "lucide-react";

interface AvatarUploadProps {
  currentUrl: string | null;
  username: string;
  onSuccess: (url: string) => void;
  disabled?: boolean;
}

export function AvatarUpload({
  currentUrl,
  username,
  onSuccess,
  disabled = false,
}: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [imgError, setImgError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert("Размер файла не должен превышать 2 МБ.");
      return;
    }

    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Ошибка загрузки");
      }

      setImgError(false);
      onSuccess(data.url);
    } catch (err: any) {
      alert(err.message || "Не удалось загрузить фото");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const initial = username ? username.charAt(0).toUpperCase() : "V";

  return (
    <div className="relative group w-[7.5rem] h-[7.5rem]">
      {currentUrl && !imgError ? (
        <img
          src={currentUrl}
          alt={username || "Avatar"}
          onError={() => setImgError(true)}
          className={`h-[7.5rem] w-[7.5rem] rounded-full border-2 border-primary object-cover shadow-lg transition-opacity ${
            uploading ? "opacity-50" : disabled ? "" : "group-hover:opacity-80"
          }`}
        />
      ) : (
        <div
          className={`flex h-[7.5rem] w-[7.5rem] items-center justify-center rounded-full border-2 border-primary bg-gradient-to-br from-violet-500/10 to-blue-500/10 shadow-lg transition-opacity ${
            uploading ? "opacity-50" : disabled ? "" : "group-hover:opacity-80"
          }`}
        >
          <span className="text-3xl font-bold text-primary">{initial}</span>
        </div>
      )}

      {/* Очевидная иконка фотоаппарата снизу справа */}
      {!disabled && (
        <div className="absolute bottom-0 right-0 z-20 rounded-full bg-primary p-2 text-primary-foreground shadow-lg border-2 border-background">
          <Camera className="h-4 w-4" />
        </div>
      )}

      {/* Убрали старый Editing overlay icon с hover, он не нужен на смартфонах */}

      {/* Uploading loader */}
      {uploading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
        </div>
      )}

      {/* Native file input overlaid on top */}
      {!disabled && !uploading && (
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          aria-label="Загрузить аватар"
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0 z-40"
          title="Изменить фото профиля"
        />
      )}
    </div>
  );
}
