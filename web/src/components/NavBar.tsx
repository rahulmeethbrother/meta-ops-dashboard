"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { clientAuth } from "@/lib/firebase-client";
import { useAuth } from "./AuthProvider";

export default function NavBar() {
  const { user, role } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  if (!user) return null;

  const links = [
    { href: "/studio", label: "Studio" },
    { href: "/dashboard", label: "Jobs" },
    { href: "/ads", label: "Meta Ops" },
    { href: "/new", label: "New videos" },
    ...(role === "admin" ? [{ href: "/admin", label: "Admin" }] : []),
  ];

  return (
    <nav className="navbar">
      <div className="navbar-brand">Company Studio</div>
      <div className="navbar-links">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={pathname.startsWith(link.href) ? "active" : ""}
          >
            {link.label}
          </Link>
        ))}
      </div>
      <div className="navbar-user">
        <span>{user.email}</span>
        {role === "admin" && <span className="badge badge-admin">admin</span>}
        <button
          className="btn btn-ghost"
          onClick={async () => {
            await signOut(clientAuth);
            router.push("/login");
          }}
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
