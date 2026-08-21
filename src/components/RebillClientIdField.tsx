"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateRebillClientId, searchRebillClients } from "@/app/admin/clients/actions";
import { Modal } from "@/components/Modal";
import type { RebillClient } from "@/lib/rebill/client";

export function RebillClientIdField({
  clientId,
  rebillClientId,
}: {
  clientId: string;
  rebillClientId: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [query, setQuery] = useState("");
  const [manualValue, setManualValue] = useState(rebillClientId ?? "");
  const [results, setResults] = useState<RebillClient[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const requestId = useRef(0);

  useEffect(() => {
    if (manualMode || !query.trim()) {
      setResults([]);
      return;
    }
    const id = ++requestId.current;
    setSearching(true);
    const timer = setTimeout(() => {
      searchRebillClients(query)
        .then((found) => {
          if (id === requestId.current) setResults(found);
        })
        .catch(() => {
          if (id === requestId.current) setError("Couldn't search Rebill — try again.");
        })
        .finally(() => {
          if (id === requestId.current) setSearching(false);
        });
    }, 300);
    return () => clearTimeout(timer);
  }, [query, manualMode]);

  function link(id: string) {
    setError(null);
    startTransition(async () => {
      try {
        await updateRebillClientId(clientId, id);
        closeEditor();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save");
      }
    });
  }

  function handleManualSave(e: React.FormEvent) {
    e.preventDefault();
    link(manualValue.trim());
  }

  function closeEditor() {
    setEditing(false);
    setManualMode(false);
    setQuery("");
    setResults([]);
    setManualValue(rebillClientId ?? "");
    setError(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={`flex h-10 items-center gap-2 rounded-full border-2 px-4 text-sm font-semibold ${
          rebillClientId
            ? "border-green-200 bg-green-50 text-green-700 hover:border-green-300"
            : "border-amber-300 bg-amber-50 text-amber-800 hover:border-amber-400"
        }`}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          {rebillClientId ? (
            <path d="M4 12.5l5 5L20 6.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          ) : (
            <>
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
              <path d="M12 8v5M12 16.5v.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </>
          )}
        </svg>
        <span>{rebillClientId ? "Linked to Rebill" : "Link to Rebill for quoting"}</span>
      </button>

      {editing && (
        <Modal title="Link to Rebill" onClose={closeEditor}>
          {manualMode ? (
            <form onSubmit={handleManualSave} className="flex flex-col gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-accent">Rebill client ID</span>
                <input
                  type="text"
                  autoFocus
                  value={manualValue}
                  onChange={(e) => setManualValue(e.target.value)}
                  placeholder="Pasted directly"
                  className="w-full rounded-lg border-2 border-accent-light bg-white px-3 py-2 font-mono text-xs outline-none focus:border-accent"
                />
              </label>
              {error && <p className="text-xs text-red-700">{error}</p>}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {isPending ? "Saving…" : "Save"}
                </button>
                <button type="button" onClick={() => setManualMode(false)} className="text-xs font-medium text-accent underline">
                  Search by name instead
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-accent">Search Rebill clients</span>
                <input
                  type="text"
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Name or email…"
                  className="w-full rounded-lg border-2 border-accent-light bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </label>

              {searching && <p className="text-xs text-gray-400">Searching…</p>}

              {!searching && query.trim() && results.length === 0 && (
                <p className="text-xs text-gray-500">No matching Rebill clients found.</p>
              )}

              {results.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  {results.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => link(c.id)}
                      disabled={isPending}
                      className="flex items-center justify-between gap-2 rounded-lg border-2 border-accent-light px-3 py-2 text-left text-xs hover:border-accent disabled:opacity-50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-gray-800">
                          {c.business_name || `${c.name} ${c.surname ?? ""}`.trim()}
                        </span>
                        <span className="block truncate text-gray-500">{c.email || "no email on file"}</span>
                      </span>
                      <span className="shrink-0 rounded-full bg-accent px-2.5 py-1 font-semibold text-white">Link</span>
                    </button>
                  ))}
                </div>
              )}

              {error && <p className="text-xs text-red-700">{error}</p>}

              <button
                type="button"
                onClick={() => setManualMode(true)}
                className="w-fit text-xs font-medium text-gray-500 underline"
              >
                Paste a Rebill client ID directly instead
              </button>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
