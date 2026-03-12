"use client";

import { Bell, Check, X, Loader2 } from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";

interface SignupRequest {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

interface NotificationsPanelProps {
  isAdmin: boolean;
}

export function NotificationsPanel({ isAdmin }: NotificationsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [requests, setRequests] = useState<SignupRequest[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchRequests = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await fetch("/api/admin/signups");
      if (!res.ok) return;
      const data = await res.json();
      setRequests(data.requests ?? []);
    } catch {
      // silently ignore network errors
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  async function handleAction(id: string, action: "approve" | "reject") {
    setLoadingId(id);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/signups/${id}/${action}`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setActionError(data.error ?? `Failed to ${action} request.`);
      }
      await fetchRequests();
    } finally {
      setLoadingId(null);
    }
  }

  if (!isAdmin) {
    // Non-admin: render a plain bell with no functionality
    return (
      <button className="relative p-2 rounded-lg hover:bg-zinc-800 transition-colors">
        <Bell className="w-5 h-5 text-zinc-400" />
      </button>
    );
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-2 rounded-lg hover:bg-zinc-800 transition-colors"
        title="Notifications"
      >
        <Bell className="w-5 h-5 text-zinc-400" />
        {requests.length > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
            {requests.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-80 rounded-lg bg-zinc-800 border border-zinc-700 shadow-lg z-50">
          <div className="px-4 py-3 border-b border-zinc-700">
            <h3 className="text-sm font-semibold text-zinc-100">
              Access Requests
            </h3>
          </div>

          {actionError && (
            <p className="px-4 py-2 text-xs text-red-400 border-b border-zinc-700">
              {actionError}
            </p>
          )}

          {requests.length === 0 ? (
            <p className="px-4 py-6 text-sm text-center text-zinc-500">
              No pending requests
            </p>
          ) : (
            <ul className="divide-y divide-zinc-700 max-h-96 overflow-y-auto">
              {requests.map((req) => (
                <li key={req.id} className="px-4 py-3 space-y-2">
                  <div>
                    <p className="text-sm font-medium text-zinc-100">
                      {req.full_name ?? req.email}
                    </p>
                    {req.full_name && (
                      <p className="text-xs text-zinc-400">{req.email}</p>
                    )}
                    <p className="text-xs text-zinc-500">
                      {new Date(req.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction(req.id, "approve")}
                      disabled={loadingId === req.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-green-600 hover:bg-green-500 text-white text-xs font-medium transition-colors disabled:opacity-60"
                    >
                      {loadingId === req.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Check className="w-3 h-3" />
                      )}
                      Approve
                    </button>
                    <button
                      onClick={() => handleAction(req.id, "reject")}
                      disabled={loadingId === req.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-xs font-medium transition-colors disabled:opacity-60"
                    >
                      <X className="w-3 h-3" />
                      Reject
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
