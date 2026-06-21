import Link from "next/link";
import { ArrowRight, Flower2, Leaf, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

export function Home() {
  return (
    <main className="flex flex-1 flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-background to-emerald-100 dark:from-emerald-950/40 dark:via-background dark:to-emerald-900/30">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-24 text-center sm:py-32">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-4 py-1.5 text-sm font-medium text-primary backdrop-blur">
            <Sparkles className="size-4" />
            Свежесть и эстетика каждый день
          </span>

          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            GreenArt — Цветы и искусство
            <span className="text-primary"> в вашем доме</span>
          </h1>

          <p className="text-muted-foreground max-w-xl text-lg text-pretty">
            Авторские букеты, растения и декор ручной работы. Превращаем
            обычные дни в маленькие праздники — с заботой о каждой детали.
          </p>

          <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="h-11 px-6 text-base">
              <Link href="/dashboard">
                Перейти в каталог
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-11 px-6 text-base"
            >
              <Link href="/auth">Войти</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Преимущества */}
      <section className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-16 sm:grid-cols-3">
        <Feature
          icon={<Flower2 className="size-6" />}
          title="Авторские букеты"
          text="Каждую композицию флористы собирают вручную из свежих сезонных цветов."
        />
        <Feature
          icon={<Leaf className="size-6" />}
          title="Живые растения"
          text="Здоровые растения для дома и офиса с понятными советами по уходу."
        />
        <Feature
          icon={<Sparkles className="size-6" />}
          title="Бережная доставка"
          text="Доставим вовремя и в идеальном виде — красота не пострадает в пути."
        />
      </section>
    </main>
  );
}

function Feature({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-md hover:shadow-emerald-900/5">
      <span className="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </span>
      <h3 className="mb-1.5 text-lg font-semibold">{title}</h3>
      <p className="text-muted-foreground text-sm">{text}</p>
    </div>
  );
}
