import { useRef, useState } from "react";
import { toast } from "sonner";

export type FeaturedImage = {
  image: string;
  imagePublicId: string;
};

export function useEventImageUpload() {
  const [featuredImage, setFeaturedImage] = useState<FeaturedImage | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const uploadImage = async (file: File) => {
    setIsUploading(true);
    try {
      const sigRes = await fetch("/api/upload-signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder: "events" }),
      });
      const sig = await sigRes.json();
      if (!sig.success) {
        toast.error(sig.message || "Failed to get upload signature");
        return;
      }

      const fd = new FormData();
      fd.append("file", file);
      fd.append("api_key", sig.apiKey);
      fd.append("timestamp", sig.timestamp);
      fd.append("signature", sig.signature);
      fd.append("upload_preset", sig.uploadPreset);
      fd.append("folder", sig.folder);
      if (sig.eager) fd.append("eager", sig.eager);
      if (sig.responsive_breakpoints)
        fd.append("responsive_breakpoints", sig.responsive_breakpoints);

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`,
        { method: "POST", body: fd },
      );
      const result = await uploadRes.json();
      if (!result.secure_url) {
        toast.error(result.error?.message || "Upload failed");
        return;
      }
      setFeaturedImage({
        image: result.secure_url,
        imagePublicId: result.public_id,
      });
      toast.success("Featured image uploaded");
    } catch {
      toast.error("An error occurred during upload");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void uploadImage(file);
    e.target.value = "";
  };

  return {
    featuredImage,
    setFeaturedImage,
    isUploading,
    uploadImage,
    handleFileChange,
    imageInputRef,
  };
}
