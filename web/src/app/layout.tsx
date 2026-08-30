import type { Metadata } from "next";
import { AuthProvider } from "@/components/AuthProvider";
import NavBar from "@/components/NavBar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Company Studio · Meta Ops",
  description: "Private AI media and Meta campaign operations",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <NavBar />
          <main className="container">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
