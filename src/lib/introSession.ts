type IntroWindow = Window & { __kairo_intro_seen?: boolean };

/** Remember this tab's visit, without suppressing future sessions. */
export function hasSeenIntro(): boolean {
  if (typeof window === "undefined") return true;
  if ((window as IntroWindow).__kairo_intro_seen) return true;
  try {
    return sessionStorage.getItem("kairo_intro_seen") === "true";
  } catch {
    return false;
  }
}

export function markIntroSeen(): void {
  if (typeof window === "undefined") return;
  (window as IntroWindow).__kairo_intro_seen = true;
  try {
    sessionStorage.setItem("kairo_intro_seen", "true");
    localStorage.removeItem("kairo_intro_seen");
    document.cookie = "kairo_intro_seen=; path=/; max-age=0; SameSite=Lax";
  } catch {
    // The memory flag still prevents a replay when storage is unavailable.
  }
}
