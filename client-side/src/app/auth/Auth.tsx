"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { Leaf } from "lucide-react";
import toast from "react-hot-toast";
import { FcGoogle } from "react-icons/fc";
import { FaYandex } from "react-icons/fa6";

import { Button } from "@/components/ui/button";
import { getOAuthUrl } from "@/constants/api.constants";
import { authService } from "@/services/auth.service";
import type { IAuthForm } from "@/shared/types/auth.interface";

type AuthType = "login" | "register";

const EMPTY_FORM: IAuthForm = { name: "", email: "", password: "" };

/** Достаём человекочитаемое сообщение из ошибки бэкенда. */
function extractError(error: unknown): string {
  const axiosError = error as AxiosError<{ message?: string | string[] }>;
  const message = axiosError?.response?.data?.message;

  if (Array.isArray(message)) return message.join(", ");
  if (typeof message === "string") return message;
  return "Что-то пошло не так. Попробуйте ещё раз.";
}

export function Auth() {
  const router = useRouter();
  const [type, setType] = useState<AuthType>("login");
  const [form, setForm] = useState<IAuthForm>(EMPTY_FORM);

  const isRegister = type === "register";

  const { mutate, isPending } = useMutation({
    mutationKey: ["auth", type],
    mutationFn: (data: IAuthForm) => authService.main(type, data),
    onSuccess() {
      toast.success(isRegister ? "Аккаунт создан!" : "С возвращением!");
      setForm(EMPTY_FORM);
      router.push("/dashboard");
    },
    onError(error) {
      toast.error(extractError(error));
    },
  });

  function switchType(next: AuthType) {
    if (next === type) return;
    setType(next);
  }

  function updateField(field: keyof IAuthForm) {
    return (event: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const payload: IAuthForm = isRegister
      ? form
      : { email: form.email, password: form.password };
    mutate(payload);
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-gradient-to-br from-emerald-50 via-background to-emerald-100 p-4 dark:from-emerald-950/40 dark:via-background dark:to-emerald-900/30">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card/80 p-8 shadow-xl shadow-emerald-900/5 backdrop-blur">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Leaf className="size-6" />
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">
            Green<span className="text-primary">Art</span>
          </h1>
          <p className="text-muted-foreground text-sm">
            {isRegister
              ? "Создайте аккаунт, чтобы начать покупки"
              : "Войдите в свой аккаунт"}
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
          {(["login", "register"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => switchType(tab)}
              className={`rounded-lg py-2 text-sm font-medium transition-colors ${
                type === tab
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "login" ? "Вход" : "Регистрация"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {isRegister && (
            <Field label="Имя">
              <input
                type="text"
                value={form.name}
                onChange={updateField("name")}
                placeholder="Как к вам обращаться"
                autoComplete="name"
                className={inputClass}
              />
            </Field>
          )}

          <Field label="Email">
            <input
              type="email"
              required
              value={form.email}
              onChange={updateField("email")}
              placeholder="you@example.com"
              autoComplete="email"
              className={inputClass}
            />
          </Field>

          <Field label="Пароль">
            <input
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={updateField("password")}
              placeholder="Минимум 6 символов"
              autoComplete={isRegister ? "new-password" : "current-password"}
              className={inputClass}
            />
          </Field>

          <Button
            type="submit"
            size="lg"
            disabled={isPending}
            className="mt-2 h-11 w-full text-base"
          >
            {isPending
              ? "Подождите…"
              : isRegister
                ? "Создать аккаунт"
                : "Войти"}
          </Button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="text-muted-foreground text-xs uppercase">
            или
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <div className="grid gap-3">
          <Button asChild variant="outline" size="lg" className="h-11 w-full">
            <a href={getOAuthUrl("google")}>
              <FcGoogle className="size-5" />
              Продолжить с Google
            </a>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-11 w-full">
            <a href={getOAuthUrl("yandex")}>
              <FaYandex className="size-5 text-[#FC3F1D]" />
              Продолжить с Yandex
            </a>
          </Button>
        </div>

        <p className="text-muted-foreground mt-6 text-center text-sm">
          {isRegister ? "Уже есть аккаунт? " : "Нет аккаунта? "}
          <button
            type="button"
            onClick={() => switchType(isRegister ? "login" : "register")}
            className="font-medium text-primary hover:underline"
          >
            {isRegister ? "Войти" : "Зарегистрироваться"}
          </button>
        </p>
      </div>
    </main>
  );
}

const inputClass =
  "w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-foreground text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
