import { Header } from "@/components/shared/Header";
import { BottomNav } from "@/components/shared/BottomNav";
import type { Metadata } from "next";

/** All routes under (root) are authenticated/private — noindex */
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-background pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
      <Header />
      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      <BottomNav />
    </div>
  );
}
