import { zodResolver } from "@hookform/resolvers/zod";
import {
  RiAddFill,
  RiCloseLine,
  RiErrorWarningLine,
  RiImageAddLine,
  RiLoader2Line,
} from "@remixicon/react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useFetcher } from "react-router";
import { toast } from "sonner";
import z from "zod";
import ActionBtn from "~/components/ui/action-btn";
import { Button } from "~/components/ui/button";
import { FormBox } from "~/components/ui/form-box";
import { Label } from "~/components/ui/label";
import Modal from "~/components/ui/modal";
import { Separator } from "~/components/ui/separator";
import { useEventImageUpload } from "~/hooks/useEventImageUpload";
import { createAnnouncementSchema } from "~/lib/schema";
import type { CreateAnnouncementSchemaType } from "~/types";

export default function CreateAnnouncement() {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  // Stable per submission intent so a double-click or retried request for the
  // same intent is deduplicated server-side (never creates duplicate
  // announcements).
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() =>
    crypto.randomUUID(),
  );
  // Distinguishes a successfully-submitted image (keep it) from one staged in
  // the modal that the user cancelled/removed (orphan — delete it).
  const didSubmitRef = useRef(false);
  const {
    featuredImage,
    setFeaturedImage,
    isUploading,
    handleFileChange,
    imageInputRef,
  } = useEventImageUpload("announcements");
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state === "submitting";
  const {
    handleSubmit,
    register,
    control,
    reset,
    formState: { errors },
  } = useForm<z.input<typeof createAnnouncementSchema>, any, CreateAnnouncementSchemaType>({
    resolver: zodResolver(createAnnouncementSchema),
    mode: "onChange",
  });

  const actionData = fetcher.data as
    | { success?: boolean; message?: string }
    | undefined;

  const rootError = errors.root as
    | { message?: string }
    | Array<{ message?: string }>
    | undefined;
  const rootErrorMessage =
    (Array.isArray(rootError) ? rootError[0]?.message : rootError?.message) ??
    (errors as Record<string, { message?: string } | undefined>)[""]?.message;

  const deleteUploadedImage = async (publicId?: string) => {
    if (!publicId) return;
    try {
      await fetch("/api/delete-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicIds: [publicId] }),
      });
    } catch {
      // Best-effort cleanup; failure just leaves an unreferenced asset.
    }
  };

  const resetModal = (cleanupImage: boolean) => {
    if (cleanupImage && !didSubmitRef.current && featuredImage?.imagePublicId) {
      void deleteUploadedImage(featuredImage.imagePublicId);
    }
    didSubmitRef.current = false;
    setFeaturedImage(null);
    reset();
    setIdempotencyKey(crypto.randomUUID());
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) resetModal(true);
    setIsOpen(open);
  };

  useEffect(() => {
    if (actionData?.success) {
      didSubmitRef.current = true;
      toast.success(actionData.message || "Announcement created successfully");
      fetcher.reset();
      reset();
      setFeaturedImage(null);
      setIsOpen(false);
      setIdempotencyKey(crypto.randomUUID());
    } else if (actionData && !actionData.success) {
      toast.error(actionData.message || "Something went wrong");
    }
  }, [actionData]);

  const onFormSubmit = (data: CreateAnnouncementSchemaType) => {
    const payload = {
      intent: "create-announcement",
      ...data,
      idempotencyKey,
      ...(featuredImage
        ? {
            featuredImage: featuredImage.image,
            featuredImageId: featuredImage.imagePublicId,
          }
        : {}),
    };
    fetcher.submit(payload as any, {
      method: "post",
      encType: "application/json",
      action: "/dashboard/announcements",
    });
  };

  const statusOptions = [
    { id: "draft", name: "Draft" },
    { id: "published", name: "Published" },
  ];

  return (
    <>
      <Button
        size="sm"
        className="tracking-tight btn"
        onClick={() => setIsOpen(true)}
      >
        <RiAddFill />
        Create Announcement
      </Button>
      <Modal
        isOpen={isOpen}
        setIsOpen={handleOpenChange}
        title="Create Announcement"
        description="Broadcast a message to all members"
      >
        <Separator />
        <div className="px-2 max-h-[60vh] overflow-y-auto">
          <fetcher.Form
            onSubmit={handleSubmit(onFormSubmit)}
            className="mt-6 space-y-4"
            id="create-announcement-form"
          >
            {rootErrorMessage && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <RiErrorWarningLine size={16} className="mt-0.5 shrink-0" />
                <span>{rootErrorMessage}</span>
              </div>
            )}
            <FormBox
              label="Title"
              type="text"
              placeholder="Announcement title"
              id="title"
              register={register}
              errors={errors.title}
              name="title"
            />
            <FormBox
              label="Content"
              type="textarea"
              placeholder="Write your announcement"
              id="content"
              register={register}
              errors={errors.content}
              name="content"
              classname="[&_textarea]:min-h-32"
            />
            <FormBox
              label="Status"
              type="radio"
              placeholder="Select status"
              id="status"
              register={register}
              errors={errors.status}
              name="status"
              control={control}
              options={statusOptions}
            />
            <div className="space-y-2">
              <Label htmlFor="isPinned" className="text-xs">Pinned</Label>
              <FormBox
                label="Pinned"
                type="switch"
                placeholder="Pin this announcement"
                id="isPinned"
                register={register}
                errors={errors.isPinned}
                name="isPinned"
                control={control}
                inputType="switch"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="featured-image" className="text-xs">Featured Image</Label>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              {featuredImage ? (
                <div className="relative overflow-hidden rounded-md border border-border">
                  <img
                    src={featuredImage.image}
                    alt="Announcement featured preview"
                    className="h-40 w-full object-cover"
                  />
                  <button
                    type="button"
                    aria-label="Remove featured image"
                    onClick={() => {
                      if (featuredImage?.imagePublicId && !didSubmitRef.current) {
                        void deleteUploadedImage(featuredImage.imagePublicId);
                      }
                      setFeaturedImage(null);
                    }}
                    className="absolute top-2 right-2 flex size-7 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
                  >
                    <RiCloseLine size={16} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex h-28 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-60"
                >
                  {isUploading ? (
                    <>
                      <RiLoader2Line className="animate-spin" size={18} />
                      Uploading…
                    </>
                  ) : (
                    <>
                      <RiImageAddLine size={20} />
                      <span>Upload featured image (optional)</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </fetcher.Form>
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => resetModal(true)}
          >
            Cancel
          </Button>
          <ActionBtn
            form="create-announcement-form"
            text="Create Announcement"
            type="submit"
            size="sm"
            loading={isSubmitting}
            classname="btn"
          />
        </div>
      </Modal>
    </>
  );
}
