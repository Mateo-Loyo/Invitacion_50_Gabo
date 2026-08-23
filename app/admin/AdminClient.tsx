"use client";

import { useEffect, useMemo, useState } from "react";

type Row = {
  id: string;
  display_name: string;
  guest_limit: number;
  token: string;
  whatsapp_phone: string | null;
  attending: boolean | null;
  confirmed_guests: number | null;
};

type Filter = "all" | "confirmed" | "declined" | "pending";

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
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  async function deleteInvite(row: Row) {
    const ok = window.confirm(
      `¿Eliminar la invitación de ${row.display_name}?\n\nTambién se eliminará su confirmación de asistencia si ya respondió. Esta acción no se puede deshacer.`
    );
    if (!ok) return;

    setDeletingId(row.id);
    setMessage("");
    try {
      const r = await fetch(`/api/admin/invitations/${encodeURIComponent(row.id)}`, { method: "DELETE" });
      const data = await r.json();
      if (!data.ok) {
        setMessage(data.error || "No se pudo eliminar la invitación.");
        return;
      }
      if (createdLink.endsWith(`/i/${row.token}`)) setCreatedLink("");
      setMessage(`Invitación de ${row.display_name} eliminada.`);
      await loadData();
    } catch {
      setMessage("No se pudo eliminar la invitación. Intenta nuevamente.");
    } finally {
      setDeletingId(null);
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
      ? "Hemos reservado 1 lugar especialmente para ti."
      : `Hemos reservado ${row.guest_limit} lugares especialmente para ustedes.`;
    const detailsText = singular
      ? "Puedes consultar todos los detalles y confirmar tu asistencia en tu invitación personal:"
      : "Pueden consultar todos los detalles y confirmar su asistencia en su invitación personal:";
    const closingText = singular
      ? "Le dará mucho gusto celebrar contigo."
      : "Le dará mucho gusto celebrar con ustedes.";

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
      closingText
    ].join("\n");

    const url = `https://wa.me/${row.whatsapp_phone}?text=${encodeURIComponent(whatsappMessage)}`;
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

  function exportCsv() {
    const header = ["Invitado / familia", "WhatsApp", "Lugares asignados", "Confirmados", "Estado", "Enlace"];
    const lines = rows.map(row => {
      const status = row.attending === true ? "Confirmado" : row.attending === false ? "No asistirá" : "Pendiente";
      const link = `${window.location.origin}/i/${row.token}`;
      return [row.display_name, row.whatsapp_phone ? `+${row.whatsapp_phone}` : "", row.guest_limit, row.confirmed_guests ?? "", status, link]
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

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter(row => !q || row.display_name.toLowerCase().includes(q) || (row.whatsapp_phone || "").includes(q.replace(/\D/g, "")))
      .filter(row => {
        if (filter === "confirmed") return row.attending === true;
        if (filter === "declined") return row.attending === false;
        if (filter === "pending") return row.attending === null;
        return true;
      });
  }, [rows, search, filter]);

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
          <input
            className="textInput"
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") login(); }}
          />
          <button className="btn primary" onClick={login}>Entrar</button>
          <div className="note">{message}</div>
        </div>
      </main>
    );
  }

  const confirmedPeople = rows.filter(r => r.attending).reduce((s, r) => s + (r.confirmed_guests || 0), 0);
  const assignedSeats = rows.reduce((s, r) => s + r.guest_limit, 0);
  const confirmedInvites = rows.filter(r => r.attending === true).length;
  const declines = rows.filter(r => r.attending === false).length;
  const pending = rows.filter(r => r.attending === null).length;

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
      </div>

      <div className="card premiumCard adminCreateCard">
        <div className="cardHeadingRow">
          <div>
            <div className="eyebrow gold">Nueva invitación</div>
            <h2 className="serif adminCardTitle">Crear enlace individual</h2>
          </div>
        </div>
        <div className="createGrid">
          <input className="textInput" placeholder="Familia o invitado" value={name} onChange={e => setName(e.target.value)} />
          <select className="textInput" value={limit} onChange={e => setLimit(Number(e.target.value))}>
            {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} {n === 1 ? "persona" : "personas"}</option>)}
          </select>
          <input
            className="textInput"
            inputMode="tel"
            autoComplete="tel"
            placeholder="WhatsApp · 10 dígitos"
            value={phone}
            onChange={e => setPhone(e.target.value)}
          />
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
        <div className="note">{message}</div>
      </div>

      <div className="adminListHeader">
        <div>
          <div className="eyebrow gold">Invitados</div>
          <h2 className="serif adminCardTitle">Confirmaciones</h2>
        </div>
        <button className="adminGhostButton" onClick={exportCsv}>Exportar CSV</button>
      </div>

      <div className="adminTools">
        <input className="textInput searchInput" placeholder="Buscar nombre o WhatsApp" value={search} onChange={e => setSearch(e.target.value)} />
        <select className="textInput filterSelect" value={filter} onChange={e => setFilter(e.target.value as Filter)}>
          <option value="all">Todos los estados</option>
          <option value="confirmed">Confirmados</option>
          <option value="pending">Pendientes</option>
          <option value="declined">No asistirán</option>
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
              const status = row.attending === true ? "Confirmado" : row.attending === false ? "No asistirá" : "Pendiente";
              const statusClass = row.attending === true ? "statusConfirmed" : row.attending === false ? "statusDeclined" : "statusPending";
              return (
                <tr key={row.id}>
                  <td>
                    <strong>{row.display_name}</strong>
                    <div className={`phoneText ${row.whatsapp_phone ? "" : "phoneMissing"}`}>
                      {row.whatsapp_phone ? `+${row.whatsapp_phone}` : "Sin WhatsApp"}
                    </div>
                  </td>
                  <td>{row.guest_limit}</td>
                  <td>{row.confirmed_guests ?? "—"}</td>
                  <td><span className={`statusPill ${statusClass}`}>{status}</span></td>
                  <td>
                    <div className="linkActions">
                      <button
                        className="miniButton whatsappButton"
                        onClick={() => openWhatsApp(row)}
                        disabled={!row.whatsapp_phone}
                        title={row.whatsapp_phone ? "Abrir chat con el mensaje listo" : "Esta invitación no tiene WhatsApp"}
                      >
                        WhatsApp
                      </button>
                      <button className="miniButton" onClick={() => copyLink(row.token)}>
                        {copiedToken === row.token ? "Copiado" : "Copiar"}
                      </button>
                      <a className="miniLink" href={`/i/${row.token}`} target="_blank" rel="noopener noreferrer">Abrir</a>
                      <button
                        className="miniButton dangerButton"
                        onClick={() => deleteInvite(row)}
                        disabled={deletingId === row.id}
                      >
                        {deletingId === row.id ? "Eliminando..." : "Eliminar"}
                      </button>
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
