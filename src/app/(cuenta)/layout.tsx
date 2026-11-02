import Link from "next/link";
import { Wordmark } from "@/ui/brand";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6">
        <Link href="/" aria-label="Ya Merito, inicio">
          <Wordmark size={26} />
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-[440px] flex-1 flex-col px-4 pt-6 pb-16">{children}</main>
    </div>
  );
}
