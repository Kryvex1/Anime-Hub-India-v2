import { useState, useEffect } from "react";
import { toast } from "sonner";
import { listAdmins, setAdminRole, removeAdminRole } from "@/lib/episodes.firebase";
import { getAdminDisplayName } from "@/lib/admin-auth";
import {
  IconShield,
  IconPlus,
  IconTrash,
  IconUsers,
  IconCheck,
  IconSparkles,
} from "@/components/anime/icons";

export function AdminRolesManager() {
  const [admins, setAdmins] = useState<
    { uid: string; email?: string; role: string; createdAt: number }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [newUid, setNewUid] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [copiedUid, setCopiedUid] = useState<string | null>(null);

  const adminName = getAdminDisplayName();

  const load = async () => {
    setLoading(true);
    try {
      const list = await listAdmins();
      setAdmins(list);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load admin list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUid.trim()) {
      toast.error("Please enter a Firebase User UID.");
      return;
    }

    setAdding(true);
    try {
      await setAdminRole(newUid.trim(), newEmail.trim() || undefined);
      toast.success(`Admin role granted to ${newUid.trim()}`);
      setNewUid("");
      setNewEmail("");
      await load();
    } catch (err) {
      console.error(err);
      toast.error("Failed to add admin user.");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (uid: string) => {
    if (!confirm(`Remove admin permissions from UID ${uid}?`)) {
      return;
    }

    try {
      await removeAdminRole(uid);
      toast.success("Admin role revoked.");
      await load();
    } catch (err) {
      console.error(err);
      toast.error("Failed to remove admin.");
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedUid(text);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopiedUid(null), 2000);
    } catch {
      /* dismiss */
    }
  };

  return (
    <div className="space-y-6">
      {/* Current session info */}
      <div className="glass flex flex-col gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/20 text-primary">
            <IconShield width={20} height={20} />
          </span>
          <div>
            <h3 className="text-sm font-bold text-foreground">Active Master Session</h3>
            <p className="text-xs text-muted-foreground">
              Super Admin: <span className="font-semibold text-primary font-mono">{adminName}</span>{" "}
              • Security Status: <span className="text-emerald-400 font-bold">Authorized</span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => copyToClipboard(adminName)}
          className="glass flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition hover:text-primary"
        >
          {copiedUid === adminName ? (
            <>
              <IconCheck width={13} height={13} className="text-emerald-400" /> Copied
            </>
          ) : (
            "Copy Handle"
          )}
        </button>
      </div>

      {/* Grant new admin UID form */}
      <div className="glass rounded-2xl border border-white/10 p-6">
        <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
          <IconPlus width={16} height={16} className="text-primary" />
          Authorize Custom Admin Role
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Authorize another administrative record by entering a reference identifier or UID.
        </p>

        <form onSubmit={handleAdd} className="mt-4 grid gap-3 sm:grid-cols-[2fr_2fr_auto]">
          <input
            type="text"
            value={newUid}
            onChange={(e) => setNewUid(e.target.value)}
            placeholder="Admin Identifier / UID"
            disabled={adding}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none"
          />
          <input
            type="text"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="Label / Note (optional)"
            disabled={adding}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none"
          />
          <button
            type="submit"
            disabled={adding}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-brand to-brand-glow px-4 py-2 text-xs font-bold text-primary-foreground shadow transition hover:scale-105 disabled:opacity-50"
          >
            {adding ? "Adding..." : "Add Admin"}
          </button>
        </form>
      </div>

      {/* Registered Admins List */}
      <div className="glass overflow-hidden rounded-2xl border border-white/10">
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-foreground">
            <IconUsers width={16} height={16} className="text-primary" />
            Authorized Master Records ({admins.length})
          </div>
          <button
            type="button"
            onClick={load}
            className="text-xs text-muted-foreground transition hover:text-foreground"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            Loading admin records...
          </div>
        ) : admins.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            Session active via cryptographic master passkey.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {admins.map((adm) => (
              <div
                key={adm.uid}
                className="flex flex-col gap-2 p-4 transition sm:flex-row sm:items-center sm:justify-between hover:bg-white/[0.02]"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-foreground break-all">
                      {adm.uid}
                    </span>
                    <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
                      {adm.role}
                    </span>
                  </div>
                  {adm.email && <p className="mt-0.5 text-xs text-muted-foreground">{adm.email}</p>}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(adm.uid)}
                    className="glass rounded-lg px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
                  >
                    Copy
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(adm.uid)}
                    className="rounded-lg bg-destructive/10 p-1.5 text-destructive transition hover:bg-destructive/20"
                    title="Revoke Admin Role"
                  >
                    <IconTrash width={14} height={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
