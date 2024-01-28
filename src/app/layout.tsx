import "@/styles/globals.css";

import Link from "next/link";

import { Inter } from "next/font/google";

import { TRPCReactProvider } from "@/trpc/react";

import { getServerAuthSession } from "@/server/auth";

import styles from "./layout.module.css";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata = {
  title: "Visual Novel Crafter",
  description: "Create your own visual novel",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerAuthSession();
  return (
    <html lang="en">
      <body className={`${inter.className} ${styles.body}`}>
        <header className={styles.header}>
          <p>{session && <span>Logged in as {session.user?.name}</span>}</p>
          <Link href="/" className={styles["home-button"]}>
            Visual Novel Crafter
          </Link>
          <Link
            href={session ? "/api/auth/signout" : "/api/auth/signin"}
            className={styles["login-button"]}
          >
            {session ? "Sign out" : "Sign in"}
          </Link>
        </header>
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  );
}
