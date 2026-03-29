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
    <div
      className={`relative group ${disabled || uploading ? '' : 'cursor-pointer'}`}
      onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
    >
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

      {/* Editing overlay icon */}
      {!disabled && (
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
          <Camera className="h-6 w-6 text-white" />
        </div>
      )}

      {/* Uploading loader */}
      {uploading && (
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        aria-label="Загрузить аватар"
        className="hidden"
        disabled={disabled || uploading}
      />
    </div>
  );
}
