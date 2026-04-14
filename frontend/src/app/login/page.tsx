"use client";

import { useActionState, useEffect, useRef } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { loginAction } from "@/lib/actions/auth";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="grid w-full max-w-5xl gap-0 overflow-hidden rounded-2xl shadow-[0_24px_60px_-20px_rgba(15,61,46,0.18)] lg:grid-cols-[1.1fr_0.9fr]">
        {/* Sol Panel — Deep Forest */}
        <div className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[#0F3D2E] to-[#1a5240] p-10 text-white lg:p-12">
          {/* Dekoratif daireler */}
          <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-[#1D9E75]/20" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 size-64 rounded-full bg-[#1D9E75]/10" />

          <div className="relative z-10 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur-sm">
              <ShieldCheck className="size-4" />
              Güvenli Yönetici Girişi
            </div>

            <h1 className="max-w-md font-serif text-4xl font-bold leading-tight lg:text-5xl">
              Akademik yönetimi net ve sakin bir panelle yürütün.
            </h1>

            <p className="max-w-md text-base leading-7 text-white/70">
              Yaşlı kullanıcılar ve koordinasyon ekibi için hazırlanan bu
              deneyimde güçlü kontrast ve anlaşılır onay akışları bulunur.
            </p>
          </div>

          <div className="relative z-10 mt-12 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/8 p-5 backdrop-blur-sm">
              <div className="text-2xl font-bold">Rahat</div>
              <p className="mt-2 text-sm leading-6 text-white/65">
                Butonlar ve metinler rahat kullanıma göre ölçeklendi.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/8 p-5 backdrop-blur-sm">
              <div className="text-2xl font-bold">Onaylı</div>
              <p className="mt-2 text-sm leading-6 text-white/65">
                Kritik işlemler ikinci onay almadan tamamlanmaz.
              </p>
            </div>
          </div>
        </div>

        {/* Sağ Panel — Login Formu */}
        <div className="flex flex-col justify-center bg-white p-10 lg:p-12">
          <div className="mb-8 space-y-4">
            <div className="flex size-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <KeyRound className="size-7" />
            </div>
            <div className="panel-label">Yönetici Girişi</div>
            <h2 className="font-serif text-3xl font-bold text-foreground">
              Admin paneline giriş yapın
            </h2>
            <p className="text-base leading-7 text-muted-foreground">
              TC kimlik numaranız ve 4 haneli PIN kodunuz ile giriş
              yapabilirsiniz.
            </p>
          </div>

          <form ref={formRef} action={formAction} className="space-y-6">
            {/* TC No */}
            <div className="space-y-2">
              <label
                htmlFor="tcNo"
                className="text-sm font-semibold text-foreground"
              >
                TC Kimlik Numarası
              </label>
              <p className="text-xs text-muted-foreground">
                11 haneli numaranızı arada boşluk bırakmadan girin.
              </p>
              <input
                id="tcNo"
                name="tcNo"
                type="text"
                inputMode="numeric"
                maxLength={11}
                autoComplete="username"
                placeholder="11111111111"
                required
                className="h-12 w-full rounded-xl border border-border bg-secondary/50 px-4 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>

            {/* PIN */}
            <div className="space-y-2">
              <label
                htmlFor="pin"
                className="text-sm font-semibold text-foreground"
              >
                PIN Kodu
              </label>
              <p className="text-xs text-muted-foreground">
                Sisteme ait 4 haneli yönetici PIN kodunuzu kullanın.
              </p>
              <input
                id="pin"
                name="pin"
                type="password"
                inputMode="numeric"
                maxLength={4}
                autoComplete="current-password"
                placeholder="****"
                required
                className="h-12 w-full rounded-xl border border-border bg-secondary/50 px-4 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isPending}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-primary to-[#008560] font-bold text-white transition-all hover:shadow-lg hover:shadow-primary/20 disabled:opacity-60"
            >
              {isPending ? "Giriş yapılıyor..." : "Panele giriş yap"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
