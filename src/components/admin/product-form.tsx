"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState, useTransition } from "react";
import { createProduct, updateProduct } from "@/app/admin/products/actions";
import { Field } from "@/components/admin/field";
import { CloseIcon, PlusIcon, SpinnerIcon } from "@/components/icons";
import type { CategoryOption } from "@/lib/admin/catalog";
import { IMAGE_HOSTS } from "@/lib/images";

/** Form values as typed; the server action parses and validates them. */
export type ProductFormValues = {
  name: string;
  slug: string;
  categoryId: string;
  price: string;
  color: string;
  description: string;
  /** One detail per line. */
  details: string;
  care: string;
  isNew: boolean;
  images: { url: string; alt: string }[];
};

type Keyed<T> = T & { key: number };

// Stable React keys for editable rows (never rendered into the DOM).
let nextKey = 0;
const keyed = <T extends object>(row: T): Keyed<T> => ({ ...row, key: nextKey++ });

const MAX_IMAGES = 8;
const MAX_SIZES = 20;

const emptyValues: ProductFormValues = {
  name: "",
  slug: "",
  categoryId: "",
  price: "",
  color: "",
  description: "",
  details: "",
  care: "",
  isNew: false,
  images: [{ url: "", alt: "" }],
};

/** "Silk Midi Dress" → "silk-midi-dress". */
function slugify(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

/** Errors without the given key, or without every key starting with a row prefix. */
function withoutErrors(errors: Record<string, string>, match: (key: string) => boolean) {
  const next = { ...errors };
  for (const key of Object.keys(next)) if (match(key)) delete next[key];
  return next;
}

type Props =
  | { mode: "create"; categories: CategoryOption[] }
  | {
      mode: "edit";
      productId: string;
      categories: CategoryOption[];
      initial: ProductFormValues;
    };

/** Create or edit a product's details, category, price and images (plus initial stock on create). */
export function ProductForm(props: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const creating = props.mode === "create";

  const [values, setValues] = useState(() => {
    const initial = props.mode === "edit" ? props.initial : emptyValues;
    return { ...initial, images: initial.images.map(keyed) };
  });
  // On create the slug follows the name until it's edited by hand.
  const [slugTouched, setSlugTouched] = useState(!creating);
  const [sized, setSized] = useState(false);
  const [quantity, setQuantity] = useState("0");
  const [sizes, setSizes] = useState(() => [keyed({ size: "", quantity: "0" })]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [focusRequest, setFocusRequest] = useState(0);
  const [pending, startTransition] = useTransition();

  // After a rejected submit, move focus to the first field the server flagged.
  useEffect(() => {
    if (focusRequest === 0) return;
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [focusRequest]);

  function edited(errorKey: string) {
    setSaved(false);
    setErrors((current) => withoutErrors(current, (key) => key === errorKey));
  }

  function setField<K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    edited(key);
  }

  function setImage(index: number, part: "url" | "alt", value: string) {
    setValues((current) => ({
      ...current,
      images: current.images.map((image, i) => (i === index ? { ...image, [part]: value } : image)),
    }));
    edited(`images.${index}.${part}`);
  }

  function removeImage(index: number) {
    setValues((current) => ({
      ...current,
      images: current.images.filter((_, i) => i !== index),
    }));
    // Row indexes shift, so row errors no longer line up.
    setErrors((current) => withoutErrors(current, (key) => key.startsWith("images")));
    setSaved(false);
  }

  function setSize(index: number, part: "size" | "quantity", value: string) {
    setSizes((current) =>
      current.map((row, i) => (i === index ? { ...row, [part]: value } : row)),
    );
    edited(`sizes.${index}.${part}`);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setFormError(null);
    setSaved(false);

    const fields = {
      name: values.name,
      slug: values.slug,
      categoryId: values.categoryId,
      price: values.price,
      color: values.color,
      description: values.description,
      details: values.details.split("\n"),
      care: values.care,
      isNew: values.isNew,
      images: values.images.map(({ url, alt }) => ({ url, alt })),
    };
    const stock = sized
      ? { sized: true, sizes: sizes.map(({ size, quantity }) => ({ size, quantity })) }
      : { sized: false, quantity };

    startTransition(async () => {
      try {
        const result =
          props.mode === "create"
            ? await createProduct({ fields, stock })
            : await updateProduct(props.productId, fields);

        switch (result.status) {
          case "ok":
            setErrors({});
            if ("id" in result) {
              router.push(`/admin/products/${result.id}`);
            } else {
              setSaved(true);
              router.refresh();
            }
            return;
          case "invalid":
            setErrors(result.errors);
            setFormError("Please fix the highlighted fields.");
            setFocusRequest((count) => count + 1);
            return;
          case "forbidden":
            setFormError("Your account no longer has admin access. Sign in as an admin to continue.");
            return;
          case "not-found":
            setFormError("This product no longer exists.");
            return;
          case "conflict":
            setFormError(result.message);
            return;
        }
      } catch {
        setFormError("We couldn't save the product. Check your connection and try again.");
      }
    });
  }

  const textarea = "field min-h-28 py-3";

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={onSubmit}
      aria-busy={pending}
      className="flex flex-col gap-12"
    >
      {formError && (
        <p role="alert" className="border-l-2 border-danger py-1 pl-4 text-body-sm text-danger">
          {formError}
        </p>
      )}

      <section aria-labelledby="product-details-title" className="flex flex-col gap-5">
        <h2 id="product-details-title" className="text-title">
          Details
        </h2>
        <div className="grid gap-5 md:grid-cols-2">
          <Field name="name" label="Name" error={errors.name}>
            {(control) => (
              <input
                {...control}
                type="text"
                value={values.name}
                onChange={(event) => {
                  const name = event.target.value;
                  setField("name", name);
                  if (!slugTouched) setField("slug", slugify(name));
                }}
                className="field"
              />
            )}
          </Field>
          <Field
            name="slug"
            label="URL slug"
            error={errors.slug}
            hint={
              creating
                ? `The product's address: /products/${values.slug || "…"}`
                : "Changing the slug changes the product's address; old links will stop working."
            }
          >
            {(control) => (
              <input
                {...control}
                type="text"
                autoCapitalize="none"
                spellCheck={false}
                value={values.slug}
                onChange={(event) => {
                  setSlugTouched(true);
                  setField("slug", event.target.value);
                }}
                className="field"
              />
            )}
          </Field>
        </div>
        <Field name="description" label="Description" error={errors.description}>
          {(control) => (
            <textarea
              {...control}
              rows={4}
              value={values.description}
              onChange={(event) => setField("description", event.target.value)}
              className={textarea}
            />
          )}
        </Field>
        <Field
          name="details"
          label="Details (optional)"
          hint="One per line, shown as a list on the product page."
          error={errors.details}
        >
          {(control) => (
            <textarea
              {...control}
              rows={4}
              value={values.details}
              onChange={(event) => setField("details", event.target.value)}
              className={textarea}
            />
          )}
        </Field>
        <Field name="care" label="Care (optional)" error={errors.care}>
          {(control) => (
            <textarea
              {...control}
              rows={2}
              value={values.care}
              onChange={(event) => setField("care", event.target.value)}
              className={textarea}
            />
          )}
        </Field>
        <div className="grid gap-5 md:grid-cols-2">
          <Field name="color" label="Colour (optional)" error={errors.color}>
            {(control) => (
              <input
                {...control}
                type="text"
                value={values.color}
                onChange={(event) => setField("color", event.target.value)}
                className="field"
              />
            )}
          </Field>
        </div>
        <label className="flex cursor-pointer items-center gap-3 self-start text-body-sm">
          <input
            type="checkbox"
            name="isNew"
            checked={values.isNew}
            onChange={(event) => setField("isNew", event.target.checked)}
            className="size-4 cursor-pointer accent-ink"
          />
          Show a &ldquo;New&rdquo; label on product cards
        </label>
      </section>

      <section aria-labelledby="product-pricing-title" className="flex flex-col gap-5">
        <h2 id="product-pricing-title" className="text-title">
          Category and price
        </h2>
        <div className="grid gap-5 md:grid-cols-2">
          <Field name="categoryId" label="Category" error={errors.categoryId}>
            {(control) => (
              <select
                {...control}
                value={values.categoryId}
                onChange={(event) => setField("categoryId", event.target.value)}
                className="field"
              >
                <option value="" disabled>
                  Choose a category
                </option>
                {props.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field
            name="price"
            label="Price (USD)"
            hint="In dollars, like 1250 or 199.99."
            error={errors.price}
          >
            {(control) => (
              <input
                {...control}
                type="text"
                inputMode="decimal"
                value={values.price}
                onChange={(event) => setField("price", event.target.value)}
                className="field tabular-nums"
              />
            )}
          </Field>
        </div>
      </section>

      <section aria-labelledby="product-images-title" className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h2 id="product-images-title" className="text-title">
            Images
          </h2>
          <p className="text-body-sm text-ink-muted">
            The first image is used on product cards. Use https links from{" "}
            {IMAGE_HOSTS.join(" or ")}.
          </p>
        </div>
        {errors.images && (
          <p role="alert" className="text-body-sm text-danger">
            {errors.images}
          </p>
        )}
        <ol className="flex flex-col gap-5">
          {values.images.map((image, index) => (
            <li
              key={image.key}
              className="grid items-start gap-4 border-b pb-5 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)_auto]"
            >
              <Field
                name={`images.${index}.url`}
                label={`Image ${index + 1} URL`}
                error={errors[`images.${index}.url`]}
              >
                {(control) => (
                  <input
                    {...control}
                    type="url"
                    autoCapitalize="none"
                    spellCheck={false}
                    value={image.url}
                    onChange={(event) => setImage(index, "url", event.target.value)}
                    className="field"
                  />
                )}
              </Field>
              <Field
                name={`images.${index}.alt`}
                label="Alt text"
                error={errors[`images.${index}.alt`]}
              >
                {(control) => (
                  <input
                    {...control}
                    type="text"
                    value={image.alt}
                    onChange={(event) => setImage(index, "alt", event.target.value)}
                    className="field"
                  />
                )}
              </Field>
              <button
                type="button"
                onClick={() => removeImage(index)}
                disabled={values.images.length === 1}
                aria-label={`Remove image ${index + 1}`}
                className="btn-icon self-end disabled:cursor-default disabled:opacity-40 md:mb-1"
              >
                <CloseIcon />
              </button>
            </li>
          ))}
        </ol>
        <button
          type="button"
          onClick={() => {
            setValues((current) => ({
              ...current,
              images: [...current.images, keyed({ url: "", alt: "" })],
            }));
            setSaved(false);
          }}
          disabled={values.images.length >= MAX_IMAGES}
          className="btn btn-secondary btn-sm self-start"
        >
          <PlusIcon />
          Add image
        </button>
      </section>

      {creating && (
        <section aria-labelledby="product-stock-title" className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <h2 id="product-stock-title" className="text-title">
              Availability
            </h2>
            <p className="text-body-sm text-ink-muted">
              How many units are available to sell. You can change quantities later.
            </p>
          </div>
          <label className="flex cursor-pointer items-center gap-3 self-start text-body-sm">
            <input
              type="checkbox"
              name="sized"
              checked={sized}
              onChange={(event) => {
                setSized(event.target.checked);
                setErrors((current) =>
                  withoutErrors(current, (key) => key === "quantity" || key.startsWith("sizes")),
                );
              }}
              className="size-4 cursor-pointer accent-ink"
            />
            This product comes in sizes
          </label>

          {sized ? (
            <>
              {errors.sizes && (
                <p role="alert" className="text-body-sm text-danger">
                  {errors.sizes}
                </p>
              )}
              <ol className="flex flex-col gap-4">
                {sizes.map((row, index) => (
                  <li
                    key={row.key}
                    className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-start gap-4"
                  >
                    <Field
                      name={`sizes.${index}.size`}
                      label={`Size ${index + 1}`}
                      error={errors[`sizes.${index}.size`]}
                    >
                      {(control) => (
                        <input
                          {...control}
                          type="text"
                          value={row.size}
                          onChange={(event) => setSize(index, "size", event.target.value)}
                          className="field"
                        />
                      )}
                    </Field>
                    <Field
                      name={`sizes.${index}.quantity`}
                      label="Quantity"
                      error={errors[`sizes.${index}.quantity`]}
                    >
                      {(control) => (
                        <input
                          {...control}
                          type="text"
                          inputMode="numeric"
                          value={row.quantity}
                          onChange={(event) => setSize(index, "quantity", event.target.value)}
                          className="field tabular-nums"
                        />
                      )}
                    </Field>
                    <button
                      type="button"
                      onClick={() => {
                        setSizes((current) => current.filter((_, i) => i !== index));
                        setErrors((current) =>
                          withoutErrors(current, (key) => key.startsWith("sizes")),
                        );
                      }}
                      disabled={sizes.length === 1}
                      aria-label={`Remove size ${index + 1}`}
                      className="btn-icon mt-8 disabled:cursor-default disabled:opacity-40"
                    >
                      <CloseIcon />
                    </button>
                  </li>
                ))}
              </ol>
              <button
                type="button"
                onClick={() => setSizes((current) => [...current, keyed({ size: "", quantity: "0" })])}
                disabled={sizes.length >= MAX_SIZES}
                className="btn btn-secondary btn-sm self-start"
              >
                <PlusIcon />
                Add size
              </button>
            </>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              <Field name="quantity" label="Quantity" error={errors.quantity}>
                {(control) => (
                  <input
                    {...control}
                    type="text"
                    inputMode="numeric"
                    value={quantity}
                    onChange={(event) => {
                      setQuantity(event.target.value);
                      edited("quantity");
                    }}
                    className="field tabular-nums"
                  />
                )}
              </Field>
            </div>
          )}
        </section>
      )}

      <div className="flex flex-wrap items-center gap-4 border-t pt-8">
        <button type="submit" disabled={pending} aria-busy={pending} className="btn btn-primary">
          {pending ? (
            <>
              <SpinnerIcon />
              Saving…
            </>
          ) : creating ? (
            "Create product"
          ) : (
            "Save changes"
          )}
        </button>
        <p role="status" className="text-body-sm text-success empty:hidden">
          {saved ? "Changes saved." : ""}
        </p>
        <p role="status" className="sr-only">
          {pending ? "Saving product" : ""}
        </p>
      </div>
    </form>
  );
}
