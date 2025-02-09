"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { upsertEventSchema } from "../../schema/event";
import type { upsertEventInput } from "../../schema/event";
import CustomTextareaAutosize from "../CustomTextareAutosize/CustomTextareaAutosize";
import { useRef, useState } from "react";
import { useMarkdownHotkeys } from "@/markdoc/editor/hotkeys/hotkeys.markdoc";
import { useMarkdownShortcuts } from "@/markdoc/editor/shortcuts/shortcuts.markdoc";
import { toast } from "sonner";
import { trpc } from "@/utils/trpc";
import { uploadFile } from "../../utils/s3helpers";
import { redirect, useRouter } from "next/navigation";

interface Event {
  id?: string | null;
  communityId: string;
  name: string;
  address: string;
  eventDate: string;
  capacity: number;
  description: string;
  coverImage: string;
}

interface EventFormProps {
  defaultValues: Event;
}

type CoverImage = {
  status: "success" | "error" | "loading" | "idle";
  url: string;
};

export function EventForm(props: EventFormProps) {
  const { defaultValues } = props;
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useMarkdownHotkeys(textareaRef);
  useMarkdownShortcuts(textareaRef);
  const { mutate: getUploadUrl } = trpc.event.getUploadUrl.useMutation();

  const { register, handleSubmit, formState, setValue, control } =
    useForm<upsertEventInput>({
      resolver: zodResolver(upsertEventSchema),
      defaultValues,
      mode: "onChange",
    });

  const { mutate: upsert } = trpc.event.upsert.useMutation({
    onError() {
      toast.error("Something went wrong");
    },
    onSuccess() {
      toast.success("Saved!");
      redirect("/hub");
    },
  });

  const onSubmit = function (data: Event) {
    upsert(data);
  };

  const [coverImage, setCoverImage] = useState<CoverImage>({
    status: "idle",
    url: props.defaultValues.coverImage,
  });

  const uploadToUrl = async (signedUrl: string, file: File) => {
    setCoverImage({ status: "loading", url: "" });

    if (!file) {
      setCoverImage({ status: "error", url: "" });
      toast.error("Invalid file upload.");
      return;
    }

    const response = await uploadFile(signedUrl, file);

    const { fileLocation } = response;
    return fileLocation;
  };

  const imageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const { size, type } = file;
      await getUploadUrl(
        { size, type },
        {
          onError(error) {
            if (error) return toast.error(error.message);
            return toast.error(
              "Something went wrong uploading the photo, please retry.",
            );
          },
          async onSuccess(signedUrl) {
            //  const url = await uploadToUrl(signedUrl, file);
            const url = "www.test.com";
            if (!url) {
              return toast.error(
                "Something went wrong uploading the photo, please retry.",
              );
            }
            setCoverImage({ status: "success", url });
            setValue("coverImage", url);
            toast.success(
              "Profile photo successfully updated. This may take a few minutes to update around the site.",
            );
          },
        },
      );
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="border border-neutral-900"
    >
      <div className="px-4 py-6 sm:p-6 lg:pb-8 ">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">
            Event editor
          </h2>
        </div>
        <div>
          <div>
            <div className="mt-6 flex flex-col lg:flex-row">
              <div className="flex-grow space-y-6">
                <div>
                  <label htmlFor="name">Name</label>
                  <input type="text" {...register("name")} id="name" />
                  {formState.errors.name && (
                    <p className="mt-1 text-sm text-red-600">
                      {`${formState.errors.name.message || "Required"}`}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-6 flex flex-col lg:flex-row">
              <div className="flex-grow space-y-6">
                <div className="pr-4">
                  <label htmlFor="city">Capacity</label>
                  <input
                    type="number"
                    id="city"
                    {...register("capacity", {
                      valueAsNumber: true,
                    })}
                  />
                  {formState.errors.capacity && (
                    <p className="mt-1 text-sm text-red-600">
                      {`${formState.errors.capacity.message || "Required"}`}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex-grow space-y-6">
                <div>
                  <label htmlFor="country">Date</label>
                  <Controller
                    name="eventDate"
                    control={control}
                    defaultValue={defaultValues?.eventDate}
                    render={() => (
                      <input
                        type="datetime-local"
                        onChange={(e) => {
                          const date = new Date(
                            e.currentTarget.value,
                          ).toISOString();
                          setValue("eventDate", date, {
                            shouldDirty: true,
                          });
                        }}
                        defaultValue={defaultValues.eventDate.slice(0, 16)}
                        onFocus={(e) => e.currentTarget.showPicker()}
                      />
                    )}
                  />
                  {formState.errors.eventDate && (
                    <p className="mt-1 text-sm text-red-600">
                      {`${formState.errors.eventDate.message || "Required"}`}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-6">
              <label htmlFor="address">Address</label>
              <div className="mt-1">
                <textarea
                  {...register("address")}
                  id="address"
                  rows={2}
                  defaultValue={""}
                  maxLength={200}
                />
                {formState.errors.address && (
                  <p className="mt-1 text-sm text-red-600">
                    {`${formState.errors.address.message || "Required"}`}
                  </p>
                )}
              </div>
            </div>
            {/* Photo upload */}

            <div className="mt-6 flex-grow">
              <p className="text-sm font-medium text-white" aria-hidden="true">
                Photo{" "}
              </p>
              <div className="mt-1 lg:hidden">
                <div className="flex items-center">
                  <div
                    className="aspect-[16/9]h-16 relative w-16 w-full flex-shrink-0 overflow-hidden rounded-lg object-cover "
                    aria-hidden="true"
                  >
                    {coverImage.status === "error" ||
                    coverImage.status === "loading" ? (
                      <div className="aspect-[16/9] h-full w-full w-full rounded-lg border-2 bg-black object-cover" />
                    ) : (
                      // TODO Review
                      // eslint-disable-next-line jsx-a11y/img-redundant-alt
                      <img
                        className="aspect-[16/9] h-full w-full w-full rounded-lg border-2 border-white object-cover object-cover"
                        src={`${coverImage.url}`}
                        alt="Profile photo upload section"
                      />
                    )}
                  </div>
                  <div className="ml-5 rounded-md shadow-sm">
                    <div className="group relative flex items-center justify-center border-2 border-white px-3 py-2 focus-within:ring-2 focus-within:ring-sky-500 focus-within:ring-offset-2 hover:bg-black">
                      <label
                        htmlFor="mobile-event-photo"
                        className="relative text-sm font-medium leading-4 text-white"
                      >
                        <span>Change</span>
                        <span className="sr-only">event photo</span>
                      </label>
                      <input
                        id="mobile-event-photo"
                        name="event-photo"
                        type="file"
                        accept="image/png, image/gif, image/jpeg, image/webp"
                        onChange={imageChange}
                        className="absolute h-full w-full cursor-pointer rounded-md border-neutral-300 opacity-0"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative hidden aspect-[16/9] w-full overflow-hidden rounded-lg object-cover lg:block">
                {coverImage.status === "error" ||
                coverImage.status === "loading" ? (
                  <div className="aspect-[16/9] h-full w-full w-full rounded-lg border-2 bg-black object-cover" />
                ) : (
                  // TODO Review
                  // eslint-disable-next-line jsx-a11y/img-redundant-alt
                  <img
                    className="relative aspect-[16/9] w-full rounded-lg border-2 border-white object-cover object-cover"
                    src={coverImage.url}
                    alt="Profile photo upload section"
                    sizes="(max-width: 768px) 10vw"
                  />
                )}
                <label
                  htmlFor="desktop-event-photo"
                  className="absolute inset-0 flex h-full w-full items-center justify-center bg-black bg-opacity-75 text-sm font-medium text-white opacity-0 focus-within:opacity-100 hover:opacity-100"
                >
                  <div className=" text-center text-xs">Change Photo</div>
                  <span className="sr-only"> event photo</span>
                  <input
                    type="file"
                    id="desktop-event-photo"
                    name="event-photo"
                    onChange={imageChange}
                    className="absolute inset-0 h-full w-full cursor-pointer rounded-md border-neutral-300 opacity-0"
                  />
                </label>
              </div>
              {formState.errors.coverImage && (
                <p className="mt-1 text-sm text-red-600">
                  {`${formState.errors.coverImage.message || "Required"}`}
                </p>
              )}
            </div>

            {/* Photo end  */}
            <div className="mt-6">
              <label htmlFor="bio">About</label>
              <div className="mt-1">
                <CustomTextareaAutosize
                  id="bio"
                  placeholder="Explain what is your event about here 💖"
                  className="mb-8 border-none bg-neutral-900 text-lg shadow-none outline-none focus:bg-black"
                  minRows={25}
                  {...register("description")}
                  inputRef={textareaRef}
                />
                {formState.errors.description && (
                  <p className="mt-1 text-sm text-red-600">
                    {`${formState.errors.description.message || "Required"}`}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="divide-y divide-neutral-200 pt-6">
            <div className="mt-2 flex justify-end py-4">
              <button
                type="button"
                className="inline-flex justify-center border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:ring-offset-2"
                onClick={() => router.push(`/`)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="ml-5 inline-flex w-20 justify-center bg-gradient-to-r from-orange-400 to-pink-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:from-orange-300 hover:to-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:ring-offset-2"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
