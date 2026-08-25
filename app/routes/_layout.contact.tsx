import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useFetcher } from "react-router";
import { toast } from "sonner";
import { z } from "zod";
import ActionBtn from "~/components/ui/action-btn";
import { AlertBox } from "~/components/ui/alert-box";
import { Badge } from "~/components/ui/badge";
import { FormBox } from "~/components/ui/form-box";
import { useWaveAnimation } from "~/hooks/usePageAnimation";
import { buildSeoMeta, webPageSchema } from "~/lib/seo";
import { contactSchema } from "~/lib/schema";
import type { Route } from "./+types/_layout.contact";
type contactSchemaType = z.infer<typeof contactSchema>;


export function meta({}: Route.MetaArgs) {
  return [
    ...buildSeoMeta({
      title: "Contact BCC007 - Send us a message",
      description:
        "Questions, press, partnerships or just a hello? Contact the BCC007 alumni community and we'll get back to you as soon as possible.",
      path: "/contact",
    }),
    webPageSchema({
      title: "Contact BCC007",
      description: "Send a message to the BCC007 alumni community.",
      path: "/contact",
    }),
  ];
}

export async function action({ request }: Route.ActionArgs) { 
  const payload = await request.json();
  const { submitContactMessage } = await import("~/.server/actions/contact");
  return await submitContactMessage(request, payload);
}

export default function ContactRoute() {
  const leftCol = useWaveAnimation({ threshold: 0.1, staggerDelay: 80 });
  const rightCol = useWaveAnimation({ threshold: 0.1, staggerDelay: 80 });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<contactSchemaType>({
    resolver: zodResolver(contactSchema),
    mode: "onChange",
  });
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state === "submitting";
  const actionData = fetcher.data as
    | { success?: boolean; message?: string; body?: { message: string } }
    | undefined;

  useEffect(() => {
    if (actionData?.success) {
      toast.success(actionData.message);
      reset();
      fetcher.reset();
    }
  }, [actionData, reset, fetcher]);

  const onFormSubmit = (data: contactSchemaType) => {
    fetcher.submit(data, {
      method: "post",
      action: "/contact",
      encType: "application/json",
    });
  };

  return (
    <main className="py-10 pb-20 md:py-20 max-w-6xl mx-auto px-4">
      <div className="mt-20 grid grid-cols-1 md:grid-cols-12 gap-8">
        <div ref={leftCol.containerRef} className="col-span-1 md:col-span-7 space-y-6">
          <h1
            style={leftCol.getItemStyle(0)}
            className={leftCol.getItemClassName("italic text-foreground font-medium w-full max-w-152.5 sm:leading-none tracking-tight text-[48px] lg:text-[4rem]")}
          >
            Reach out
          </h1>
          <p
            style={leftCol.getItemStyle(1)}
            className={leftCol.getItemClassName("w-full max-w-150 text-mainGray dark:text-muted-foreground leading-7")}
          >
            Questions, press, partnerships or simple hello? Send us a message
            and we'll get back as soon as possible.
          </p>
          <div
            style={leftCol.getItemStyle(2)}
            className={leftCol.getItemClassName("relative w-full max-w-152.5")}
          >
            <img src="/Email.svg" alt="contact-us" className="w-full h-full" />
          </div>
        </div>
        <div ref={rightCol.containerRef} className="col-span-1 md:col-span-5">
          <div
            style={rightCol.getItemStyle(0)}
            className={rightCol.getItemClassName("sticky top-32 w-full max-w-125 p-6 rounded-xl dark:bg-lightGray border border-gray-200 dark:border-gray-700 hover:shadow space-y-6")}
          >
            <Badge className="bg-lightBlue/50 text-mainBlue dark:text-white">
              · Send a message
            </Badge>
            <div>
              <h1 className="font-grotesk font-bold text-[34px] tracking-[-2%] leading-10">
                How can we help?
              </h1>
              <p className=" text-mainGray dark:text-muted-foreground font-medium leading-6.5">
                Tell us a little something.
              </p>
            </div>
            <fetcher.Form
              className="space-y-4 mt-10"
              onSubmit={handleSubmit(onFormSubmit)}
            >
              <AlertBox
                showAlert={!!(actionData && !actionData?.success)}
                title="Error"
                description={
                  actionData?.message || "An error occurred. Please try again."
                }
                variant="destructive"
              />
              <div className="space-y-2">
                <FormBox
                  label="Fullname"
                  type="text"
                  placeholder="John Doe"
                  id="fullname"
                  register={register}
                  errors={errors?.fullname}
                  name="fullname"
                />
                <FormBox
                  label="Email"
                  type="email"
                  placeholder="email@example.com"
                  id="email"
                  register={register}
                  errors={errors?.email}
                  name="email"
                />
                <FormBox
                  label="Subject"
                  type="text"
                  placeholder="Subject"
                  id="subject"
                  register={register}
                  errors={errors?.subject}
                  name="subject"
                />
                <FormBox
                  label="Message"
                  type="textarea"
                  inputType="textarea"
                  placeholder="Let's get in touch"
                  id="message"
                  register={register}
                  errors={errors?.message}
                  name="message"
                />
                <ActionBtn
                  text="Send Message"
                  type="submit"
                  loading={isSubmitting}
                  size="lg"
                  classname="w-full h-10"
                />
              </div>
            </fetcher.Form>
          </div>
        </div>
      </div>
    </main>
  );
}
