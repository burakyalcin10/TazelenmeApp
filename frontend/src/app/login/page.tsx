"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/components/app/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/app/form-field";
import { Input } from "@/components/ui/input";

function LoginPageContent() {
  const { login, status } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tcNo, setTcNo] = useState("");
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(searchParams.get("next") || "/admin");
    }
  }, [router, searchParams, status]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);

    try {
      await login(tcNo, pin);
      toast.success("Giris basarili. Admin paneline yonlendiriliyorsunuz.");
      router.replace(searchParams.get("next") || "/admin");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Giris yapilirken bir sorun olustu.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="panel-shell flex min-h-screen items-center justify-center">
      <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[2.5rem] bg-gradient-to-br from-primary to-sky-600 p-8 text-primary-foreground shadow-xl">
          <div className="flex h-full flex-col justify-between gap-10">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-3 rounded-full bg-white/12 px-4 py-2 text-sm font-semibold">
                <ShieldCheck className="size-4" />
                Guvenli Yonetici Girisi
              </div>
              <h1 className="max-w-2xl text-balance-soft text-4xl font-semibold leading-tight sm:text-5xl">
                TazelenmeApp ile ogrenci, yoklama ve ders surecini sakin bir deneyimle yonetin.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-primary-foreground/86">
                Yasli kullanicilar ve koordinasyon ekibi icin hazirlanan bu panelde buyuk butonlar,
                net metinler ve onayli islem akislari bulunur.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[2rem] bg-white/12 p-5">
                <div className="text-3xl font-semibold">Buyuk</div>
                <div className="mt-2 text-base leading-7 text-primary-foreground/85">
                  Butonlar, form alanlari ve metinler rahat kullanima gore olceklendi.
                </div>
              </div>
              <div className="rounded-[2rem] bg-white/12 p-5">
                <div className="text-3xl font-semibold">Onayli</div>
                <div className="mt-2 text-base leading-7 text-primary-foreground/85">
                  Kritik islemler ikinci onay almadan tamamlanmaz.
                </div>
              </div>
            </div>
          </div>
        </div>

        <Card className="rounded-[2.5rem] border-0 bg-white/95 shadow-xl ring-1 ring-foreground/10">
          <CardHeader className="space-y-3 p-8">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <KeyRound className="size-8" />
            </div>
            <CardTitle className="text-3xl font-semibold">Admin paneline giris yapin</CardTitle>
            <p className="text-lg leading-8 text-muted-foreground">
              TC kimlik numaraniz ve 4 haneli PIN kodunuz ile giris yapabilirsiniz.
            </p>
          </CardHeader>
          <CardContent className="p-8 pt-0">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <FormField
                label="TC Kimlik Numarasi"
                description="11 haneli numaranizi arada bosluk birakmadan girin."
                htmlFor="tcNo"
              >
                <Input
                  id="tcNo"
                  inputMode="numeric"
                  maxLength={11}
                  autoComplete="username"
                  placeholder="11111111111"
                  value={tcNo}
                  onChange={(event) => setTcNo(event.target.value.replace(/\D/g, "").slice(0, 11))}
                />
              </FormField>

              <FormField
                label="PIN Kodu"
                description="Sisteme ait 4 haneli yonetici PIN kodunuzu kullanin."
                htmlFor="pin"
              >
                <Input
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  autoComplete="current-password"
                  placeholder="****"
                  value={pin}
                  onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
                />
              </FormField>

              <Button className="w-full" size="xl" disabled={submitting || tcNo.length !== 11 || pin.length !== 4}>
                {submitting ? "Giris yapiliyor..." : "Panele giris yap"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="panel-shell min-h-screen bg-background" />}>
      <LoginPageContent />
    </Suspense>
  );
}
