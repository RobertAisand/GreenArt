"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Leaf, LogOut } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { useProfile } from "@/hooks/useProfile";
import { authService } from "@/services/auth.service";

export function Header() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: user } = useProfile();

  async function handleLogout() {
    try {
      await authService.logout();
      queryClient.removeQueries({ queryKey: ["profile"] });
      toast.success("Вы вышли из аккаунта");
      router.push("/auth");
      router.refresh();
    } catch {
      toast.error("Не удалось выйти");
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Leaf className="size-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight">
            Green<span className="text-primary">Art</span>
          </span>
        </Link>

        <nav className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="text-muted-foreground hover:text-foreground hidden text-sm font-medium sm:inline"
              >
                {user.name || user.email}
              </Link>
              <Button variant="outline" size="lg" onClick={handleLogout}>
                <LogOut className="size-4" />
                Выйти
              </Button>
            </>
          ) : (
            <Button asChild size="lg">
              <Link href="/auth">Войти</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
