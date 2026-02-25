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
    <div className="min-h-screen pb-16">
      <Header />
      <main className="flex-1">{children}</main>
      <BottomNav />
    </div>
  );
}
