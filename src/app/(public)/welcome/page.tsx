import Link from "next/link";
import { Suspense } from "react";
import AuthRedirect from "./AuthRedirect";
import NextCarrier from "./NextCarrier";

export default function WelcomePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Suspense>
        <AuthRedirect />
      </Suspense>
      {/* Top bar */}
      <header className="flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-2.5">
          <span className="text-xl leading-none select-none">🏸</span>
          <span className="font-bold text-heading text-sm tracking-tight">OpenCourt</span>
        </div>
        <Suspense fallback={
          <Link href="/login" className="px-4 py-1.5 text-sm font-semibold bg-stone-900 dark:bg-sky-600 text-white rounded-lg hover:bg-stone-800 dark:hover:bg-sky-500 transition-colors">
            Log in
          </Link>
        }>
          <NextCarrier className="px-4 py-1.5 text-sm font-semibold bg-stone-900 dark:bg-sky-600 text-white rounded-lg hover:bg-stone-800 dark:hover:bg-sky-500 transition-colors">
            Log in
          </NextCarrier>
        </Suspense>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-5 pt-6 pb-8">
        <div className="max-w-md mx-auto w-full flex flex-col gap-6">
          {/* Hero */}
          <div className="text-center flex flex-col items-center gap-2">
            <div className="text-5xl leading-none select-none">🏸</div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-heading tracking-tight leading-tight">
              OpenCourt
            </h1>
            <p className="text-sm text-muted-light leading-relaxed max-w-xs mx-auto">
              Badminton events made easy — register, check in, pair up, and play.
            </p>
          </div>

          {/* CTA */}
          <Suspense fallback={
            <Link href="/login" className="flex items-center justify-center gap-2 w-full py-3 bg-stone-900 dark:bg-sky-600 text-white rounded-xl font-semibold shadow-sm hover:bg-stone-800 dark:hover:bg-sky-500 transition-colors">
              Get started
            </Link>
          }>
            <NextCarrier className="flex items-center justify-center gap-2 w-full py-3 bg-stone-900 dark:bg-sky-600 text-white rounded-xl font-semibold shadow-sm hover:bg-stone-800 dark:hover:bg-sky-500 transition-colors">
              Get started
            </NextCarrier>
          </Suspense>
        </div>
      </main>

      <footer className="text-center pb-4 text-[10px] text-muted-lighter">
        OpenCourt Badminton
      </footer>
    </div>
  );
}
