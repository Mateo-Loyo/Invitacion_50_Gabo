"use client";

import { useEffect, useState } from "react";

type Invite = {
  display_name: string;
  guest_limit: number;
  attending: boolean | null;
  confirmed_guests: number | null;
  mode: "demo" | "live";
};

const MAP_URL = "https://www.google.com/maps/search/?api=1&query=Hacienda+de+Huaxtla%2C+Av.+L%C3%B3pez+Mateos+60%2C+Destiladora+Refugio%2C+45368+Huaxtla%2C+Jalisco";
const WAZE_URL = "https://www.waze.com/ul?q=Hacienda%20de%20Huaxtla%2C%20Av.%20L%C3%B3pez%20Mateos%2060%2C%20Huaxtla%2C%20Jalisco&navigate=yes";
const HOTELS = [
  ["Holiday Inn Express Guadalajara Vallarta Poniente", "https://www.google.com/maps/search/?api=1&query=Holiday+Inn+Express+Guadalajara+Vallarta+Poniente"],
  ["avid hotel Guadalajara Av. Vallarta Poniente", "https://www.google.com/maps/search/?api=1&query=avid+hotel+Guadalajara+Av+Vallarta+Poniente"],
  ["Fiesta Inn Guadalajara Periférico Poniente", "https://www.google.com/maps/search/?api=1&query=Fiesta+Inn+Guadalajara+Periferico+Poniente"],
  ["One Guadalajara Periférico Poniente", "https://www.google.com/maps/search/?api=1&query=One+Guadalajara+Periferico+Poniente"]
] as const;

