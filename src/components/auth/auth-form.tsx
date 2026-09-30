"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { SpinnerIcon } from "@/components/icons";
import { authClient } from "@/lib/auth/client";

type Mode = "sign-in" | "sign-up";
type FieldName = "name" | "email" | "password";
type Values = Record<FieldName, string>;
type FieldErrors = Partial<Record<FieldName, string>>;

// Must match emailAndPassword.minPasswordLength in src/lib/auth/index.ts
// (the maximum is Better Auth's default).
const MIN_PASSWORD = 8;
const MAX_PASSWORD = 128;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(mode: Mode, values: Values): FieldErrors {
  const errors: FieldErrors = {};
  if (mode === "sign-up" && !values.name.trim()) {
    errors.name = "Please enter your full name.";
  }

  const email = values.email.trim();
  if (!email) errors.email = "Please enter your email address.";
  else if (!EMAIL_PATTERN.test(email)) {
    errors.email = "Please enter a valid email address, like name@example.com.";
  }

  if (!values.password) {
    errors.password =
      mode === "sign-up" ? "Please create a password." : "Please enter your password.";
  } else if (mode === "sign-up" && values.password.length < MIN_PASSWORD) {
    errors.password = `Use at least ${MIN_PASSWORD} characters.`;
  } else if (mode === "sign-up" && values.password.length > MAX_PASSWORD) {
    errors.password = `Use ${MAX_PASSWORD} characters or fewer.`;
  }
  return errors;
}

type ServerError = { code?: string; status?: number } | null | undefined;

/** Turns a Better Auth error into a field error and/or a message above the form. */
function describeServerError(
  error: ServerError,
  signInHref: string,
): { field?: FieldErrors; form?: ReactNode } {
  switch (error?.code) {
    case "INVALID_EMAIL_OR_PASSWORD":
      return { form: "The email or password is incorrect. Please try again." };
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return {
        field: { email: "Use a different email, or sign in to your account." },
        form: (
          <>
            An account already exists with this email.{" "}
            <Link href={signInHref} className="link">
              Sign in instead
            </Link>
          </>
        ),
      };
    case "INVALID_EMAIL":
      return { field: { email: "Please enter a valid email address." } };
    case "PASSWORD_TOO_SHORT":
      return { field: { password: `Use at least ${MIN_PASSWORD} characters.` } };
    case "PASSWORD_TOO_LONG":
      return { field: { password: `Use ${MAX_PASSWORD} characters or fewer.` } };
  }
  if (error?.status === 429) {
    return { form: "Too many attempts. Please wait a moment and try again." };
  }
  if (!error?.status) {
    return { form: "We couldn't connect. Check your connection and try again." };
  }
  return { form: "Something went wrong on our side. Please try again." };
}

/** Email + password form for sign-in and sign-up; redirects to `redirectTo` on success. */
export function AuthForm({ mode, redirectTo }: { mode: Mode; redirectTo: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState<Values>({ name: "", email: "", password: "" });
  // Field errors show once a field has been left, or after the first submit.
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<ReactNode>(null);
  const [pending, setPending] = useState(false);

  const clientErrors = validate(mode, values);
  const errorFor = (field: FieldName) =>
    serverErrors[field] ??
    (submitted || touched[field] ? clientErrors[field] : undefined);

  function update(field: FieldName, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setServerErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setSubmitted(true);
    setFormError(null);
    setServerErrors({});

    const firstInvalid = (["name", "email", "password"] as const).find(
      (field) => clientErrors[field],
    );
    if (firstInvalid) {
      formRef.current?.querySelector<HTMLInputElement>(`[name="${firstInvalid}"]`)?.focus();
      return;
    }

    setPending(true);
    const email = values.email.trim();
    let error: ServerError;
    try {
      ({ error } =
        mode === "sign-up"
          ? await authClient.signUp.email({ name: values.name.trim(), email, password: values.password })
          : await authClient.signIn.email({ email, password: values.password }));
    } catch {
      error = { status: 0 };
    }

    if (!error) {
      // Keep the loading state until the next page has rendered.
      router.replace(redirectTo);
      router.refresh();
      return;
    }

    const signInHref = `/sign-in?redirectTo=${encodeURIComponent(redirectTo)}`;
    const { field, form } = describeServerError(error, signInHref);
    setServerErrors(field ?? {});
    setFormError(form ?? null);
    setPending(false);
    let focusField = (["email", "password"] as const).find((name) => field?.[name]);
    if (mode === "sign-in") {
      // Clear the password for a fresh attempt without flagging it as missing.
      setValues((current) => ({ ...current, password: "" }));
      setSubmitted(false);
      setTouched({});
      focusField ??= "password";
    }
    if (focusField) {
      formRef.current?.querySelector<HTMLInputElement>(`[name="${focusField}"]`)?.focus();
    }
  }

  const busyLabel = mode === "sign-up" ? "Creating your account…" : "Signing in…";

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      noValidate
      aria-busy={pending}
      className="flex flex-col gap-5"
    >
      {formError && (
        <p role="alert" className="border-l-2 border-danger py-1 pl-4 text-body-sm text-danger">
          {formError}
        </p>
      )}

      {mode === "sign-up" && (
        <Field
          label="Full name"
          name="name"
          type="text"
          autoComplete="name"
          value={values.name}
          error={errorFor("name")}
          readOnly={pending}
          onChange={(value) => update("name", value)}
          onBlur={() => setTouched((t) => ({ ...t, name: true }))}
        />
      )}
      <Field
        label="Email address"
        name="email"
        type="email"
        autoComplete="email"
        value={values.email}
        error={errorFor("email")}
        readOnly={pending}
        onChange={(value) => update("email", value)}
        onBlur={() => setTouched((t) => ({ ...t, email: true }))}
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
        value={values.password}
        hint={mode === "sign-up" ? `At least ${MIN_PASSWORD} characters.` : undefined}
        error={errorFor("password")}
        readOnly={pending}
        onChange={(value) => update("password", value)}
        onBlur={() => setTouched((t) => ({ ...t, password: true }))}
      />

      <button type="submit" className="btn btn-primary btn-block mt-2">
        {pending ? (
          <>
            <SpinnerIcon />
            {busyLabel}
          </>
        ) : mode === "sign-up" ? (
          "Create account"
        ) : (
          "Sign in"
        )}
      </button>
      <p role="status" className="sr-only">
        {pending ? busyLabel : ""}
      </p>
    </form>
  );
}

function Field({
  label,
  name,
  type,
  autoComplete,
  value,
  hint,
  error,
  readOnly,
  onChange,
  onBlur,
}: {
  label: string;
  name: FieldName;
  type: "text" | "email" | "password";
  autoComplete: string;
  value: string;
  hint?: string;
  error?: string;
  readOnly: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  const id = `auth-${name}`;
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-body-sm">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required
        value={value}
        readOnly={readOnly}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        {...(type === "email" && { autoCapitalize: "none", spellCheck: false })}
        className="field read-only:text-ink-muted"
      />
      {hint && !error && (
        <p id={`${id}-hint`} className="text-caption text-ink-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-caption text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
