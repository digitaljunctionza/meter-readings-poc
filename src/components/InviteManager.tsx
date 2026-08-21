"use client";

import { useState, useTransition } from "react";
import { createInvite, revokeInvite } from "@/app/admin/invites/actions";
import { formatDate } from "@/lib/date";
import { Modal } from "@/components/Modal";
import type { PropertyInvite } from "@/lib/types";

const STATUS_LABEL: Record<PropertyInvite["status"], string> = {
  pending: "Pending",
  used: "Used",
  revoked: "Revoked",
};

const STATUS_CLASS: Record<PropertyInvite["status"], string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-800",
  used: "border-green-200 bg-green-50 text-green-700",
  revoked: "border-gray-300 text-gray-500",
};

export function InviteManager({
  clientId,
  invites,
}: {
  clientId: string;
  invites: PropertyInvite[];
}) {
  const [open, setOpen] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const pendingCount = invites.filter((i) => i.status === "pending").length;

  function handleCreate() {
    setError(null);
    startTransition(async () => {
      try {
        const token = await createInvite(clientId);
        setGeneratedLink(`${window.location.origin}/invite/${token}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create invite");
      }
    });
  }

  function handleRevoke(inviteId: string) {
    startTransition(async () => {
      await revokeInvite(inviteId);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="no-print flex h-10 w-fit items-center gap-2 rounded-full border-2 border-accent px-4 text-sm font-semibold text-accent"
      >
        Invite client user
        {pendingCount > 0 && (
          <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">{pendingCount}</span>
        )}
      </button>

      {open && (
        <Modal title="Invite a client user" onClose={() => setOpen(false)}>
          <div className="flex flex-col gap-3">
            <p className="text-xs text-gray-500">
              Generates a one-time link. Send it to the client however you like — they open it, set a password,
              and they&rsquo;re in.
            </p>

            <button
              type="button"
              onClick={handleCreate}
              disabled={isPending}
              className="w-fit rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {isPending ? "Generating…" : "Generate invite link"}
            </button>

            {generatedLink && (
              <div className="rounded-lg border-2 border-green-200 bg-green-50 px-3 py-2 text-sm">
                <p className="font-medium text-green-800">Share this link with the client:</p>
                <p className="mt-1 break-all font-mono text-accent">{generatedLink}</p>
              </div>
            )}

            {error && <p className="text-sm text-red-700">{error}</p>}

            {invites.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-accent">Existing invites</span>
                {invites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between gap-2 rounded-lg border-2 border-accent-light px-3 py-2 text-xs"
                  >
                    <span className={`rounded-full border-2 px-2 py-0.5 font-medium ${STATUS_CLASS[invite.status]}`}>
                      {STATUS_LABEL[invite.status]}
                    </span>
                    <span className="flex-1 truncate text-gray-500">{formatDate(invite.created_at)}</span>
                    {invite.status === "pending" && (
                      <button
                        type="button"
                        onClick={() => handleRevoke(invite.id)}
                        disabled={isPending}
                        className="text-red-600 underline disabled:opacity-50"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
