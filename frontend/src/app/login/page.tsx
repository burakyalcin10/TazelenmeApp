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

    if (tcNo.length !== 11) {
      toast.error("TC kimlik numarasi 11 haneli olmalidir.");
      return;
    }

    if (pin.length !== 4) {
      toast.error("PIN kodu 4 haneli olmalidir.");
      return;
    }

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
      <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[1.12fr_0.88fr]">
        <div className="relative overflow-hidden rounded-[2.8rem] bg-[linear-gradient(145deg,color-mix(in_oklab,var(--primary)_92%,white),color-mix(in_oklab,var(--primary)_72%,#0d4d72))] p-8 text-primary-foreground shadow-[0_34px_80px_-42px_rgba(29,61,93,0.55)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.24),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.12),transparent_28%)]" />
          <div className="flex h-full flex-col justify-between gap-10">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-3 rounded-full border border-white/16 bg-white/12 px-4 py-2 text-sm font-semibold backdrop-blur-sm">
                <ShieldCheck className="size-4" />
                Guvenli Yonetici Girisi
              </div>
              <h1 className="max-w-2xl text-balance-soft text-4xl font-semibold leading-tight sm:text-[3.4rem]">
                Ogrenci ve ders yonetimini net, sakin ve modern bir panelle yonetin.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-primary-foreground/86">
                Yasli kullanicilar ve koordinasyon ekibi icin hazirlanan bu deneyimde buyuk hedef alanlari,
                guclu kontrast ve anlasilir onay akislari bulunur.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[2rem] border border-white/16 bg-white/12 p-5 backdrop-blur-sm">
                <div className="text-3xl font-semibold">Rahat</div>
                <div className="mt-2 text-base leading-7 text-primary-foreground/85">
                  Butonlar, form alanlari ve metinler rahat kullanima gore olceklendi.
                </div>
              </div>
              <div className="rounded-[2rem] border border-white/16 bg-white/12 p-5 backdrop-blur-sm">
                <div className="text-3xl font-semibold">Onayli</div>
                <div className="mt-2 text-base leading-7 text-primary-foreground/85">
                  Kritik islemler ikinci onay almadan tamamlanmaz.
                </div>
              </div>
            </div>
          </div>
        </div>

        <Card className="rounded-[2.8rem] border-0 bg-white/92 shadow-[0_34px_80px_-48px_rgba(34,62,97,0.4)]">
          <CardHeader className="space-y-3 p-8">
            <div className="flex size-16 items-center justify-center rounded-[1.4rem] bg-primary/10 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]">
              <KeyRound className="size-8" />
            </div>
            <div className="panel-label">Yonetici Girisi</div>
            <CardTitle className="text-3xl font-semibold sm:text-[2.2rem]">Admin paneline giris yapin</CardTitle>
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

              <Button className="w-full" size="xl" type="submit" disabled={submitting}>
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
