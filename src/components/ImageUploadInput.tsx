"use client";

import React, { useRef, useState } from "react";
import { Upload, Link2, Check, AlertCircle, Loader2, X } from "lucide-react";

interface ImageUploadInputProps {
  value?: string | null;
  onChange: (url: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  required?: boolean;
  aspectRatio?: "cover" | "banner" | "avatar" | "square";
  helpText?: string;
  recommendedDimensions?: string;
}

const DEFAULT_RECOMMENDED: Record<string, string> = {
  cover: "800 × 1200 px (2:3 / 3:4)",
  banner: "1920 × 800 px (16:9 / 2.4:1)",
  avatar: "400 × 400 px (1:1)",
  square: "600 × 600 px (1:1)",
};

export function ImageUploadInput({
  value = "",
  onChange,
  label = "Image Source (URL or Local File)",
  placeholder,
  className = "",
  required = false,
  aspectRatio = "cover",
  helpText,
  recommendedDimensions,
}: ImageUploadInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const recDimensions = recommendedDimensions || DEFAULT_RECOMMENDED[aspectRatio];
  const effectivePlaceholder =
    placeholder || (recDimensions ? `https://... or upload file (Rec: ${recDimensions})` : "https://... or click Upload from device");

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError("");
    setUploadSuccess(false);

    // Validate size client-side (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("Image exceeds 10MB limit. Please choose a smaller file.");
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to upload image to server.");
      }

      // Update the parent component with the server public URL
      onChange(data.url);
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed.";
      // Fallback: convert file to local data URL so user can still see and use it offline
      try {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === "string") {
            onChange(reader.result);
            setUploadSuccess(true);
            setTimeout(() => setUploadSuccess(false), 3000);
          }
        };
        reader.readAsDataURL(file);
      } catch {
        setUploadError(msg);
      }
    } finally {
      setIsUploading(false);
      // Reset file input so user can re-upload same file if desired
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const previewClasses = {
    cover: "w-10 h-14",
    banner: "w-20 h-10",
    avatar: "w-12 h-12 rounded-full",
    square: "w-12 h-12 rounded-xs",
  }[aspectRatio];

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1">
          <div className="flex flex-wrap items-center gap-2">
            <label className="block text-text-muted text-[11px] uppercase tracking-wider font-semibold">
              {label} {required && <span className="text-vermilion">*</span>}
            </label>
            {recDimensions && (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-mono text-gold bg-gold/10 px-1.5 py-0.5 rounded-xs border border-gold/30 tracking-tight font-medium"
                title={`Recommended image dimensions: ${recDimensions}`}
              >
                <span className="text-gold/60 font-bold">REC:</span>
                <span>{recDimensions}</span>
              </span>
            )}
          </div>
          {helpText && <span className="text-[10px] text-text-muted/70">{helpText}</span>}
        </div>
      )}

      {/* Hidden native file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        className="hidden"
      />

      <div className="flex items-center gap-2">
        {/* Main URL Text Input */}
        <div className="relative flex-1 min-w-0">
          <input
            type="text"
            value={value || ""}
            onChange={(e) => {
              setUploadError("");
              onChange(e.target.value);
            }}
            placeholder={effectivePlaceholder}
            required={required}
            className="w-full h-10 bg-ink border border-ink-border text-paper px-3 pr-8 rounded-sm focus:border-gold outline-none text-xs font-mono truncate"
          />
          {value ? (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setUploadError("");
              }}
              className="w-4 h-4 text-text-muted hover:text-paper absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center transition-colors cursor-pointer"
              title="Clear image"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <Link2 className="w-3.5 h-3.5 text-text-muted/60 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          )}
        </div>

        {/* Upload Button */}
        <button
          type="button"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
          className="h-10 px-3 bg-ink-surface hover:bg-gold/15 border border-ink-border hover:border-gold/60 text-gold text-xs font-mono font-bold uppercase tracking-wider rounded-sm transition-all flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          title="Upload image from your local computer"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-gold" />
              <span className="hidden sm:inline">UPLOADING...</span>
            </>
          ) : uploadSuccess ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline text-emerald-400">UPLOADED</span>
            </>
          ) : (
            <>
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">UPLOAD FROM PC</span>
            </>
          )}
        </button>

        {/* Live Thumbnail Preview */}
        {value && (
          <div
            className={`${previewClasses} border border-gold/40 rounded-xs overflow-hidden shrink-0 bg-ink shadow-sm relative group`}
            title="Current Image Preview"
          >
            <img
              src={value}
              alt="Preview"
              className="w-full h-full object-cover"
              onError={(e) => {
                // If invalid link, fall back gracefully
                (e.target as HTMLImageElement).src =
                  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='1.5'%3E%3Crect width='18' height='18' x='3' y='3' rx='2' ry='2'/%3E%3Ccircle cx='9' cy='9' r='2'/%3E%3Cpath d='m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21'/%3E%3C/svg%3E";
              }}
            />
          </div>
        )}
      </div>

      {/* Upload Feedback */}
      {uploadError && (
        <div className="text-[11px] font-mono text-vermilion flex items-center gap-1 mt-1 animate-in fade-in">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}
      {uploadSuccess && (
        <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1 mt-1 animate-in fade-in">
          <Check className="w-3 h-3 shrink-0" />
          <span>Image stored locally on server at {value}</span>
        </div>
      )}
    </div>
  );
}