export default function InvitationClient({ token }: { token: string }) {
  const [invite, setInvite] = useState<Invite | null>(null);
  const [loading, setLoading] = useState(true);
  const [attending, setAttending] = useState<boolean | null>(null);
  const [guests, setGuests] = useState(1);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedNow, setSavedNow] = useState(false);
  const [count, setCount] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    fetch(`/api/invite/${encodeURIComponent(token)}`, { cache: "no-store" })
      .then(r => r.json())
      .then(data => {
        if (!data.ok) throw new Error(data.error || "Invitación no encontrada.");
        const inv: Invite = data.invitation;
        setInvite(inv);
        setAttending(inv.attending);
        if (inv.confirmed_guests && inv.confirmed_guests > 0) setGuests(inv.confirmed_guests);
      })
      .catch(err => setMessage(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    const eventDate = new Date("2026-10-10T14:30:00-06:00");
    const tick = () => {
      let diff = Math.max(0, eventDate.getTime() - Date.now());
      const days = Math.floor(diff / 86400000); diff %= 86400000;
      const hours = Math.floor(diff / 3600000); diff %= 3600000;
      const minutes = Math.floor(diff / 60000); diff %= 60000;
      setCount({ days, hours, minutes, seconds: Math.floor(diff / 1000) });
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  function addToCalendar() {
    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Gabo//50 años//ES", "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT", "UID:gabo-50-20261010@invitacion-gabo.vercel.app", "DTSTAMP:20260823T000000Z",
      "DTSTART;TZID=America/Mexico_City:20261010T143000", "DTEND;TZID=America/Mexico_City:20261010T210000",
      "SUMMARY:Gabo · 50 años", "DESCRIPTION:Celebración de los 50 años de Gabo. Dress code: Cuban vibes.",
      "LOCATION:Hacienda de Huaxtla\\, Av. López Mateos 60\\, Destiladora Refugio\\, 45368 Huaxtla\\, Jalisco",
      "END:VEVENT", "END:VCALENDAR"
    ].join("\r\n");
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "Gabo-50-anos.ics";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function confirm() {
    if (!invite || attending === null) {
      setMessage("Selecciona una opción para continuar.");
      setSavedNow(false);
      return;
    }
    setSaving(true);
    setSavedNow(false);
    setMessage("");
    const confirmedGuests = attending ? guests : 0;
    if (invite.mode === "demo") {
      localStorage.setItem(`GABO_DEMO_${token}`, JSON.stringify({ attending, confirmedGuests, updatedAt: new Date().toISOString() }));
      setInvite(prev => prev ? { ...prev, attending, confirmed_guests: confirmedGuests } : prev);
      setSaving(false);
      setSavedNow(true);
      return;
    }
    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, attending, confirmedGuests })
      });
      const data = await res.json();
      if (!data.ok) {
        setMessage(data.error || "No fue posible guardar la confirmación.");
        return;
      }
      setInvite(prev => prev ? { ...prev, attending, confirmed_guests: confirmedGuests } : prev);
      setSavedNow(true);
    } catch {
      setMessage("No fue posible guardar la confirmación. Intenta nuevamente.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main className="site centerPage"><p>Cargando invitación…</p></main>;
  if (!invite) return <main className="site centerPage"><p>{message || "Invitación no encontrada."}</p></main>;

  const plural = invite.guest_limit > 1;
  const hasResponse = invite.attending !== null;
  const currentConfirmed = invite.confirmed_guests || 0;

  return (
    <main className="site">
      <section className="section hero cubanHero">
        <div className="heroShade" />
        <div className="heroInner">
          <p className="opening serif">Hoy no celebro 50 años,<br />celebro el compartirlos<br />con personas como tú.</p>
          <div className="brandLockup">
            <span className="brandName script">Gabo</span>
            <strong className="brandNumber serif">50</strong>
            <span className="brandYears script">años</span>
          </div>
          <div className="date serif">10 · OCTUBRE · 2026</div>
          <div className="timeRibbon">Arrancamos 2:30 pm</div>
          <div className="venueHero serif">Hacienda de Huaxtla</div>
          <div className="scroll">Desliza para descubrir<span className="chev" /></div>
        </div>
      </section>

      <section className="section parchment countdownSection">
        <div className="eyebrow">La espera termina en</div><div className="rule" />
        <div className="countdown">
          <Count number={count.days} label="Días" /><Count number={count.hours} label="Horas" pad />
          <Count number={count.minutes} label="Minutos" pad /><Count number={count.seconds} label="Segundos" pad />
        </div>
        <button className="calendarButton" onClick={addToCalendar}>＋ Agregar al calendario</button>
      </section>

      <section className="section fiestaSection">
        <div className="contentLayer">
          <div className="eyebrow gold">Importante</div><div className="rule" />
          <h2 className="script featureScript">¡Tómate tu tiempo!</h2>
          <p className="featureText serif">Muy importante: trae tus zapatos más cómodos, porque esta fiesta no es para quedarse sentado.</p>
        </div>
      </section>

      <section className="section location">
        <div className="contentLayer">
          <div className="eyebrow gold">Ubicación</div>
          <h2 className="title serif">Hacienda de Huaxtla</h2><div className="rule" />
          <div className="card locationCard">
            <p className="serif locationText">Av. López Mateos 60<br />Destiladora Refugio<br />45368 Huaxtla, Jal.</p>
            <div className="mapButtons">
              <a className="btn" target="_blank" rel="noopener noreferrer" href={MAP_URL}>Google Maps</a>
              <a className="btn btnOutline" target="_blank" rel="noopener noreferrer" href={WAZE_URL}>Waze</a>
            </div>
          </div>
        </div>
      </section>

      <section className="section dressSection">
        <div className="dressIcon">✦</div><div className="eyebrow gold">Dress code</div>
        <h2 className="script dressTitle">Cuban vibes</h2><div className="rule" />
        <p className="serif featureText">Ven cómodo, ven alegre, ven tú: guayaberas, vestidos tropicales, flores, colores, sombreros y abanicos… todo es bienvenido.</p>
        <div className="palette"><i /><i /><i /><i /><i /></div>
      </section>

      <section className="section hotelsSection">
        <div className="eyebrow">Para quienes nos visitan</div><h2 className="title serif">Hoteles recomendados</h2><div className="rule" />
        <div className="hotelGrid">
          {HOTELS.map(([name, url]) => <a className="hotelCard" href={url} target="_blank" rel="noopener noreferrer" key={name}><span>Hospedaje</span><strong className="serif">{name}</strong><em>Ver ubicación →</em></a>)}
        </div>
      </section>

      <section className="section rsvp" id="rsvp">
        <div className="contentLayer">
          <div className="eyebrow">Confirmación de asistencia</div><div className="rule" />
          <div className="card rsvpCard">
            <div className="family script">{invite.display_name}</div>
            <p className="reserved serif">
              {plural ? "Quiero celebrar con ustedes." : "Quiero celebrar contigo."}<br />
              {plural ? <>He reservado <strong className="gold">{invite.guest_limit} lugares</strong> para ustedes.</> : <>He reservado <strong className="gold">1 lugar</strong> especialmente para ti.</>}
            </p>
            {hasResponse && <div className={`responseSummary ${invite.attending ? "responseYes" : "responseNo"}`}><div className="responseLabel">Respuesta registrada</div><strong className="serif">{invite.attending ? `${currentConfirmed} ${currentConfirmed === 1 ? "persona confirmada" : "personas confirmadas"}` : "No podrán acompañarnos"}</strong><p>Puedes modificar tu respuesta aquí mismo.</p></div>}
            <p className="serif question">¿Me acompañarán?</p>
            <div className="choice">
              <label className={attending === true ? "choiceSelected" : ""}><input type="radio" name="attendance" checked={attending === true} onChange={() => { setAttending(true); setSavedNow(false); }} /><span>{plural ? "Sí, ahí estaremos" : "Sí, ahí estaré"}</span></label>
              <label className={attending === false ? "choiceSelected" : ""}><input type="radio" name="attendance" checked={attending === false} onChange={() => { setAttending(false); setSavedNow(false); }} /><span>{plural ? "No podremos acompañarte" : "No podré acompañarte"}</span></label>
            </div>
            {attending === true && <div className="pickerWrap"><div className="serif">{plural ? "¿Cuántos me acompañarán?" : "Tu lugar está reservado"}</div>{plural ? <><div className="picker"><button className="round" onClick={() => { setGuests(Math.max(1, guests - 1)); setSavedNow(false); }} aria-label="Restar persona">−</button><div className="guestNum serif">{guests}</div><button className="round" onClick={() => { setGuests(Math.min(invite.guest_limit, guests + 1)); setSavedNow(false); }} aria-label="Agregar persona">+</button></div><div className="note">Máximo autorizado: {invite.guest_limit} personas.</div></> : <div className="singleGuestMark"><span>✓</span> 1 persona</div>}</div>}
            <button className="btn primary confirmButton" onClick={confirm} disabled={saving}>{saving ? "Guardando..." : hasResponse ? "Actualizar confirmación" : "Confirmar asistencia"}</button>
            {savedNow && <div className="confirmationSuccess" role="status"><div className="successIcon">✓</div><div><strong className="serif">Tu respuesta quedó guardada</strong><p>{attending ? `Confirmamos ${guests} ${guests === 1 ? "lugar" : "lugares"}.` : "Gracias por avisarme."}</p></div></div>}
            {message && <div className="note errorNote" role="status">{message}</div>}
          </div>
        </div>
      </section>

      <section className="section final">
        <div className="contentLayer"><div className="miniCar">✦</div><div className="script thanks">Vamos a brindar,</div><p className="serif finalText">reír y disfrutar<br />al ritmo de la vida.</p><div className="rule" /><div className="eyebrow gold">Gabo · 50 años</div></div>
      </section>
    </main>
  );
}

function Count({ number, label, pad = false }: { number: number; label: string; pad?: boolean }) {
  return <div className="count"><div className="n serif">{pad ? String(number).padStart(2, "0") : number}</div><div className="l">{label}</div></div>;
}
