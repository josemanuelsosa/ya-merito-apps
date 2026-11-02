import { InkFilter, SiteFooter, SiteHeader } from "@/features/landing/chrome";
import { SiteMotion } from "@/features/landing/motion-island";
import "@/features/landing/landing.css";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="ym">
      <InkFilter />
      <SiteHeader />
      {children}
      <SiteFooter />
      <SiteMotion />
    </div>
  );
}
