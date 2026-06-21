"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { useProfile } from "@/hooks/useProfile";
import { authService } from "@/services/auth.service";

export function Dashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: user, isLoading, isError } = useProfile();

  async function handleLogout() {
    try {
      await authService.logout();
      queryClient.removeQueries({ queryKey: ["profile"] });
      toast.success("Вы вышли из аккаунта");
      router.push("/auth");
    } catch {
      toast.error("Не удалось выйти");
    }
  }

  if (isLoading) {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <p className="text-muted-foreground">Загружаем профиль…</p>
      </main>
    );
  }

  if (isError || !user) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <p className="text-destructive">Не удалось загрузить профиль</p>
        <Button onClick={() => router.push("/auth")}>На страницу входа</Button>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 p-6">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Личный кабинет</h1>
          <p className="text-muted-foreground text-sm">
            Добро пожаловать, {user.name || user.email}
          </p>
        </div>
        <Button variant="outline" size="lg" onClick={handleLogout}>
          Выйти
        </Button>
      </header>

      <section className="grid gap-4 rounded-xl border border-border p-6">
        <Field label="Имя" value={user.name || "—"} />
        <Field label="Email" value={user.email} />
        <Field
          label="Роль"
          value={user.role === "admin" ? "Администратор" : "Покупатель"}
        />
        <Field label="Заказов" value={String(user.orders?.length ?? 0)} />
      </section>
    </main>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
