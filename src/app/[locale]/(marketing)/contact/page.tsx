"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { HeroBackdrop } from "@/components/ui/HeroBackdrop";
import { SITE, RESEARCH_SERVICES, ENGINEERING_SERVICES } from "@/lib/constants";

export default function ContactPage() {
  const t = useTranslations("contactPage");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    phone: "",
    service_interest: "",
    message: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const serviceOptions = [
    ...RESEARCH_SERVICES.map((s) => s.title),
    ...ENGINEERING_SERVICES.map((s) => s.shortTitle),
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, source_page: "/contact" }),
      });
      if (res.ok) {
        setStatus("success");
        setFormData({ name: "", email: "", company: "", phone: "", service_interest: "", message: "" });
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  const inputStyles = "w-full rounded-lg border border-card-border bg-card-bg px-4 py-3 text-sm text-foreground placeholder:text-muted/50 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue";

  return (
    <>
    <section className="relative overflow-hidden py-20 sm:py-24 lg:py-28">
      <HeroBackdrop variant="blue" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand-blue mb-4">
          {t("heroEyebrow")}
        </p>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-heading">
          {t("heroTitle")}
        </h1>
        <p className="mt-5 text-base sm:text-lg text-muted max-w-2xl mx-auto leading-relaxed">
          {t("heroSubtitle")}
        </p>
      </div>
    </section>

    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Form */}
          <div className="lg:col-span-2">

            {status === "success" ? (
              <div className="p-6 rounded-xl bg-brand-teal/10 border border-brand-teal/20 text-center">
                <h3 className="text-lg font-semibold text-brand-teal mb-2">{t("successTitle")}</h3>
                <p className="text-muted">{t("successBody")}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">{t("labelName")}</label>
                    <input name="name" value={formData.name} onChange={handleChange} required className={inputStyles} placeholder={t("placeholderName")} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">{t("labelEmail")}</label>
                    <input name="email" type="email" value={formData.email} onChange={handleChange} required className={inputStyles} placeholder="your@email.com" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">{t("labelCompany")}</label>
                    <input name="company" value={formData.company} onChange={handleChange} className={inputStyles} placeholder={t("placeholderCompany")} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">{t("labelPhone")}</label>
                    <input name="phone" value={formData.phone} onChange={handleChange} className={inputStyles} placeholder="+1 (555) 123-4567" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">{t("labelService")}</label>
                  <select name="service_interest" value={formData.service_interest} onChange={handleChange} className={inputStyles}>
                    <option value="">{t("selectService")}</option>
                    <optgroup label={t("optgroupResearch")}>
                      {RESEARCH_SERVICES.map((s) => (<option key={s.id} value={s.title}>{s.title}</option>))}
                    </optgroup>
                    <optgroup label={t("optgroupImpl")}>
                      {ENGINEERING_SERVICES.map((s) => (<option key={s.id} value={s.shortTitle}>{s.shortTitle}</option>))}
                    </optgroup>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">{t("labelMessage")}</label>
                  <textarea name="message" value={formData.message} onChange={handleChange} required rows={5} className={inputStyles} placeholder={t("placeholderMessage")} />
                </div>
                {status === "error" && (
                  <p className="text-red-400 text-sm">{t("errorMsg")}</p>
                )}
                <Button type="submit" disabled={status === "loading"}>
                  {status === "loading" ? t("sending") : t("sendMessage")}
                </Button>
              </form>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            <div className="p-6 rounded-xl bg-card-bg border border-card-border">
              <h3 className="text-lg font-semibold text-heading mb-4">{t("contactInfo")}</h3>
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-muted/60 mb-1">{t("fieldEmail")}</p>
                  <p className="text-brand-teal">{SITE.email}</p>
                </div>
                <div>
                  <p className="text-muted/60 mb-1">{t("fieldPhoneDubai")}</p>
                  <p className="text-foreground">{SITE.phone.dubai}</p>
                </div>
                <div>
                  <p className="text-muted/60 mb-1">{t("fieldPhoneIndia")}</p>
                  <p className="text-foreground">{SITE.phone.india}</p>
                </div>
                <div>
                  <p className="text-muted/60 mb-1">{t("fieldOffice")}</p>
                  <p className="text-foreground">{SITE.locations.primary}</p>
                </div>
              </div>
            </div>
            <div className="p-6 rounded-xl bg-card-bg border border-card-border">
              <h3 className="text-lg font-semibold text-heading mb-4">{t("howWeEngage")}</h3>
              <div className="space-y-3 text-sm text-muted">
                <div className="flex items-start gap-2">
                  <span className="text-brand-teal font-bold">01</span>
                  <p>
                    {t.rich("engage1", {
                      link: (chunks) => (
                        <a href="/book" className="text-brand-teal hover:underline">{chunks}</a>
                      ),
                    })}
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-brand-teal font-bold">02</span>
                  <p>{t("engage2")}</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-brand-teal font-bold">03</span>
                  <p>{t("engage3")}</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-brand-teal font-bold">04</span>
                  <p>{t("engage4")}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
    </>
  );
}
