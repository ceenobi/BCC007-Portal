import { zodResolver } from "@hookform/resolvers/zod";
import {
  RiCloseLine,
  RiEditLine,
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
import { updateAnnouncementSchema } from "~/lib/schema";
import type { AnnouncementData, UpdateAnnouncementSchemaType } from "~/types";

const statusOptions = [
  { id: "draft", name: "Draft" },
  { id: "published", name: "Published" },
  { id: "archived", name: "Archived" },
];

export default function EditAnnouncement({
  announcement,
}: {
  announcement: AnnouncementData;
}) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const {
    featuredImage,
    setFeaturedImage,
    isUploading,
    handleFileChange,
    imageInputRef,
  } = useEventImageUpload("announcements");
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state === "submitting";

  const originalImageId = announcement.featuredImageId ?? null;
  const stagedNewUploadIdRef = useRef<string | null>(null);

  const cleanupStagedUpload = () => {
    if (!stagedNewUploadIdRef.current) return;
    const id = stagedNewUploadIdRef.current;
    stagedNewUploadIdRef.current = null;
    void fetch("/api/delete-media", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicIds: [id] }),
    }).catch(() => {});
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) cleanupStagedUpload();
    setIsOpen(open);
  };

  const defaultValues = {
    title: announcement.title,
    content: announcement.content,
    status: announcement.status,
    isPinned: announcement.isPinned,
  };

  const {
    handleSubmit,
    register,
    control,
    reset,
    formState: { errors },
  } = useForm<z.input<typeof updateAnnouncementSchema>, any, UpdateAnnouncementSchemaType>({
    resolver: zodResolver(updateAnnouncementSchema),
    mode: "onChange",
    defaultValues,
  });

  useEffect(() => {
    if (announcement.featuredImage) {
      setFeaturedImage({
        image: announcement.featuredImage,
        imagePublicId: announcement.featuredImageId ?? "",
      });
    } else {
      setFeaturedImage(null);
    }
    stagedNewUploadIdRef.current = null;
    reset(defaultValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [announcement._id]);

  useEffect(() => {
    if (
      featuredImage?.imagePublicId &&
      featuredImage.imagePublicId !== originalImageId
    ) {
      stagedNewUploadIdRef.current = featuredImage.imagePublicId;
    }
  }, [featuredImage, originalImageId]);

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

  useEffect(() => {
    if (actionData?.success) {
      stagedNewUploadIdRef.current = null;
      toast.success(actionData.message || "Announcement updated successfully");
      setIsOpen(false);
    } else if (actionData && !actionData.success) {
      toast.error(actionData.message || "Something went wrong");
    }
  }, [actionData]);

  const onFormSubmit = (data: UpdateAnnouncementSchemaType) => {
    const payload: Record<string, unknown> = {
      intent: "update-announcement",
      announcementId: announcement._id,
      ...data,
    };
    const originalImage = announcement.featuredImage
      ? {
          image: announcement.featuredImage,
          imagePublicId: announcement.featuredImageId ?? "",
        }
      : null;
    const imageChanged =
      JSON.stringify(featuredImage) !== JSON.stringify(originalImage);
    if (imageChanged) {
      payload.featuredImage = featuredImage?.image ?? "";
      payload.featuredImageId = featuredImage?.imagePublicId ?? "";
    }
    fetcher.submit(payload as any, {
      method: "post",
      encType: "application/json",
      action: "/dashboard/announcements",
    });
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setIsOpen(true)}
        aria-label={`Edit announcement: ${announcement.title}`}
        className="gap-1"
      >
        <RiEditLine className="size-4" />
      </Button>
      <Modal
        isOpen={isOpen}
        setIsOpen={handleOpenChange}
        title={`Edit Announcement - ${announcement.title}`}
        description="Edit the announcement details"
      >
        <Separator />
        <div className="px-2 max-h-[60vh] overflow-y-auto">
          <form
            onSubmit={handleSubmit(onFormSubmit)}
            className="mt-6 space-y-4"
            id="edit-announcement-form"
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
                      if (
                        featuredImage?.imagePublicId &&
                        featuredImage.imagePublicId !== originalImageId
                      ) {
                        cleanupStagedUpload();
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
          </form>
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <ActionBtn
            form="edit-announcement-form"
            text="Save Changes"
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
