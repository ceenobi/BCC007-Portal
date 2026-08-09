import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useFetcher, useOutletContext } from "react-router";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { useFileUpload } from "~/hooks/useFileUpload";
import { getOptimizedImageUrl } from "~/lib/cloudinary";
import { updateUserAvatarSchema } from "~/lib/schema";
import { cn } from "~/lib/utils";
import type { SessionUser, UpdateUserAvatarSchemaType } from "~/types";

export default function UploadAvatar() {
  const { user } = useOutletContext() as { user: SessionUser };
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastUploadedRef = useRef<{
    image: string;
    imagePublicId: string;
  } | null>(null);
  const fetcher = useFetcher();

  const {
    selectedFiles: imagePreview,
    setSelectedFiles: setImagePreview,
    handleFiles: handleImageUpload,
  } = useFileUpload({
    limit: 1,
    size: 2,
  });

  const form = useForm<UpdateUserAvatarSchemaType>({
    resolver: zodResolver(updateUserAvatarSchema),
    defaultValues: {
      image: "",
      imagePublicId: "",
    },
  });

  const actionData = fetcher.data as
    { success?: boolean; message?: string } | undefined;

  useEffect(() => {
    if (!actionData) return;

    if (actionData.success) {
      toast.success("Avatar updated");
      form.reset();
      setPreviewUrl(null);
      setImagePreview([]);
      lastUploadedRef.current = null;
    } else {
      // Server rejected → rollback Cloudinary upload
      const publicId = lastUploadedRef.current?.imagePublicId;
      if (publicId) {
        fetch("/api/delete-media", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publicIds: [publicId] }),
        });
      }
      toast.error(actionData.message || "Failed to update avatar");
      lastUploadedRef.current = null;
      setPreviewUrl(null);
      setImagePreview([]);
    }
  }, [actionData, form, setImagePreview]);

  useEffect(() => {
    if (imagePreview.length === 0 || isUploading) return;
    setIsUploading(true);

    const uploadAndSubmit = async () => {
      try {
        const sigResponse = await fetch("/api/upload-signature", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folder: "avatars" }),
        });
        const sigResult = await sigResponse.json();

        if (!sigResult.success) {
          toast.error(sigResult.message || "Failed to get upload signature");
          return;
        }

        const fileToUpload = imagePreview[0].file;
        const formData = new FormData();
        formData.append("file", fileToUpload);
        formData.append("api_key", sigResult.apiKey);
        formData.append("timestamp", sigResult.timestamp);
        formData.append("signature", sigResult.signature);
        formData.append("upload_preset", sigResult.uploadPreset);
        formData.append("folder", sigResult.folder);

        if (sigResult.eager) formData.append("eager", sigResult.eager);
        if (sigResult.responsive_breakpoints) {
          formData.append(
            "responsive_breakpoints",
            sigResult.responsive_breakpoints,
          );
        }

        const uploadResponse = await fetch(
          `https://api.cloudinary.com/v1_1/${sigResult.cloudName}/image/upload`,
          { method: "POST", body: formData },
        );
        const uploadResult = await uploadResponse.json();

        if (!uploadResult.secure_url) {
          toast.error(uploadResult.error?.message || "Upload failed");
          return;
        }

        const newImage = {
          image: uploadResult.secure_url,
          imagePublicId: uploadResult.public_id,
        };

        lastUploadedRef.current = newImage;
        form.setValue("image", newImage.image, { shouldValidate: true });
        form.setValue("imagePublicId", newImage.imagePublicId, {
          shouldValidate: true,
        });

        fetcher.submit(
          { ...newImage, intent: "upload-avatar" },
          {
            method: "post",
            encType: "application/json",
            action: "/dashboard/settings",
          },
        );
      } catch {
        toast.error("An error occurred during upload");
      } finally {
        setIsUploading(false);
        setImagePreview([]);
      }
    };

    uploadAndSubmit();
  }, [imagePreview]);

  const handleFileSelect = () => {
    inputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
      handleImageUpload(e);
    }
  };

  const handleDeleteExisting = async () => {
    if (!user.imagePublicId) return;
    setIsDeleting(true);
    try {
      const response = await fetch("/api/delete-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicIds: [user.imagePublicId] }),
      });
      const result = await response.json();

      if (result.success) {
        fetcher.submit(
          { image: "", imagePublicId: "", intent: "upload-avatar" },
          { method: "post", encType: "application/json", action: "/settings" },
        );
      } else {
        toast.error(result.message || "Failed to delete image");
      }
    } catch {
      toast.error("An error occurred during deletion");
    } finally {
      setIsDeleting(false);
    }
  };

  const busy = isUploading || fetcher.state !== "idle";

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold leading-snug text-mainBlack dark:text-white">
        Avatar
      </h2>
      <Card className="dark:bg-lightGray">
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar
                size="lg"
                className={cn(
                  "size-20 ring-2 ring-offset-2 ring-border",
                  busy && "opacity-50",
                )}
              >
                <AvatarImage
                  src={
                    previewUrl ||
                    getOptimizedImageUrl(user.image, 80) ||
                    undefined
                  }
                  alt={user.name || ""}
                />
                <AvatarFallback className="text-xl">
                  {user.name?.charAt(0)?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              {busy && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="size-5 border-2 border-lightBlue border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={handleFileChange}
                disabled={busy}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleFileSelect}
                disabled={busy}
              >
                {busy ? "Saving…" : "Upload Photo"}
              </Button>
              {!previewUrl && user.image && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteExisting}
                  disabled={busy || isDeleting}
                  className="block"
                >
                  {isDeleting ? "Removing…" : "Remove"}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
