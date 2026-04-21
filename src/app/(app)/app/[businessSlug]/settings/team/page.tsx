import { requireRole } from "@/lib/authz";
import { db } from "@/lib/db";
import { Users, UserPlus, Link as LinkIcon } from "lucide-react";
import TeamActions from "./TeamActions";
import InvitePanel from "./InvitePanel";

const roleColors: Record<string, string> = {
  OWNER: "bg-purple-100 text-purple-800",
  MANAGER: "bg-blue-100 text-blue-800",
  EMPLOYEE: "bg-gray-100 text-gray-700",
};

const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  DISABLED: "bg-red-100 text-red-700",
};

export default async function TeamSettingsPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  const { business, userId: currentUserId } = await requireRole(["OWNER"]);
  const businessId = business.id;

  const [members, joinRequests] = await Promise.all([
    db.membership.findMany({
      where: { businessId },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      select: { id: true, userId: true, role: true, status: true, createdAt: true },
    }),
    db.joinRequest.findMany({
      where: { businessId, status: "PENDING" },
      orderBy: { createdAt: "asc" },
      select: { id: true, requesterId: true, requestedRole: true, createdAt: true },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Team</h1>
        <p className="mt-1 text-sm text-gray-500">Manage members, send invites, and approve join requests.</p>
      </div>

      {/* Invite Members */}
      <section className="rounded-md border border-gray-200 bg-white">
        <div className="flex items-center gap-2 border-b border-gray-200 px-6 py-4 text-lg font-semibold text-gray-900">
          <LinkIcon className="h-5 w-5 text-gray-400" />
          Invite Members
        </div>
        <div className="px-6 py-4">
          <InvitePanel businessSlug={businessSlug} />
        </div>
      </section>

      {/* Current Members */}
      <section className="rounded-md border border-gray-200 bg-white">
        <div className="flex items-center gap-2 border-b border-gray-200 px-6 py-4 text-lg font-semibold text-gray-900">
          <Users className="h-5 w-5 text-gray-400" />
          Members
        </div>
        {members.length === 0 ? (
          <p className="px-6 py-8 text-sm text-gray-400">No members yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left">
                <th className="px-6 py-3 font-medium text-gray-500">User ID</th>
                <th className="px-6 py-3 font-medium text-gray-500">Role</th>
                <th className="px-6 py-3 font-medium text-gray-500">Status</th>
                <th className="px-6 py-3 font-medium text-gray-500">Member since</th>
                <th className="px-6 py-3 font-medium text-gray-500"></th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-6 py-3 font-mono text-xs text-gray-700">{m.userId}</td>
                  <td className="px-6 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${roleColors[m.role] ?? "bg-gray-100 text-gray-700"}`}>
                      {m.role.charAt(0) + m.role.slice(1).toLowerCase()}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[m.status] ?? "bg-gray-100 text-gray-700"}`}>
                      {m.status.charAt(0) + m.status.slice(1).toLowerCase()}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-gray-500">
                    {m.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="px-6 py-3 text-right">
                    {m.userId !== currentUserId && (
                      <TeamActions
                        membershipId={m.id}
                        requestId={null}
                        businessSlug={businessSlug}
                        mode="member"
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Join Requests */}
      <section className="rounded-md border border-gray-200 bg-white">
        <div className="flex items-center gap-2 border-b border-gray-200 px-6 py-4 text-lg font-semibold text-gray-900">
          <UserPlus className="h-5 w-5 text-gray-400" />
          Pending Join Requests
        </div>
        {joinRequests.length === 0 ? (
          <p className="px-6 py-8 text-sm text-gray-400">No pending requests.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {joinRequests.map((req) => (
              <li key={req.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="text-sm font-medium text-gray-900 font-mono">{req.requesterId}</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Requesting role: <span className="font-medium">{req.requestedRole.charAt(0) + req.requestedRole.slice(1).toLowerCase()}</span>
                    {" · "}
                    {req.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
                <TeamActions
                  requestId={req.id}
                  membershipId={null}
                  businessSlug={businessSlug}
                  mode="request"
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
