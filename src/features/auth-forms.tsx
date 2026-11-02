"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CATEGORIES } from "@/core/catalog";
import {
  acceptInviteAction,
  createBusinessAction,
  newPasswordAction,
  resetPasswordAction,
  signInAction,
  signUpAction,
} from "@/server/actions/account";
import type { ActionResult } from "@/server/action";
import { Field, Input, Notice, Select, SubmitButton } from "@/ui/form";

type State = ActionResult<null> | null;
const err = (s: State, field: string) => (s && !s.ok ? s.fields?.[field] : undefined);
const topError = (s: State) => (s && !s.ok && !s.fields ? s.error : s && !s.ok && s.fields?._ ? s.error : null);

export function SignInForm({ next }: { next?: string }) {
  const [state, action] = useActionState<State, FormData>(signInAction, null);
  return (
    <form action={action} className="grid gap-5" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Correo" htmlFor="email" error={err(state, "email")}>
        <Input id="email" name="email" type="email" autoComplete="email" required invalid={Boolean(err(state, "email"))} />
      </Field>
      <Field label="Contraseña" htmlFor="password" error={err(state, "password")}>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      {state && !state.ok && !state.fields ? <Notice tone="error">{state.error}</Notice> : null}
      <SubmitButton pending="Entrando…">Entrar</SubmitButton>
      <div className="flex justify-between text-sm">
        <Link href="/recuperar" className="text-ink-2 underline-offset-4 hover:text-ink hover:underline">
          Olvidé mi contraseña
        </Link>
        <Link href="/registro" className="font-semibold text-ink underline-offset-4 hover:underline">
          Crear cuenta
        </Link>
      </div>
    </form>
  );
}

function CategorySelect({ error }: { error?: string }) {
  return (
    <Field label="Giro" htmlFor="category" error={error} hint="Con esto te sugerimos el premio y el ícono del sello.">
      <Select id="category" name="category" defaultValue="" required>
        <option value="" disabled>
          Elige uno
        </option>
        {CATEGORIES.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </Select>
    </Field>
  );
}

export function SignUpForm() {
  const [state, action] = useActionState<State, FormData>(signUpAction, null);
  return (
    <form action={action} className="grid gap-5" noValidate>
      <Field label="Nombre de tu negocio" htmlFor="businessName" error={err(state, "businessName")}>
        <Input id="businessName" name="businessName" autoComplete="organization" placeholder="Café La Esquina" required />
      </Field>
      <CategorySelect error={err(state, "category")} />
      <Field label="Tu nombre" htmlFor="ownerName" error={err(state, "ownerName")}>
        <Input id="ownerName" name="ownerName" autoComplete="name" required />
      </Field>
      <Field label="Correo" htmlFor="email" error={err(state, "email")}>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Contraseña" htmlFor="password" error={err(state, "password")} hint="Mínimo 8 caracteres.">
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      {state && !state.ok && !state.fields ? (
        <Notice tone="error">
          {state.error}
          {state.code === "email_taken" ? (
            <>
              {" "}
              <Link href="/login" className="font-semibold underline">
                Entrar
              </Link>
            </>
          ) : null}
        </Notice>
      ) : null}
      <SubmitButton variant="accent" pending="Creando tu tarjeta…">
        Crear mi cuenta gratis
      </SubmitButton>
      <p className="text-center text-sm text-ink-2">
        14 días del plan Pro, sin tarjeta de crédito. ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-semibold text-ink underline-offset-4 hover:underline">
          Entra
        </Link>
      </p>
    </form>
  );
}

/** Para alguien con sesión (por ejemplo un cajero) que quiere abrir su propio negocio. */
export function CreateBusinessForm({ defaultName }: { defaultName: string }) {
  const [state, action] = useActionState<State, FormData>(createBusinessAction, null);
  return (
    <form action={action} className="grid gap-5" noValidate>
      <Field label="Nombre de tu negocio" htmlFor="businessName" error={err(state, "businessName")}>
        <Input id="businessName" name="businessName" required />
      </Field>
      <CategorySelect error={err(state, "category")} />
      <Field label="Tu nombre" htmlFor="ownerName">
        <Input id="ownerName" name="ownerName" defaultValue={defaultName} required />
      </Field>
      {topError(state) ? <Notice tone="error">{topError(state)}</Notice> : null}
      <SubmitButton variant="accent" pending="Creando…">
        Crear mi negocio
      </SubmitButton>
    </form>
  );
}

export function ResetForm() {
  const [state, action] = useActionState<State, FormData>(resetPasswordAction, null);
  if (state?.ok) {
    return <Notice tone="ok">Si ese correo tiene cuenta, te llegó un enlace para elegir una nueva contraseña. Revisa también tu correo no deseado.</Notice>;
  }
  return (
    <form action={action} className="grid gap-5" noValidate>
      <Field label="Correo de tu cuenta" htmlFor="email" error={err(state, "email")}>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      {topError(state) ? <Notice tone="error">{topError(state)}</Notice> : null}
      <SubmitButton pending="Enviando…">Enviarme el enlace</SubmitButton>
    </form>
  );
}

export function NewPasswordForm() {
  const [state, action] = useActionState<State, FormData>(newPasswordAction, null);
  return (
    <form action={action} className="grid gap-5" noValidate>
      <Field label="Nueva contraseña" htmlFor="password" error={err(state, "password")} hint="Mínimo 8 caracteres.">
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      {topError(state) ? <Notice tone="error">{topError(state)}</Notice> : null}
      <SubmitButton pending="Guardando…">Guardar contraseña</SubmitButton>
    </form>
  );
}

export function AcceptInviteForm({ token, signedIn, suggestedName }: { token: string; signedIn: boolean; suggestedName: string }) {
  const [state, action] = useActionState<State, FormData>(acceptInviteAction, null);
  return (
    <form action={action} className="grid gap-5" noValidate>
      <input type="hidden" name="token" value={token} />
      <Field label="Tu nombre" htmlFor="name" error={err(state, "name")} hint="Así aparecerás en los reportes de caja.">
        <Input id="name" name="name" defaultValue={suggestedName} autoComplete="name" required />
      </Field>
      {signedIn ? null : (
        <>
          <Field label="Correo" htmlFor="email" error={err(state, "email")}>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </Field>
          <Field label="Contraseña" htmlFor="password" error={err(state, "password")} hint="Mínimo 8 caracteres.">
            <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
          </Field>
        </>
      )}
      {state && !state.ok && !state.fields ? (
        <Notice tone="error">
          {state.error}
          {state.code === "email_taken" ? (
            <>
              {" "}
              <Link href={`/login?next=/invitacion/${token}`} className="font-semibold underline">
                Entrar y aceptar
              </Link>
            </>
          ) : null}
        </Notice>
      ) : null}
      <SubmitButton variant="accent" pending="Uniéndote…">
        Unirme al equipo
      </SubmitButton>
    </form>
  );
}
