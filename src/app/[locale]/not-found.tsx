import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  const t = useTranslations("notFound");

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-6xl font-bold gradient-text mb-4">404</p>
        <h1 className="text-2xl font-bold text-heading mb-2">{t("title")}</h1>
        <p className="text-muted mb-8">{t("description")}</p>
        <Button href="/">{t("backToHome")}</Button>
      </div>
    </div>
  );
}
