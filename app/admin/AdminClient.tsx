"use client";

import { useEffect, useMemo, useState } from "react";

type Row = {
  id: string;
  display_name: string;
  guest_limit: number;
  token: string;
  active: boolean;
  whatsapp_phone: string | null;
  attending: boolean | null;
  confirmed_guests: number | null;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
  reminder_sent_at: string | null;
  response_updated_at: string | null;
};

type Filter = "all" | "confirmed" | "declined" | "pending" | "sent" | "unsent" | "reminded" | "inactive";

const RSVP_DEADLINE_TEXT = "25 de septiembre de 2026";

export default function AdminClient() {
  const [password, setPassword] = useState("");
  const [logged, setLogged] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [limit, setLimit] = useState(2);
  const [phone, setPhone] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [createdLink, setCreatedLink] = useState("");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editLimit, setEditLimit] = useState(1);
  const [editPhone, setEditPhone] = useState("");

  async function loadData() {
    const r = await fetch("/api/admin/data", { cache: "no-store" });
    if (r.status === 401) { setLogged(false); return; }
    const data = await r.json();
    if (data.ok) { setRows(data.rows); setLogged(true); }
    else setMessage(data.error || "No se pudo cargar el panel.");
  }

  useEffect(() => { loadData(); }, []);

  async function login() {
    setMessage("Entrando...");
    const r = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });
    const data = await r.json();
    if (!data.ok) { setMessage(data.error || "Contraseña incorrecta."); return; }
    setPassword("");
    setMessage("");
    await loadData();
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setLogged(false);
    setRows([]);
  }

  async function createInvite() {
    if (!name.trim()) { setMessage("Escribe el nombre del invitado o familia."); return; }
    setMessage("Creando invitación...");
    const r = await fetch("/api/admin/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        display_name: name.trim(),
        guest_limit: limit,
        whatsapp_phone: phone.trim()
      })
    });
    const data = await r.json();
    if (!data.ok) { setMessage(data.error || "No se pudo crear."); return; }
    const link = `${window.location.origin}/i/${data.token}`;
    setCreatedLink(link);
    setName("");
    setPhone("");
    setMessage("Invitación creada correctamente.");
    await loadData();
  }

  async function patchInvite(id: string, payload: Record<string, unknown>) {
    const r = await fetch(`/api/admin/invitations/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await r.json();
    if (!data.ok) throw new Error(data.error || "No se pudo actualizar la invitación.");
    return data;
  }

  function beginEdit(row: Row) {
    setEditingId(row.id);
    setEditName(row.display_name);
    setEditLimit(row.guest_limit);
    setEditPhone(row.whatsapp_phone ? `+${row.whatsapp_phone}` : "");
    setMessage("");
  }

  async function saveEdit(row: Row) {
    if (!editName.trim()) { setMessage("El nombre no puede quedar vacío."); return; }
    setBusyId(row.id);
    try {
      await patchInvite(row.id, {
        display_name: editName.trim(),
        guest_limit: editLimit,
        whatsapp_phone: editPhone.trim()
      });
      setEditingId(null);
      setMessage(`Invitación de ${editName.trim()} actualizada.`);
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar.");
    } finally {
      setBusyId(null);
    }
  }

  async function deactivateInvite(row: Row) {
    const ok = window.confirm(
      `¿Desactivar la invitación de ${row.display_name}?\n\nEl enlace dejará de abrir, pero podrás recuperarlo y conservará su confirmación.`
    );
    if (!ok) return;
    setBusyId(row.id);
    try {
      const r = await fetch(`/api/admin/invitations/${encodeURIComponent(row.id)}`, { method: "DELETE" });
      const data = await r.json();
      if (!data.ok) throw new Error(data.error || "No se pudo desactivar.");
      if (createdLink.endsWith(`/i/${row.token}`)) setCreatedLink("");
      setMessage(`Invitación de ${row.display_name} desactivada. Puedes recuperarla desde el filtro “Inactivas”.`);
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo desactivar.");
    } finally {
      setBusyId(null);
    }
  }

  async function restoreInvite(row: Row) {
    setBusyId(row.id);
    try {
      await patchInvite(row.id, { active: true });
      setMessage(`Invitación de ${row.display_name} recuperada.`);
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo recuperar.");
    } finally {
      setBusyId(null);
    }
  }

  async function markAsSent(row: Row) {
    if (row.sent_at) return;
    const optimisticDate = new Date().toISOString();
    setRows(current => current.map(item => item.id === row.id ? { ...item, sent_at: optimisticDate } : item));
    try {
      await patchInvite(row.id, { mark_sent: true });
    } catch {
      setRows(current => current.map(item => item.id === row.id ? { ...item, sent_at: null } : item));
      setMessage("WhatsApp abrió, pero no se pudo registrar como enviada.");
    }
  }

  async function markReminderAsSent(row: Row) {
    const optimisticDate = new Date().toISOString();
    setRows(current => current.map(item => item.id === row.id ? { ...item, reminder_sent_at: optimisticDate } : item));
    try {
      await patchInvite(row.id, { mark_reminder: true });
    } catch {
      setRows(current => current.map(item => item.id === row.id ? { ...item, reminder_sent_at: row.reminder_sent_at } : item));
      setMessage("WhatsApp abrió, pero no se pudo registrar el recordatorio.");
    }
  }

  function openWhatsApp(row: Row) {
    if (!row.whatsapp_phone) {
      setMessage(`La invitación de ${row.display_name} no tiene un WhatsApp registrado.`);
      return;
    }

    const link = `${window.location.origin}/i/${row.token}`;
    const singular = row.guest_limit === 1;
    const invitationText = singular
      ? "Gabo quiere compartir contigo la invitación para celebrar sus 50 años."
      : "Gabo quiere compartir con ustedes la invitación para celebrar sus 50 años.";
    const seatsText = singular
      ? "He reservado 1 lugar especialmente para ti."
      : `He reservado ${row.guest_limit} lugares especialmente para ustedes.`;
    const detailsText = singular
      ? "Consulta los detalles y confirma tu asistencia en tu invitación personal:"
      : "Consulten los detalles y confirmen su asistencia en su invitación personal:";
    const closingText = singular
      ? "Me dará mucho gusto celebrar contigo."
      : "Me dará mucho gusto celebrar con ustedes.";

    const whatsappMessage = [
      `Hola, ${row.display_name}.`,
      "",
      invitationText,
      "",
      seatsText,
      "",
      detailsText,
      link,
      "",
      `Te agradeceré confirmar antes del ${RSVP_DEADLINE_TEXT}.`,
      "",
      closingText
    ].join("\n");

    void markAsSent(row);
    const url = `https://wa.me/${row.whatsapp_phone}?text=${encodeURIComponent(whatsappMessage)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function openReminder(row: Row) {
    if (!row.whatsapp_phone) {
      setMessage(`La invitación de ${row.display_name} no tiene un WhatsApp registrado.`);
      return;
    }

    const link = `${window.location.origin}/i/${row.token}`;
    const singular = row.guest_limit === 1;
    const reminderMessage = [
      `Hola, ${row.display_name}.`,
      "",
      "Solo paso a recordarte la invitación para celebrar los 50 años de Gabo.",
      "",
      singular
        ? "Tienes 1 lugar reservado especialmente para ti."
        : `Tienen ${row.guest_limit} lugares reservados.`,
      "",
      `Por favor confirma tu asistencia antes del ${RSVP_DEADLINE_TEXT}:`,
      link,
      "",
      "¡Nos dará mucho gusto celebrar juntos!"
    ].join("\n");

    void markReminderAsSent(row);
    const url = `https://wa.me/${row.whatsapp_phone}?text=${encodeURIComponent(reminderMessage)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function copyLink(token: string) {
    const link = `${window.location.origin}/i/${token}`;
    await navigator.clipboard.writeText(link);
    setCopiedToken(token);
    window.setTimeout(() => setCopiedToken(null), 1800);
  }

  async function copyCreatedLink() {
    if (!createdLink) return;
    await navigator.clipboard.writeText(createdLink);
    setMessage("Enlace copiado.");
  }

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter(row => !q || row.display_name.toLowerCase().includes(q) || (row.whatsapp_phone || "").includes(q.replace(/\D/g, "")))
      .filter(row => {
        if (filter === "inactive") return !row.active;
        if (!row.active) return false;
        if (filter === "confirmed") return row.attending === true;
        if (filter === "declined") return row.attending === false;
        if (filter === "pending") return row.attending === null;
        if (filter === "sent") return Boolean(row.sent_at);
        if (filter === "unsent") return !row.sent_at;
        if (filter === "reminded") return Boolean(row.reminder_sent_at);
        return true;
      });
  }, [rows, search, filter]);

  function exportCsv() {
    const header = ["Invitado / familia", "WhatsApp", "Lugares asignados", "Confirmados", "RSVP", "Fecha de respuesta", "Envío", "Recordatorio", "Activa", "Enlace"];
    const lines = filteredRows.map(row => {
      const status = row.attending === true ? "Confirmado" : row.attending === false ? "No asistirá" : "Pendiente";
      const delivery = row.sent_at ? new Date(row.sent_at).toLocaleString("es-MX") : "Sin enviar";
      const reminder = row.reminder_sent_at ? new Date(row.reminder_sent_at).toLocaleString("es-MX") : "Sin recordatorio";
      const responseDate = row.response_updated_at ? new Date(row.response_updated_at).toLocaleString("es-MX") : "";
      const link = `${window.location.origin}/i/${row.token}`;
      return [row.display_name, row.whatsapp_phone ? `+${row.whatsapp_phone}` : "", row.guest_limit, row.confirmed_guests ?? "", status, responseDate, delivery, reminder, row.active ? "Sí" : "No", link]
        .map(value => `"${String(value).replaceAll('"', '""')}"`)
        .join(",");
    });
    const csv = "\uFEFF" + [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "confirmaciones-gabo-50.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!logged) {
    return (
      <main className="site admin adminPremium">
        <div className="adminHero">
          <div className="eyebrow gold">Panel privado</div><div className="rule" />
          <h1 className="adminTitle serif">Gabo · 50 años</h1>
          <p className="small adminIntro">Administración de invitaciones y confirmaciones.</p>
        </div>
        <div className="card adminLogin premiumCard">
          <p className="serif adminCardTitle">Acceso de administración</p>
          <label className="fieldLabel">
            Contraseña
            <input
              className="textInput"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") login(); }}
            />
          </label>
          <button className="btn primary" onClick={login}>Entrar</button>
          <div className="note" role="status">{message}</div>
        </div>
      </main>
    );
  }

  const activeRows = rows.filter(row => row.active);
  const confirmedPeople = activeRows.filter(r => r.attending).reduce((sum, row) => sum + (row.confirmed_guests || 0), 0);
  const assignedSeats = activeRows.reduce((sum, row) => sum + row.guest_limit, 0);
  const confirmedInvites = activeRows.filter(row => row.attending === true).length;
  const declines = activeRows.filter(row => row.attending === false).length;
  const pending = activeRows.filter(row => row.attending === null).length;
  const inactive = rows.filter(row => !row.active).length;

  return (
    <main className="site admin adminPremium">
      <div className="adminTopbar">
        <div>
          <div className="eyebrow gold">Panel de control</div>
          <h1 className="adminTitle serif">Gabo · 50 años</h1>
          <p className="small adminIntro">10 de octubre de 2026 · 2:30 pm</p>
        </div>
        <button className="adminGhostButton" onClick={logout}>Cerrar sesión</button>
      </div>

      <div className="stats statsPremium">
        <div className="stat"><b className="serif">{confirmedPeople}</b><span>Personas confirmadas</span></div>
        <div className="stat"><b className="serif">{assignedSeats}</b><span>Lugares asignados</span></div>
        <div className="stat"><b className="serif">{confirmedInvites}</b><span>Invitaciones confirmadas</span></div>
        <div className="stat"><b className="serif">{pending}</b><span>Pendientes</span></div>
        <div className="stat"><b className="serif">{declines}</b><span>No asistirán</span></div>
        <div className="stat"><b className="serif">{inactive}</b><span>Inactivas</span></div>
      </div>

      <div className="card premiumCard adminCreateCard">
        <div className="cardHeadingRow">
          <div>
            <div className="eyebrow gold">Nueva invitación</div>
            <h2 className="serif adminCardTitle">Crear enlace individual</h2>
          </div>
        </div>
        <div className="createGrid">
          <label className="fieldLabel">Familia o invitado
            <input className="textInput" value={name} onChange={e => setName(e.target.value)} />
          </label>
          <label className="fieldLabel">Lugares
            <select className="textInput" value={limit} onChange={e => setLimit(Number(e.target.value))}>
              {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} {n === 1 ? "persona" : "personas"}</option>)}
            </select>
          </label>
          <label className="fieldLabel">WhatsApp
            <input
              className="textInput"
              inputMode="tel"
              autoComplete="tel"
              placeholder="10 dígitos"
              value={phone}
              onChange={e => setPhone(e.target.value)}
            />
          </label>
        </div>
        <p className="small phoneHint">Para números de México puedes escribir únicamente los 10 dígitos. El sistema agrega +52 automáticamente.</p>
        <button className="btn primary" onClick={createInvite}>Crear invitación</button>
        {createdLink && (
          <div className="createdLinkBox">
            <div className="small">Último enlace creado</div>
            <div className="createdLinkText">{createdLink}</div>
            <button className="miniButton" onClick={copyCreatedLink}>Copiar enlace</button>
          </div>
        )}
        <div className="note" role="status">{message}</div>
      </div>

      <div className="adminListHeader">
        <div>
          <div className="eyebrow gold">Invitados</div>
          <h2 className="serif adminCardTitle">Confirmaciones</h2>
        </div>
        <button className="adminGhostButton" onClick={exportCsv}>Exportar resultados</button>
      </div>

      <div className="adminTools">
        <input
          className="textInput searchInput"
          aria-label="Buscar por nombre o WhatsApp"
          placeholder="Buscar nombre o WhatsApp"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="textInput filterSelect" aria-label="Filtrar invitaciones" value={filter} onChange={e => setFilter(e.target.value as Filter)}>
          <option value="all">Todas las activas</option>
          <option value="confirmed">Confirmadas</option>
          <option value="pending">Pendientes</option>
          <option value="declined">No asistirán</option>
          <option value="sent">Enviadas</option>
          <option value="unsent">Sin enviar</option>
          <option value="reminded">Con recordatorio</option>
          <option value="inactive">Inactivas</option>
        </select>
      </div>

      <div className="tableWrap premiumTableWrap">
        <table>
          <thead>
            <tr>
              <th>Invitado / familia</th>
              <th>Límite</th>
              <th>Confirmados</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map(row => {
              const status = !row.active ? "Inactiva" : row.attending === true ? "Confirmado" : row.attending === false ? "No asistirá" : "Pendiente";
              const statusClass = !row.active ? "statusInactive" : row.attending === true ? "statusConfirmed" : row.attending === false ? "statusDeclined" : "statusPending";
              const isEditing = editingId === row.id;
              return (
                <tr key={row.id} className={row.active ? "" : "inactiveRow"}>
                  <td>
                    {isEditing ? (
                      <div className="editFields">
                        <input className="textInput compactInput" aria-label="Nombre del invitado" value={editName} onChange={e => setEditName(e.target.value)} />
                        <input className="textInput compactInput" aria-label="WhatsApp del invitado" inputMode="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)} />
                      </div>
                    ) : (
                      <>
                        <strong>{row.display_name}</strong>
                        <div className={`phoneText ${row.whatsapp_phone ? "" : "phoneMissing"}`}>
                          {row.whatsapp_phone ? `+${row.whatsapp_phone}` : "Sin WhatsApp"}
                        </div>
                        <div className={`deliveryText ${row.sent_at ? "deliverySent" : ""}`}>
                          {row.sent_at ? `Enviada · ${new Date(row.sent_at).toLocaleDateString("es-MX")}` : "Sin enviar"}
                        </div>
                        {row.reminder_sent_at && (
                          <div className="deliveryText reminderSent">
                            Recordatorio · {new Date(row.reminder_sent_at).toLocaleDateString("es-MX")}
                          </div>
                        )}
                      </>
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <select className="textInput compactInput limitEdit" aria-label="Límite de lugares" value={editLimit} onChange={e => setEditLimit(Number(e.target.value))}>
                        {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    ) : row.guest_limit}
                  </td>
                  <td>
                    {row.confirmed_guests ?? "—"}
                    {row.response_updated_at && (
                      <div className="responseDate">{new Date(row.response_updated_at).toLocaleDateString("es-MX")}</div>
                    )}
                  </td>
                  <td><span className={`statusPill ${statusClass}`}>{status}</span></td>
                  <td>
                    <div className="linkActions">
                      {isEditing ? (
                        <>
                          <button className="miniButton primaryMiniButton" onClick={() => saveEdit(row)} disabled={busyId === row.id}>
                            {busyId === row.id ? "Guardando..." : "Guardar"}
                          </button>
                          <button className="miniButton" onClick={() => setEditingId(null)}>Cancelar</button>
                        </>
                      ) : row.active ? (
                        <>
                          <button
                            className="miniButton whatsappButton"
                            onClick={() => openWhatsApp(row)}
                            disabled={!row.whatsapp_phone}
                            title={row.whatsapp_phone ? "Abrir chat con el mensaje listo" : "Esta invitación no tiene WhatsApp"}
                          >
                            WhatsApp
                          </button>
                          {row.attending === null && (
                            <button
                              className="miniButton reminderButton"
                              onClick={() => openReminder(row)}
                              disabled={!row.whatsapp_phone}
                              title={row.whatsapp_phone ? "Enviar recordatorio de confirmación" : "Esta invitación no tiene WhatsApp"}
                            >
                              {row.reminder_sent_at ? "Reenviar recordatorio" : "Recordar"}
                            </button>
                          )}
                          <button className="miniButton" onClick={() => copyLink(row.token)}>
                            {copiedToken === row.token ? "Copiado" : "Copiar"}
                          </button>
                          <a className="miniLink" href={`/i/${row.token}`} target="_blank" rel="noopener noreferrer">Abrir</a>
                          <button className="miniButton" onClick={() => beginEdit(row)}>Editar</button>
                          <button className="miniButton dangerButton" onClick={() => deactivateInvite(row)} disabled={busyId === row.id}>
                            {busyId === row.id ? "Desactivando..." : "Desactivar"}
                          </button>
                        </>
                      ) : (
                        <>
                          <button className="miniButton" onClick={() => beginEdit(row)}>Editar</button>
                          <button className="miniButton restoreButton" onClick={() => restoreInvite(row)} disabled={busyId === row.id}>
                            {busyId === row.id ? "Recuperando..." : "Recuperar"}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredRows.length === 0 && <div className="emptyState">No hay resultados con estos filtros.</div>}
      </div>
    </main>
  );
}
