import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";

const LOGO_STORAGE_KEY = "workshop_logo_url";

const getStoredLogo = (): string | null => {
  try {
    return localStorage.getItem(LOGO_STORAGE_KEY);
  } catch {
    return null;
  }
};

export function useLogoUrl() {
  const { user } = useAuth();
  const [logoUrl, setLogoUrl] = useState<string | null>(getStoredLogo);

  useEffect(() => {
    const handler = () => setLogoUrl(getStoredLogo());
    window.addEventListener("workshop-logo-updated", handler);
    return () => window.removeEventListener("workshop-logo-updated", handler);
  }, []);

  const saveLogo = useCallback((url: string | null) => {
    try {
      if (url) {
        localStorage.setItem(LOGO_STORAGE_KEY, url);
      } else {
        localStorage.removeItem(LOGO_STORAGE_KEY);
      }
    } catch {}
    setLogoUrl(url);
    window.dispatchEvent(new Event("workshop-logo-updated"));
  }, []);

  return { logoUrl, saveLogo };
}