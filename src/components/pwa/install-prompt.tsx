"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { IconX } from "@/components/icons/sidebar-icons";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

type PromptState =
  | { kind: "hidden" }
  | { kind: "ready"; evt: BeforeInstallPromptEvent }
  | { kind: "installing" }
  | { kind: "manual" };

const DISMISS_KEY = "pwa-install-dismissed-at";

export function PwaInstallPrompt() {
  const [state, setState] = useState<PromptState>({ kind: "hidden" });

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    function canShow() {
      try {
        if (window.matchMedia("(display-mode: standalone)").matches) return false;
        const last = Number(localStorage.getItem(DISMISS_KEY) || 0);
        if (Date.now() - last < 1000 * 60 * 60 * 24 * 2) return false;
      } catch {
        // ignore storage errors
      }
      return true;
    }

    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      if (!canShow()) return;
      const evt = e as BeforeInstallPromptEvent;
      setState({ kind: "ready", evt });
    }

    function registerSW() {
      if (!("serviceWorker" in navigator)) return;
      navigator.serviceWorker
        .register("/sw.js")
        .catch(() => {
          // SW registration is best-effort
        });
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    registerSW();

    // If no native prompt fired shortly after load, show the "how to install" card.
    timeout = setTimeout(() => {
      if (cancelled) return;
      setState((prev) =>
        prev.kind === "hidden" && canShow() ? { kind: "manual" } : prev
      );
    }, 4000);

    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    };
  }, []);

  if (state.kind === "hidden") return null;

  async function handleInstall() {
    if (state.kind !== "ready") return;
    setState({ kind: "installing" });
    await state.evt.prompt();
    const choice = await state.evt.userChoice;
    if (choice.outcome === "accepted") {
      dismiss();
    } else {
      setState({ kind: "manual" });
    }
  }

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // ignore
    }
    setState({ kind: "hidden" });
  }

  const isManual = state.kind === "manual";

  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-[60] sm:w-[22rem]">
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white/95 shadow-2xl shadow-navy-deep/30 backdrop-blur">
        <div
          className="relative flex items-center gap-4 px-5 py-4"
          style={{ backgroundColor: "var(--color-navy-deep)" }}
        >
          <div className="relative flex h-14 w-14 flex-none items-center justify-center rounded-2xl bg-white/10">
            <Image
              src="/brand/propconnect-icon-256.png"
              alt="PropConnect"
              width={40}
              height={40}
              className="rounded-xl"
            />
            <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-secondary)] text-[11px] text-white shadow">
              ⤓
            </span>
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-white">
              PropConnect
              <span className="text-[var(--color-secondary)]">.</span>
            </p>
            <p className="text-xs text-white/70">Add to your home screen · zero clutter</p>
          </div>
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/10 hover:text-white"
          >
            <IconX size={15} />
          </button>
        </div>

        <div className="px-5 py-4">
          <p className="text-sm text-gray-700">
            {state.kind === "installing" ? (
              "Preparing your install…"
            ) : isManual ? (
              <>
                Tap your browser&apos;s{" "}
                <span className="font-semibold text-gray-900">Share</span> icon, then
                choose{" "}
                <span className="font-semibold text-gray-900">“Add to Home Screen”</span>{" "}
                to keep PropConnect one tap away.
              </>
            ) : (
              <>
                Your whole pipeline, docked on your home screen. Opens its own
                window, loads in a blink, and stays sharp even when the signal
                gets flaky.
              </>
            )}
          </p>

          {!isManual && state.kind !== "installing" && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {["Instant launch", "Works offline", "Own window"].map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-gray-100 bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-gray-500"
                >
                  {chip}
                </span>
              ))}
            </div>
          )}

          <div className="mt-4 flex items-center gap-2">
            {!isManual && state.kind !== "installing" && (
              <button
                onClick={handleInstall}
                className="flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  backgroundColor: "var(--color-secondary)",
                  color: "var(--color-navy-deep)",
                }}
              >
                Install PropConnect
              </button>
            )}
            <button
              onClick={dismiss}
              className={[
                "rounded-xl px-4 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700",
                isManual || state.kind === "installing" ? "flex-1" : "",
              ].join(" ")}
            >
              {isManual || state.kind === "installing" ? "Got it" : "Not now"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
