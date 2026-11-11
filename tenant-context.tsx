import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { setTenantSlug } from "@workspace/api-client-react";

export interface TenantInfo {
  id: number;
  name: string;
  ownerName: string;
  slug: string;
  isActive: boolean;
}

export interface PendingNotification {
  id: number;
  message: string;
  createdAt: string;
}

interface TenantContextValue {
  slug: string;
  tenant: TenantInfo | null;
  isLoading: boolean;
  isBlocked: boolean;
  notFound: boolean;
  pendingNotifications: PendingNotification[];
  dismissNotification: (id: number) => void;
}

const TenantContext = createContext<TenantContextValue | null>(null);

export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant must be used inside TenantProvider");
  return ctx;
}

function getDismissedKey(slug: string): string {
  return `dismissed_notifications_${slug}`;
}

function getDismissedIds(slug: string): Set<number> {
  try {
    const stored = localStorage.getItem(getDismissedKey(slug));
    if (!stored) return new Set();
    return new Set(JSON.parse(stored) as number[]);
  } catch {
    return new Set();
  }
}

function saveDismissedId(slug: string, id: number): void {
  const dismissed = getDismissedIds(slug);
  dismissed.add(id);
  localStorage.setItem(getDismissedKey(slug), JSON.stringify([...dismissed]));
}

export function TenantProvider({ slug, children }: { slug: string; children: ReactNode }) {
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [pendingNotifications, setPendingNotifications] = useState<PendingNotification[]>([]);

  useEffect(() => {
    setTenantSlug(slug);
    return () => setTenantSlug(null);
  }, [slug]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setNotFound(false);
    setIsBlocked(false);

    fetch(`/api/tenants/by-slug/${slug}`)
      .then(async (r) => {
        if (cancelled) return;
        if (r.status === 404) { setNotFound(true); setIsLoading(false); return; }
        const data: TenantInfo = await r.json();
        if (cancelled) return;
        setTenant(data);
        if (!data.isActive) setIsBlocked(true);
        setIsLoading(false);
      })
      .catch(() => {
        if (!cancelled) { setNotFound(true); setIsLoading(false); }
      });

    return () => { cancelled = true; };
  }, [slug]);

  useEffect(() => {
    if (!tenant) return;
    let cancelled = false;
    const dismissed = getDismissedIds(slug);

    fetch(`/api/tenants/by-slug/${slug}/notifications`)
      .then((r) => r.json())
      .then((rows: PendingNotification[]) => {
        if (cancelled) return;
        const pending = rows.filter((n) => !dismissed.has(n.id));
        setPendingNotifications(pending);
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [tenant, slug]);

  const dismissNotification = useCallback((id: number) => {
    saveDismissedId(slug, id);
    setPendingNotifications((prev) => prev.filter((n) => n.id !== id));
  }, [slug]);

  return (
    <TenantContext.Provider
      value={{ slug, tenant, isLoading, isBlocked, notFound, pendingNotifications, dismissNotification }}
    >
      {children}
    </TenantContext.Provider>
  );
}
