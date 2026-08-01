"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

type Mode = "signin" | "signup";

function LoginContent() {
  const searchParams = useSearchParams();
  const hasError = searchParams.get("error");
  const nextParam = searchParams.get("next");
  const next = nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";

  const [mode, setMode] = useState<Mode>("signin");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(hasError ? "Sign in failed. Please try again." : null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  function switchMode(m: Mode) {
    setMode(m);
    setError(null);
    setSuccessMsg(null);
  }

  async function signInWithGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) {
      setError(err.message);
      setLoading(false);
    } else {
      // Full navigation (not router.push) so the fresh auth cookies are
      // guaranteed to be on the request when the server renders the target.
      window.location.assign(next);
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim()) {
      setError("Display name is required.");
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: displayName.trim() },
      },
    });
    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      setSuccessMsg(`Account created. If email confirmation is required, check your inbox — otherwise sign in.`);
      switchMode("signin");
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 bg-background">
      {/* Logo */}
      <div className="flex flex-col leading-tight items-center">
        <span className="font-bold text-heading text-2xl">OpenCourt</span>
        <span className="font-black text-heading text-xs tracking-[0.2em] uppercase">Badminton</span>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        {/* Google button */}
        <button
          onClick={signInWithGoogle}
          className="flex items-center justify-center gap-3 w-full px-6 py-3 bg-surface border border-stone-300 dark:border-border rounded-lg shadow-sm text-text font-medium hover:bg-surface-alt active:bg-surface-alt transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Sign in with Google
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-stone-200 dark:bg-border" />
          <span className="text-xs text-muted-light">or</span>
          <div className="flex-1 h-px bg-stone-200 dark:bg-border" />
        </div>

        {/* Mode toggle */}
        <div className="flex bg-surface-alt rounded-lg p-0.5">
          <button
            onClick={() => switchMode("signin")}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
              mode === "signin" ? "bg-surface text-heading shadow-sm" : "text-text-light hover:text-text"
            }`}
          >
            Sign in
          </button>
          <button
            onClick={() => switchMode("signup")}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
              mode === "signup" ? "bg-surface text-heading shadow-sm" : "text-text-light hover:text-text"
            }`}
          >
            Create account
          </button>
        </div>

        {/* Success message */}
        {successMsg && (
          <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700 dark:text-green-400 text-center">
            {successMsg}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 text-sm text-red-700 dark:text-red-400 text-center">
            {error}
          </div>
        )}

        {/* Email/password form */}
        <form onSubmit={mode === "signin" ? handleSignIn : handleSignUp} className="flex flex-col gap-3">
          {mode === "signup" && (
            <input
              type="text"
              placeholder="Display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-2.5 bg-surface border border-stone-300 dark:border-border rounded-lg text-sm text-text placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2.5 bg-surface border border-stone-300 dark:border-border rounded-lg text-sm text-text placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-2.5 bg-surface border border-stone-300 dark:border-border rounded-lg text-sm text-text placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-stone-900 dark:bg-sky-600 text-white rounded-lg font-semibold text-sm hover:bg-stone-800 dark:hover:bg-sky-500 disabled:opacity-50 transition-colors"
          >
            {loading ? "…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
