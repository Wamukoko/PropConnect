"use client";

import { useCallback, useState } from "react";

interface PhotoUploadProps {
  propertyId: string;
  onUploadComplete?: (photo: any) => void;
}

export function PhotoUpload({ propertyId, onUploadComplete }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleUpload = useCallback(
    async (file: File) => {
      setUploading(true);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("property_id", propertyId);

      try {
        const res = await fetch(`/api/properties/${propertyId}/photos`, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const err = await res.json();
          alert(err.error || "Upload failed");
          return;
        }

        const data = await res.json();
        onUploadComplete?.(data.photo);
      } catch {
        alert("Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [propertyId, onUploadComplete]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleUpload(file);
    },
    [handleUpload]
  );

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
        dragOver ? "border-accent bg-accent/5" : "border-gray-200"
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {uploading ? (
        <p className="text-sm text-gray-500">Uploading...</p>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-2">
            Drag and drop a photo here, or
          </p>
          <label className="inline-block">
            <span
              className="text-sm px-3 py-1.5 rounded-md text-white cursor-pointer"
              style={{ backgroundColor: "var(--color-secondary)" }}
            >
              Browse
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
              }}
            />
          </label>
          <p className="text-xs text-gray-400 mt-2">
            JPEG, PNG, or WebP. Max 10MB.
          </p>
        </>
      )}
    </div>
  );
}
