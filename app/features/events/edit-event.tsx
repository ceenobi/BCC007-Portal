import { zodResolver } from "@hookform/resolvers/zod";
import {
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
import { updateEventSchema } from "~/lib/schema";
import { cn } from "~/lib/utils";
import type { EventData, UpdateEventSchemaType } from "~/types";

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

function formatDateInput(date: Date) {
  const d = new Date(date);
  const month = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

export default function EditEvent({
  event,
  members,
}: {
  event: EventData;
  members: MemberOption[];
}) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const {
    featuredImage,
    setFeaturedImage,
    isUploading,
    handleFileChange,
    imageInputRef,
  } = useEventImageUpload();
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state === "submitting";

  const originalImageId = event.featuredImageId ?? null;
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
    title: event.title,
    detail: event.detail,
    location: event.location,
    date: formatDateInput(event.date),
    time: event.time,
    eventType: event.eventType,
    organizer: event.organizer?._id ? String(event.organizer._id) : "",
    latitude: event.latitude ?? undefined,
    longitude: event.longitude ?? undefined,
    capacity: event.capacity ?? undefined,
  };

  const {
    handleSubmit,
    register,
    control,
    reset,
    formState: { errors },
  } = useForm<z.input<typeof updateEventSchema>, any, UpdateEventSchemaType>({
    resolver: zodResolver(updateEventSchema),
    mode: "onChange",
    defaultValues,
  });

  useEffect(() => {
    if (event.featuredImage) {
      setFeaturedImage({
        image: event.featuredImage,
        imagePublicId: event.featuredImageId ?? "",
      });
    } else {
      setFeaturedImage(null);
    }
    stagedNewUploadIdRef.current = null;
    reset(defaultValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event._id]);

  useEffect(() => {
    if (
      featuredImage?.imagePublicId &&
      featuredImage.imagePublicId !== originalImageId
    ) {
      stagedNewUploadIdRef.current = featuredImage.imagePublicId;
    }
  }, [featuredImage, originalImageId]);

  const actionData = fetcher.data as
    { success?: boolean; message?: string } | undefined;

  const rootError = errors.root as
    { message?: string } | Array<{ message?: string }> | undefined;
  const rootErrorMessage =
    (Array.isArray(rootError) ? rootError[0]?.message : rootError?.message) ??
    (errors as Record<string, { message?: string } | undefined>)[""]?.message;

  useEffect(() => {
    if (actionData?.success) {
      stagedNewUploadIdRef.current = null;
      toast.success(actionData.message || "Event updated successfully");
      setIsOpen(false);
    } else if (actionData && !actionData.success) {
      toast.error(actionData.message || "Something went wrong");
    }
  }, [actionData]);

  const onFormSubmit = (data: UpdateEventSchemaType) => {
    const payload: Record<string, unknown> = {
      intent: "update-event",
      ...data,
    };
    const originalImage = event.featuredImage
      ? {
          image: event.featuredImage,
          imagePublicId: event.featuredImageId ?? "",
        }
      : null;
    const imageChanged =
      JSON.stringify(featuredImage) !== JSON.stringify(originalImage);
    if (imageChanged) {
      payload.featuredImage = featuredImage?.image ?? "";
      payload.featuredImageId = featuredImage?.imagePublicId ?? "";
    }
    const latitude = data.latitude as unknown;
    const longitude = data.longitude as unknown;
    if (
      latitude === undefined ||
      latitude === "" ||
      Number.isNaN(Number(latitude))
    ) {
      delete payload.latitude;
    }
    if (
      longitude === undefined ||
      longitude === "" ||
      Number.isNaN(Number(longitude))
    ) {
      delete payload.longitude;
    }
    const capacity = data.capacity as unknown;
    if (
      capacity === undefined ||
      capacity === "" ||
      Number.isNaN(Number(capacity))
    ) {
      delete payload.capacity;
    }
    fetcher.submit(payload as any, {
      method: "post",
      encType: "application/json",
      action: `/dashboard/events/${event._id}`,
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
        Edit Event
      </Button>
      <Modal
        isOpen={isOpen}
        setIsOpen={handleOpenChange}
        title={`Edit Event - ${event.title}`}
        description="Edit the event details"
      >
        <Separator />
        <div className="px-2 max-h-[60vh] overflow-y-auto">
          <form
            onSubmit={handleSubmit(onFormSubmit)}
            className="mt-6 space-y-4"
            id="edit-event-form"
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
                <Label htmlFor="date">Date</Label>
                <Input
                  type="date"
                  id="date"
                  className={cn("h-10", errors.date && "border-destructive")}
                  {...register("date")}
                />
                {errors.date?.message && (
                  <p className="text-xs text-destructive">
                    {String(errors.date.message)}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="time">Time</Label>
                <Input
                  type="time"
                  id="time"
                  className={cn("h-10", errors.time && "border-destructive")}
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
                <Label htmlFor="latitude">Latitude</Label>
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
                <Label htmlFor="longitude">Longitude</Label>
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
              <Label htmlFor="capacity">Capacity</Label>
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
              <Label htmlFor="featured-image">Featured Image</Label>
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
            form="edit-event-form"
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
