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
  revoked: "border-border-strong text-[#5d6c80]",
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
        className="no-print flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-navy-700 px-4 text-[15px] font-bold text-white hover:bg-navy-900"
      >
        Invite client user
        {pendingCount > 0 && (
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold text-white">{pendingCount}</span>
        )}
      </button>

      {open && (
        <Modal title="Invite a client user" onClose={() => setOpen(false)}>
          <div className="flex flex-col gap-3">
            <p className="text-[13px] text-[#5d6c80]">
              Generates a one-time link. Send it to the client however you like — they open it, set a password,
              and they&rsquo;re in.
            </p>

            <button
              type="button"
              onClick={handleCreate}
              disabled={isPending}
              className="w-fit min-h-12 rounded-xl bg-navy-700 px-5 text-[15px] font-bold text-white hover:bg-navy-900 disabled:opacity-50"
            >
              {isPending ? "Generating…" : "Generate invite link"}
            </button>

            {generatedLink && (
              <div className="rounded-xl border border-green-200 bg-green-50 px-3.5 py-3 text-sm">
                <p className="font-medium text-green-800">Share this link with the client:</p>
                <p className="mt-1 break-all font-mono text-navy-700">{generatedLink}</p>
              </div>
            )}

            {error && <p className="text-sm font-medium text-red-600">{error}</p>}

            {invites.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-navy-900">Existing invites</span>
                {invites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-border px-3.5 py-2.5 text-[13px]"
                  >
                    <span className={`rounded-full border-2 px-2 py-0.5 font-medium ${STATUS_CLASS[invite.status]}`}>
                      {STATUS_LABEL[invite.status]}
                    </span>
                    <span className="flex-1 truncate text-[#5d6c80]">{formatDate(invite.created_at)}</span>
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
