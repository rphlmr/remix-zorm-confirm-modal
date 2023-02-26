import { Dialog, Transition } from "@headlessui/react";
import type { FetcherWithComponents } from "@remix-run/react";
import { useFetcher } from "@remix-run/react";
import { Fragment, useEffect, useState } from "react";
import { parseFormAny, useZorm } from "react-zorm";
import { twMerge } from "tailwind-merge";
import { z } from "zod";
import type { Zorm } from "react-zorm";
import type { ActionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";

const FormSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

async function fakeLatency(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function action({ request }: ActionArgs) {
  const result = await FormSchema.safeParseAsync(
    parseFormAny(await request.formData())
  );

  await fakeLatency(2_000);

  console.log(result);

  return json({ ok: true });
}

export default function Index() {
  const zo = useZorm("FormSchema", FormSchema);
  const formFetcher = useFetcher();

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.4" }}>
      <h1>Welcome to Remix Zorm Confirm Modal</h1>
      <formFetcher.Form
        ref={zo.ref}
        method="post"
        className="flex flex-col space-y-2"
      >
        <label>
          Name
          <input className="bg-gray-200 ml-2" name={zo.fields.name()} />
          {zo.errors.name()?.message && (
            <span>{zo.errors.name()?.message}</span>
          )}
        </label>
        <label>
          Email
          <input className="bg-gray-200 ml-2" name={zo.fields.email()} />
          {zo.errors.email()?.message && (
            <span>{zo.errors.email()?.message}</span>
          )}
        </label>
        <ConfirmDialog zorm={zo} formFetcher={formFetcher} />
      </formFetcher.Form>
    </div>
  );
}

function ConfirmDialog({
  zorm,
  formFetcher,
}: {
  zorm: Zorm<typeof FormSchema>;
  formFetcher: FetcherWithComponents<any>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<z.infer<typeof FormSchema>>();

  const isPending =
    formFetcher.state !== "idle" && formFetcher.submission?.method === "POST";

  function closeModal() {
    setIsOpen(false);
  }

  function openModal() {
    const validation = zorm.validate();

    // if validation is successful, open modal and set data (not mandatory, depends on your use case)
    if (validation.success) {
      setData(validation.data as unknown as z.infer<typeof FormSchema>); // this is a hack, because data is not a schema ...
      setIsOpen(true);
    }
  }

  // reset form on success and close modal
  // formFetcher.data.ok or !formFetcher.data.error, depending on your action
  useEffect(() => {
    if (formFetcher.type === "done" && formFetcher.data.ok) {
      zorm.form?.reset();
      closeModal();
    }
  }, [formFetcher, zorm.form]);

  return (
    <>
      <>
        <div>
          <button
            type="button"
            onClick={openModal}
            className={twMerge(
              "rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-opacity-80"
            )}
          >
            Submit
          </button>
        </div>

        <Transition appear show={isOpen} as={Fragment}>
          <Dialog as="div" className="relative z-10" onClose={closeModal}>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black bg-opacity-25" />
            </Transition.Child>

            <div className="fixed inset-0 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-4 text-center">
                <Transition.Child
                  as={Fragment}
                  enter="ease-out duration-300"
                  enterFrom="opacity-0 scale-95"
                  enterTo="opacity-100 scale-100"
                  leave="ease-in duration-200"
                  leaveFrom="opacity-100 scale-100"
                  leaveTo="opacity-0 scale-95"
                >
                  <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-medium leading-6 text-gray-900"
                    >
                      Confirm before submitting
                    </Dialog.Title>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Your are about to submit the form : <br />
                      </p>
                      <p>{data?.name}</p>
                      <p>{data?.email}</p>
                    </div>

                    <div className="mt-4 space-x-2">
                      <button
                        type="button"
                        className="inline-flex justify-center rounded-md border border-transparent bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-200"
                        onClick={closeModal}
                      >
                        Edit
                      </button>
                      <button
                        type="submit"
                        disabled={isPending}
                        className={twMerge(
                          "inline-flex justify-center rounded-md border border-transparent bg-green-100 px-4 py-2 text-sm font-medium text-green-900 hover:bg-green-200",
                          isPending && "cursor-not-allowed bg-opacity-50"
                        )}
                        onClick={() => {
                          if (zorm.form) {
                            formFetcher.submit(zorm.form);
                          }
                        }}
                      >
                        {isPending ? "Submitting..." : "Submit"}
                      </button>
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </Dialog>
        </Transition>
      </>
    </>
  );
}
