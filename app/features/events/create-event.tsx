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
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import Modal from "~/components/ui/modal";
import { Separator } from "~/components/ui/separator";
import { useEventImageUpload } from "~/hooks/useEventImageUpload";
import { createEventSchema } from "~/lib/schema";
import type { CreateEventSchemaType } from "~/types";
import { cn } from "~/lib/utils";

const eventTypeOptions = [
  { id: "party", name: "Party" },
  { id: "meeting", name: "Meeting" },
  { id: "birthday", name: "Birthday" },
  { id: "other", name: "Other" },
];

type MemberOption = {
  _id: string;
  name: string;
};

export default function CreateEvent({ members }: { members: MemberOption[] }) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  // Stable per submission intent so a double-click or retried request for the
  // same intent is deduplicated server-side (never creates duplicate events).
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
  } = useEventImageUpload();
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state === "submitting";
  const {
    handleSubmit,
    register,
    control,
    reset,
    formState: { errors },
  } = useForm<z.input<typeof createEventSchema>, any, CreateEventSchemaType>({
    resolver: zodResolver(createEventSchema),
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
      toast.success(actionData.message || "Event created successfully");
      fetcher.reset();
      reset();
      setFeaturedImage(null);
      setIsOpen(false);
      setIdempotencyKey(crypto.randomUUID());
    } else if (actionData && !actionData.success) {
      toast.error(actionData.message || "Something went wrong");
    }
  }, [actionData]);

  const onFormSubmit = (data: CreateEventSchemaType) => {
    const payload = {
      intent: "create-event",
      ...data,
      idempotencyKey,
      ...(featuredImage
        ? {
            featuredImage: featuredImage.image,
            featuredImageId: featuredImage.imagePublicId,
          }
        : {}),
    };
    const latitude = data.latitude as unknown;
    const longitude = data.longitude as unknown;
    if (latitude === undefined || latitude === "" || Number.isNaN(Number(latitude))) {
      delete (payload as Record<string, unknown>).latitude;
    }
    if (longitude === undefined || longitude === "" || Number.isNaN(Number(longitude))) {
      delete (payload as Record<string, unknown>).longitude;
    }
    fetcher.submit(payload as any, {
      method: "post",
      encType: "application/json",
      action: "/dashboard/events",
    });
  };

  const memberOptions = members.map((member) => ({
    id: member._id,
    name: member.name,
  }));

  return (
    <>
      <Button
        size="sm"
        className="tracking-tight btn"
        onClick={() => setIsOpen(true)}
      >
        <RiAddFill />
        Create Event
      </Button>
      <Modal
        isOpen={isOpen}
        setIsOpen={handleOpenChange}
        title="Create Event"
        description="Add a new event to the group"
      >
        <Separator />
        <div className="px-2 max-h-[60vh] overflow-y-auto">
          <fetcher.Form
            onSubmit={handleSubmit(onFormSubmit)}
            className="mt-6 space-y-4"
            id="create-event-form"
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
              placeholder="Event title"
              id="title"
              register={register}
              errors={errors.title}
              name="title"
            />
            <FormBox
              label="Detail"
              type="textarea"
              placeholder="Describe the event"
              id="detail"
              register={register}
              errors={errors.detail}
              name="detail"
              classname="[&_textarea]:min-h-28"
            />
            <FormBox
              label="Location"
              type="text"
              placeholder="Event location"
              id="location"
              register={register}
              errors={errors.location}
              name="location"
            />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="date" className="text-xs">Date</Label>
                <Input
                  type="date"
                  id="date"
                  className={cn(
                    "h-10",
                    errors.date && "border-destructive",
                  )}
                  {...register("date")}
                />
                {errors.date?.message && (
                  <p className="text-xs text-destructive">
                    {String(errors.date.message)}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="time" className="text-xs">Time</Label>
                <Input
                  type="time"
                  id="time"
                  className={cn(
                    "h-10",
                    errors.time && "border-destructive",
                  )}
                  {...register("time")}
                />
                {errors.time?.message && (
                  <p className="text-xs text-destructive">
                    {String(errors.time.message)}
                  </p>
                )}
              </div>
            </div>
            <FormBox
              label="Event Type"
              type="radio"
              placeholder="Select event type"
              id="eventType"
              register={register}
              errors={errors.eventType}
              name="eventType"
              control={control}
              options={eventTypeOptions}
            />
            <FormBox
              label="Organizer"
              type="select"
              placeholder="Select organizer"
              id="organizer"
              register={register}
              errors={errors.organizer}
              name="organizer"
              control={control}
              options={memberOptions}
            />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="latitude" className="text-xs">Latitude</Label>
                <Input
                  type="number"
                  step="any"
                  id="latitude"
                  placeholder="Optional"
                  className="h-10"
                  {...register("latitude")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="longitude" className="text-xs">Longitude</Label>
                <Input
                  type="number"
                  step="any"
                  id="longitude"
                  placeholder="Optional"
                  className="h-10"
                  {...register("longitude")}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="capacity" className="text-xs">
                Capacity
              </Label>
              <Input
                type="number"
                min={1}
                id="capacity"
                placeholder="Maximum attendees (optional)"
                className="h-10"
                {...register("capacity")}
              />
              {errors.capacity?.message && (
                <p className="text-xs text-destructive">
                  {String(errors.capacity.message)}
                </p>
              )}
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
                    alt="Event featured preview"
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
            form="create-event-form"
            text="Create Event"
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
