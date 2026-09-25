import { useEffect, useState, useMemo } from "react";
import Icon from "../../shared/components/Icon";
import { useAuth } from "../../context/AuthContext";

export type ManagedUser = {
  userId: number;
  username: string;
  phoneNumber: string;
  role: "superadmin" | "jc" | "mtp" | "atp" | "bi" | "operator";
  name: string;
  isActive: boolean;
  failedAttempts?: number;
  lockedUntil?: string | null;
  createdAt: string;
  updatedAt?: string;
};

const ROLES: { value: ManagedUser["role"]; label: string; tone: { bg: string; text: string; border: string } }[] = [
  { value: "superadmin", label: "Superadmin", tone: { bg: "#faf5ff", text: "#7e22ce", border: "#e9d5ff" } },
  { value: "jc", label: "Joint Commissioner (JC)", tone: { bg: "#eef2ff", text: "#4338ca", border: "#c7d2fe" } },
  { value: "mtp", label: "Municipal Town Planner (MTP)", tone: { bg: "#ecfeff", text: "#0e7490", border: "#a5f3fc" } },
  { value: "atp", label: "Assistant Town Planner (ATP)", tone: { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" } },
  { value: "bi", label: "Building Inspector (BI)", tone: { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" } },
  { value: "operator", label: "Desk Operator", tone: { bg: "#fefce8", text: "#a16207", border: "#fef08a" } },
];

function getRoleTone(role: string) {
  const found = ROLES.find((r) => r.value === role.toLowerCase());
  return found?.tone ?? { bg: "#f1f5f9", text: "#475569", border: "#cbd5e1" };
}

function getRoleLabel(role: string) {
  const found = ROLES.find((r) => r.value === role.toLowerCase());
  return found?.label ?? role.toUpperCase();
}

export default function UsersPage() {
  const { user: currentAuthUser } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formUsername, setFormUsername] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState<ManagedUser["role"]>("operator");
  const [formIsActive, setFormIsActive] = useState(true);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Action status / banner
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const apiUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:5000/api";

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiUrl}/users`);
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load users");
      }
      setUsers(data.users || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openCreateModal = () => {
    setEditingUser(null);
    setFormName("");
    setFormUsername("");
    setFormPhone("");
    setFormPassword("");
    setFormRole("operator");
    setFormIsActive(true);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (user: ManagedUser) => {
    setEditingUser(user);
    setFormName(user.name);
    setFormUsername(user.username);
    setFormPhone(user.phoneNumber);
    setFormPassword(""); // Leave blank by default on edit
    setFormRole(user.role);
    setFormIsActive(user.isActive);
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setFormError(null);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formName.trim() || !formUsername.trim() || !formPhone.trim()) {
      setFormError("Name, username, and phone number are required.");
      return;
    }

    if (!editingUser && !formPassword.trim()) {
      setFormError("Password is required when creating a new user.");
      return;
    }

    setFormSubmitting(true);
    try {
      if (editingUser) {
        // Edit existing user
        const body: Record<string, unknown> = {
          name: formName.trim(),
          username: formUsername.trim(),
          phoneNumber: formPhone.trim(),
          role: formRole,
          isActive: formIsActive,
        };
        if (formPassword.trim()) {
          body.password = formPassword.trim();
        }

        const res = await fetch(`${apiUrl}/users/${editingUser.userId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || "Failed to update user.");
        }

        setActionSuccess(`User "${formName}" updated successfully.`);
      } else {
        // Create new user
        const body = {
          name: formName.trim(),
          username: formUsername.trim(),
          phoneNumber: formPhone.trim(),
          password: formPassword.trim(),
          role: formRole,
        };

        const res = await fetch(`${apiUrl}/users`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || "Failed to create user.");
        }

        setActionSuccess(`User "${formName}" created successfully.`);
      }

      closeModal();
      await fetchUsers();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeactivateUser = async (user: ManagedUser) => {
    if (currentAuthUser?.userId === user.userId) {
      alert("You cannot deactivate your own superadmin account.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to deactivate ${user.name} (@${user.username})? They will immediately lose system access.`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`${apiUrl}/users/${user.userId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to deactivate user.");
      }

      setActionSuccess(`User "${user.name}" has been deactivated.`);
      await fetchUsers();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to deactivate user.");
    }
  };

  // KPIs
  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.isActive).length;
    const inactive = total - active;
    const officers = users.filter((u) => ["bi", "atp"].includes(u.role)).length;
    return { total, active, inactive, officers };
  }, [users]);

  // Filtered users
  const visibleUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      const matchesSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.phoneNumber.includes(q);

      const matchesRole = roleFilter === "all" || u.role === roleFilter;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && u.isActive) ||
        (statusFilter === "inactive" && !u.isActive);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  return (
    <div className="users-page" style={{ padding: "8px 0" }}>
      {/* Page Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "24px",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "#f3e8ff",
                color: "#7e22ce",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="users" />
            </div>
            <div>
              <h1 style={{ fontSize: "20px", fontWeight: 700, margin: 0, color: "#0f172a" }}>
                User Management
              </h1>
              <p style={{ margin: "2px 0 0", fontSize: "13px", color: "var(--muted, #64748b)" }}>
                Superadmin directory to provision, configure, and manage staff access across municipal branches.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="primary-button"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "9px 18px",
            fontSize: "13px",
            fontWeight: 600,
            borderRadius: "8px",
            backgroundColor: "#2563eb",
            color: "#ffffff",
            cursor: "pointer",
            boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
          }}
        >
          <Icon name="plus" />
          <span>Add New User</span>
        </button>
      </div>

      {/* Action Notification Banner */}
      {actionSuccess && (
        <div
          style={{
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            color: "#166534",
            padding: "10px 16px",
            borderRadius: "8px",
            marginBottom: "20px",
            fontSize: "13px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Icon name="check-circle" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <div className="panel" style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--muted, #64748b)", textTransform: "uppercase" }}>
            Total Users
          </div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "#0f172a", marginTop: "4px" }}>
            {stats.total}
          </div>
          <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
            System-wide provisioned
          </div>
        </div>

        <div className="panel" style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--muted, #64748b)", textTransform: "uppercase" }}>
            Active Accounts
          </div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "#16a34a", marginTop: "4px" }}>
            {stats.active}
          </div>
          <div style={{ fontSize: "12px", color: "#16a34a", marginTop: "2px" }}>
            Ready to log in
          </div>
        </div>

        <div className="panel" style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--muted, #64748b)", textTransform: "uppercase" }}>
            Inactive Accounts
          </div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: stats.inactive > 0 ? "#dc2626" : "#64748b", marginTop: "4px" }}>
            {stats.inactive}
          </div>
          <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
            Deactivated or locked
          </div>
        </div>

        <div className="panel" style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--muted, #64748b)", textTransform: "uppercase" }}>
            Field Officers
          </div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "#0284c7", marginTop: "4px" }}>
            {stats.officers}
          </div>
          <div style={{ fontSize: "12px", color: "#0284c7", marginTop: "2px" }}>
            BI &amp; ATP personnel
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div
        className="panel"
        style={{
          padding: "16px 20px",
          marginBottom: "20px",
          display: "flex",
          flexWrap: "wrap",
          gap: "12px",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", flex: 1, minWidth: "260px", alignItems: "center", gap: "8px", position: "relative" }}>
          <input
            type="text"
            placeholder="Search by name, username, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px 8px 36px",
              borderRadius: "6px",
              border: "1px solid var(--border, #cbd5e1)",
              fontSize: "13px",
              outline: "none",
            }}
          />
          <div style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}>
            <Icon name="search" />
          </div>
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              style={{
                position: "absolute",
                right: "8px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: "#94a3b8",
                cursor: "pointer",
              }}
            >
              <Icon name="close" />
            </button>
          )}
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid var(--border, #cbd5e1)",
              fontSize: "13px",
              backgroundColor: "#fff",
              cursor: "pointer",
            }}
          >
            <option value="all">All Roles</option>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid var(--border, #cbd5e1)",
              fontSize: "13px",
              backgroundColor: "#fff",
              cursor: "pointer",
            }}
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* User Table */}
      <div className="panel panel--table" style={{ overflowX: "auto" }}>
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                border: "3px solid #cbd5e1",
                borderTopColor: "#2563eb",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
                margin: "0 auto 12px",
              }}
            />
            Loading user directory...
          </div>
        ) : error ? (
          <div style={{ padding: "30px", textAlign: "center", color: "#dc2626" }}>
            <Icon name="alert" />
            <p style={{ marginTop: "8px" }}>{error}</p>
            <button
              type="button"
              onClick={fetchUsers}
              className="secondary-button"
              style={{ marginTop: "12px", padding: "6px 14px" }}
            >
              Retry
            </button>
          </div>
        ) : visibleUsers.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
            <Icon name="users" />
            <p style={{ marginTop: "8px", fontWeight: 500 }}>No users found matching current filters.</p>
          </div>
        ) : (
          <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                <th style={{ padding: "12px 16px", fontSize: "12px", color: "#64748b", fontWeight: 600 }}>NAME / IDENTITY</th>
                <th style={{ padding: "12px 16px", fontSize: "12px", color: "#64748b", fontWeight: 600 }}>USERNAME</th>
                <th style={{ padding: "12px 16px", fontSize: "12px", color: "#64748b", fontWeight: 600 }}>PHONE NUMBER</th>
                <th style={{ padding: "12px 16px", fontSize: "12px", color: "#64748b", fontWeight: 600 }}>DESIGNATION & ROLE</th>
                <th style={{ padding: "12px 16px", fontSize: "12px", color: "#64748b", fontWeight: 600 }}>STATUS</th>
                <th style={{ padding: "12px 16px", fontSize: "12px", color: "#64748b", fontWeight: 600 }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {visibleUsers.map((u) => {
                const tone = getRoleTone(u.role);
                const initials = u.name
                  .split(" ")
                  .map((n) => n[0])
                  .filter(Boolean)
                  .join("")
                  .toUpperCase()
                  .slice(0, 2);

                const isSelf = currentAuthUser?.userId === u.userId;

                return (
                  <tr
                    key={u.userId}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      transition: "background-color 0.15s",
                      opacity: u.isActive ? 1 : 0.65,
                    }}
                  >
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div
                          style={{
                            width: "34px",
                            height: "34px",
                            borderRadius: "50%",
                            background: u.isActive ? "#eff6ff" : "#f1f5f9",
                            color: u.isActive ? "#1d4ed8" : "#64748b",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            fontSize: "12px",
                          }}
                        >
                          {initials || "U"}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: "13px", color: "#0f172a" }}>
                            {u.name}
                            {isSelf && (
                              <span
                                style={{
                                  marginLeft: "6px",
                                  fontSize: "10px",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  background: "#f1f5f9",
                                  color: "#475569",
                                  fontWeight: 600,
                                }}
                              >
                                YOU
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: "11px", color: "#64748b" }}>ID: #{u.userId}</div>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: "12px 16px", fontSize: "13px", color: "#334155" }}>
                      <code
                        style={{
                          background: "#f8fafc",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          border: "1px solid #e2e8f0",
                          fontSize: "12px",
                        }}
                      >
                        @{u.username}
                      </code>
                    </td>

                    <td style={{ padding: "12px 16px", fontSize: "13px", color: "#334155" }}>
                      {u.phoneNumber || "—"}
                    </td>

                    <td style={{ padding: "12px 16px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "3px 8px",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: 600,
                          backgroundColor: tone.bg,
                          color: tone.text,
                          border: `1px solid ${tone.border}`,
                        }}
                      >
                        {getRoleLabel(u.role)}
                      </span>
                    </td>

                    <td style={{ padding: "12px 16px" }}>
                      {u.isActive ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            padding: "3px 8px",
                            borderRadius: "12px",
                            fontSize: "11px",
                            fontWeight: 600,
                            backgroundColor: "#f0fdf4",
                            color: "#16a34a",
                            border: "1px solid #bbf7d0",
                          }}
                        >
                          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#16a34a" }} />
                          Active
                        </span>
                      ) : (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            padding: "3px 8px",
                            borderRadius: "12px",
                            fontSize: "11px",
                            fontWeight: 600,
                            backgroundColor: "#fef2f2",
                            color: "#dc2626",
                            border: "1px solid #fecaca",
                          }}
                        >
                          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#dc2626" }} />
                          Inactive
                        </span>
                      )}
                    </td>

                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <button
                          type="button"
                          onClick={() => openEditModal(u)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "4px 8px",
                            borderRadius: "6px",
                            border: "1px solid #cbd5e1",
                            background: "#fff",
                            color: "#334155",
                            fontSize: "12px",
                            fontWeight: 500,
                            cursor: "pointer",
                          }}
                          title="Edit user details & password"
                        >
                          <Icon name="edit" />
                          <span>Edit</span>
                        </button>

                        {u.isActive && !isSelf && (
                          <button
                            type="button"
                            onClick={() => handleDeactivateUser(u)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "4px 8px",
                              borderRadius: "6px",
                              border: "1px solid #fecaca",
                              background: "#fff",
                              color: "#dc2626",
                              fontSize: "12px",
                              fontWeight: 500,
                              cursor: "pointer",
                            }}
                            title="Deactivate account"
                          >
                            <span>Deactivate</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add / Edit User Modal */}
      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "16px",
          }}
          onClick={closeModal}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              width: "100%",
              maxWidth: "520px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#f8fafc",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "6px",
                    background: "#eff6ff",
                    color: "#2563eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name={editingUser ? "edit" : "plus"} />
                </div>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>
                  {editingUser ? `Edit User: ${editingUser.name}` : "Create New User"}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeModal}
                style={{
                  background: "none",
                  border: "none",
                  color: "#64748b",
                  cursor: "pointer",
                  padding: "4px",
                }}
              >
                <Icon name="close" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleFormSubmit} style={{ padding: "20px" }}>
              {formError && (
                <div
                  style={{
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    color: "#dc2626",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    marginBottom: "16px",
                    fontSize: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Icon name="alert" />
                  <span>{formError}</span>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                    Full Name <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jaswinder Singh"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                      Username <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. jaswinder"
                      value={formUsername}
                      onChange={(e) => setFormUsername(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        fontSize: "13px",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                      Phone Number <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 98765-43210"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        fontSize: "13px",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                    Role &amp; Statutory Authority <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as ManagedUser["role"])}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                      boxSizing: "border-box",
                      backgroundColor: "#fff",
                    }}
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                    {editingUser ? (
                      <>
                        New Password <span style={{ fontWeight: 400, color: "#64748b" }}>(leave blank to keep existing)</span>
                      </>
                    ) : (
                      <>
                        Password <span style={{ color: "#dc2626" }}>*</span>
                      </>
                    )}
                  </label>
                  <input
                    type="password"
                    placeholder={editingUser ? "•••••••• (unchanged)" : "Enter secure initial password"}
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                {editingUser && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "10px 12px",
                      borderRadius: "6px",
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    <input
                      type="checkbox"
                      id="user-is-active"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      style={{ cursor: "pointer", width: "16px", height: "16px" }}
                    />
                    <label htmlFor="user-is-active" style={{ fontSize: "13px", fontWeight: 500, color: "#334155", cursor: "pointer" }}>
                      Account is active and permitted to login
                    </label>
                  </div>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                  marginTop: "20px",
                  paddingTop: "14px",
                  borderTop: "1px solid #e2e8f0",
                }}
              >
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={formSubmitting}
                  className="secondary-button"
                  style={{ padding: "8px 16px", fontSize: "13px" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="primary-button"
                  style={{
                    padding: "8px 18px",
                    fontSize: "13px",
                    backgroundColor: "#2563eb",
                    color: "#fff",
                    borderRadius: "6px",
                  }}
                >
                  {formSubmitting ? "Saving..." : editingUser ? "Save Changes" : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
