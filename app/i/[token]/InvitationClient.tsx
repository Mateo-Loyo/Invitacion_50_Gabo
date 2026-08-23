"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type Invite = {
  display_name: string;
  guest_limit: number;
  attending: boolean | null;
  confirmed_guests: number | null;
  mode: "demo" | "live";
};

const MAP_URL = "https://bit.ly/4xqinNI";

const HOTELS = [
  [
    "Holiday Inn Express Guadalajara Vallarta Poniente by IHG",
    "https://www.google.com/maps/search/?api=1&query=Holiday+Inn+Express+Guadalajara+Vallarta+Poniente+by+IHG"
  ],
  [
    "Avid Hotels Guadalajara Av Vallarta PTE, an IHG Hotel",
    "https://www.google.com/maps/search/?api=1&query=Avid+Hotels+Guadalajara+Av+Vallarta+PTE+an+IHG+Hotel"
  ],
  [
    "Fiesta Inn Guadalajara Poniente",
    "https://www.google.com/maps/search/?api=1&query=Fiesta+Inn+Guadalajara+Poniente"
  ],
  [
    "One Guadalajara Periférico Poniente",
    "https://www.google.com/maps/search/?api=1&query=One+Guadalajara+Periferico+Poniente"
  ]
] as const;

export default function InvitationClient({ token }: { token: string }) {
  const [invite, setInvite] = useState<Invite | null>(null);
  const [loading, setLoading] = useState(true);
  const [attending, setAttending] = useState<boolean | null>(null);
  const [guests, setGuests] = useState(1);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedNow, setSavedNow] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [count, setCount] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setMessage("");

    fetch(`/api/invite/${encodeURIComponent(token)}`, {
      cache: "no-store",
      signal: controller.signal
    })
      .then(async response => {
        const data = await response.json();
        if (!response.ok || !data.ok) throw new Error(data.error || "Invitación no encontrada.");
        return data;
      })
      .then(data => {
        const invitation: Invite = data.invitation;
        setInvite(invitation);
        setAttending(invitation.attending);
        setGuests(
          invitation.confirmed_guests && invitation.confirmed_guests > 0
            ? invitation.confirmed_guests
            : 1
        );
      })
      .catch(error => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setInvite(null);
        setMessage(error instanceof Error ? error.message : "No fue posible abrir la invitación.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [token, loadAttempt]);

  useEffect(() => {
    const eventDate = new Date("2026-10-10T14:30:00-06:00");
    const tick = () => {
      let difference = Math.max(0, eventDate.getTime() - Date.now());
      const days = Math.floor(difference / 86400000);
      difference %= 86400000;
      const hours = Math.floor(difference / 3600000);
      difference %= 3600000;
      const minutes = Math.floor(difference / 60000);
      difference %= 60000;
      setCount({ days, hours, minutes, seconds: Math.floor(difference / 1000) });
    };

    tick();
    const intervalId = window.setInterval(tick, 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (loading) return;

    const elements = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (!("IntersectionObserver" in window)) {
      elements.forEach(element => element.classList.add("isVisible"));
      return;
    }

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("isVisible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -8% 0px" }
    );

    elements.forEach(element => observer.observe(element));
    return () => observer.disconnect();
  }, [loading]);

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
      localStorage.setItem(
        `GABO_DEMO_${token}`,
        JSON.stringify({ attending, confirmedGuests, updatedAt: new Date().toISOString() })
      );
      setInvite(previous =>
        previous ? { ...previous, attending, confirmed_guests: confirmedGuests } : previous
      );
      setSaving(false);
      setSavedNow(true);
      return;
    }

    try {
      const response = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, attending, confirmedGuests })
      });
      const data = await response.json();
      if (!data.ok) {
        setMessage(data.error || "No fue posible guardar la confirmación.");
        return;
      }
      setInvite(previous =>
        previous ? { ...previous, attending, confirmed_guests: confirmedGuests } : previous
      );
      setSavedNow(true);
    } catch {
      setMessage("No fue posible guardar la confirmación. Intenta nuevamente.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="site centerPage invitationState" aria-busy="true">
        <span className="loadingDot" aria-hidden="true" />
        <p>Cargando tu invitación…</p>
      </main>
    );
  }

  if (!invite) {
    return (
      <main className="site centerPage invitationState">
        <div className="stateMark" aria-hidden="true">✦</div>
        <h1 className="serif">No pudimos abrir la invitación</h1>
        <p>{message || "Revisa el enlace e intenta nuevamente."}</p>
        <button type="button" className="btn primary" onClick={() => setLoadAttempt(value => value + 1)}>
          Intentar de nuevo
        </button>
      </main>
    );
  }

  const plural = invite.guest_limit > 1;
  const hasResponse = invite.attending !== null;
  const currentConfirmed = invite.confirmed_guests || 0;

  return (
    <main className="site premiumInvitation">
      <section className="section hero premiumHero" aria-labelledby="hero-title">
        <div className="sceneMedia heroMedia" aria-hidden="true">
          <Image src="/gabo-premium-hero.webp" alt="" fill priority sizes="(max-width: 720px) 100vw, 720px" className="sceneImage heroSceneImage" />
          <div className="heroColorWash" />
          <div className="filmGrain" />
          <span className="ambientGlow glowOne" />
          <span className="ambientGlow glowTwo" />
        </div>
        <div className="heroFrame" aria-hidden="true"><i /><i /><i /><i /></div>

        <div className="heroInner">
          <p className="opening serif">Hoy no celebro 50 años,<br />celebro el compartirlos<br />con personas como tú.</p>
          <div className="brandLockup" id="hero-title" aria-label="GABO 50">
            <span className="brandName script">GABO</span>
            <strong className="brandNumber serif">50</strong>
          </div>
          <div className="heroDetails">
            <p className="date serif">10 de octubre 2026</p>
            <p className="timeRibbon">Arrancamos 2:30 pm, tómate tu tiempo!!!</p>
            <p className="venueHero serif">Hacienda de Huaxtla.</p>
          </div>
          <div className="scroll">Desliza para descubrir<span className="chev" /></div>
        </div>
      </section>

      <section className="section welcomeSection parchment" data-reveal aria-labelledby="welcome-title">
        <div className="paperTexture" aria-hidden="true" />
        <div className="contentLayer narrowContent">
          <p className="eyebrow">Invitación para</p>
          <div className="rule" />
          <h2 className="guestName script" id="welcome-title">{invite.display_name}</h2>
          <div className="guestAllocation serif"><span>Lugares reservados</span><strong>{invite.guest_limit}</strong></div>
        </div>
      </section>

      <section className="section countdownSection" data-reveal aria-labelledby="countdown-title">
        <div className="countdownGlow" aria-hidden="true" />
        <div className="contentLayer">
          <p className="eyebrow gold">La espera termina en</p>
          <h2 className="visuallyHidden" id="countdown-title">Cuenta regresiva para el 10 de octubre 2026</h2>
          <div className="rule" />
          <div className="countdown" aria-label="Cuenta regresiva para el evento">
            <Count number={count.days} label="Días" />
            <Count number={count.hours} label="Horas" pad />
            <Count number={count.minutes} label="Minutos" pad />
            <Count number={count.seconds} label="Segundos" pad />
          </div>
          <p className="countdownDate serif">10 de octubre 2026</p>
        </div>
      </section>

      <section className="section locationSection" data-reveal aria-labelledby="location-title">
        <div className="locationPattern" aria-hidden="true" />
        <div className="contentLayer">
          <p className="eyebrow gold">Lugar</p>
          <h2 className="sectionTitle serif" id="location-title">Hacienda de Huaxtla.</h2>
          <div className="rule" />
          <div className="locationCard premiumCard">
            <span className="mapPin" aria-hidden="true"><i /></span>
            <p className="serif locationText">Av. López Mateos 60, Destiladora Refugio, 45368 Huaxtla, Jal.</p>
            <a className="btn mapButton" target="_blank" rel="noopener noreferrer" href={MAP_URL}>Abrir Google Maps</a>
          </div>
        </div>
      </section>

      <section className="section experienceSection" data-reveal aria-labelledby="experience-title">
        <div className="sceneMedia experienceMedia" aria-hidden="true">
          <Image src="/gabo-cuban-dress.webp" alt="" fill sizes="(max-width: 720px) 100vw, 720px" className="sceneImage experienceSceneImage" />
          <div className="experienceShade" />
          <div className="filmGrain" />
        </div>
        <div className="contentLayer experienceContent">
          <p className="eyebrow gold">La experiencia</p>
          <h2 className="experienceTitle script" id="experience-title">Cuban vibes</h2>
          <div className="rule" />
          <div className="experienceCopy">
            <p className="experienceTime serif">Arrancamos 2:30 pm, tómate tu tiempo!!!</p>
            <p className="recommendation serif">Muy importante: ¡trae tus zapatos más cómodos, porque esta fiesta no es para quedarse sentado!</p>
          </div>
          <div className="dressCard glassCard">
            <p className="eyebrow">Dress code</p>
            <p className="dressCode serif">Ven cómodo, ven alegre, ven tú: Guayaberas, vestidos tropicales, flores, colores, sombreros, abanicos...todo es bienvenido!!!</p>
            <div className="palette" aria-label="Paleta Cuban vibes"><i /><i /><i /><i /><i /></div>
          </div>
        </div>
      </section>

      <section className="section hotelsSection parchment" data-reveal aria-labelledby="hotels-title">
        <div className="paperTexture" aria-hidden="true" />
        <div className="contentLayer">
          <p className="eyebrow">Hoteles</p>
          <h2 className="sectionTitle serif" id="hotels-title">Hoteles recomendados para foráneos</h2>
          <div className="rule" />
          <div className="hotelGrid">
            {HOTELS.map(([name, url], index) => (
              <a className="hotelCard" href={url} target="_blank" rel="noopener noreferrer" key={name} style={{ "--hotel-index": index } as React.CSSProperties}>
                <span className="hotelNumber serif">0{index + 1}</span>
                <strong className="serif">{name}</strong>
                <em>Ver ubicación <span aria-hidden="true">↗</span></em>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="section rsvpSection" id="rsvp" data-reveal aria-labelledby="rsvp-title">
        <div className="rsvpOrnament" aria-hidden="true" />
        <div className="contentLayer">
          <p className="eyebrow gold">Confirmación</p>
          <h2 className="sectionTitle serif" id="rsvp-title">Confirmación de asistencia</h2>
          <div className="rule" />
          <div className="rsvpCard premiumCard">
            <p className="rsvpFor">Invitación para</p>
            <p className="family script">{invite.display_name}</p>
            <div className="reservedFact"><span>Lugares reservados</span><strong className="serif">{invite.guest_limit}</strong></div>

            {hasResponse ? (
              <div className={`responseSummary ${invite.attending ? "responseYes" : "responseNo"}`}>
                <span>Respuesta registrada</span>
                <strong className="serif">{invite.attending ? `${currentConfirmed} ${currentConfirmed === 1 ? "persona confirmada" : "personas confirmadas"}` : "No asistirán"}</strong>
              </div>
            ) : null}

            <fieldset className="choiceFieldset">
              <legend className="serif question">¿Confirmas tu asistencia?</legend>
              <div className="choice">
                <label className={attending === true ? "choiceSelected" : ""}>
                  <input type="radio" name="attendance" checked={attending === true} onChange={() => { setAttending(true); setSavedNow(false); }} />
                  <span>{plural ? "Sí, asistiremos" : "Sí, asistiré"}</span>
                </label>
                <label className={attending === false ? "choiceSelected" : ""}>
                  <input type="radio" name="attendance" checked={attending === false} onChange={() => { setAttending(false); setSavedNow(false); }} />
                  <span>{plural ? "No asistiremos" : "No asistiré"}</span>
                </label>
              </div>
            </fieldset>

            {attending === true ? (
              <div className="pickerWrap">
                <p className="serif">{plural ? "Personas que asistirán" : "Persona que asistirá"}</p>
                {plural ? (
                  <>
                    <div className="picker">
                      <button type="button" className="round" onClick={() => { setGuests(Math.max(1, guests - 1)); setSavedNow(false); }} aria-label="Restar persona">−</button>
                      <div className="guestNum serif" aria-live="polite">{guests}</div>
                      <button type="button" className="round" onClick={() => { setGuests(Math.min(invite.guest_limit, guests + 1)); setSavedNow(false); }} aria-label="Agregar persona">+</button>
                    </div>
                    <p className="note">Máximo: {invite.guest_limit}</p>
                  </>
                ) : <div className="singleGuestMark"><span>✓</span> 1 persona</div>}
              </div>
            ) : null}

            <button type="button" className="btn primary confirmButton" onClick={confirm} disabled={saving}>
              {saving ? "Guardando..." : hasResponse ? "Actualizar confirmación" : "Confirmar asistencia"}
            </button>

            {savedNow ? (
              <div className="confirmationSuccess" role="status" aria-live="polite">
                <span className="successIcon">✓</span>
                <div><strong className="serif">Confirmación guardada</strong><p>{attending ? `${guests} ${guests === 1 ? "persona" : "personas"}` : "No asistirán"}</p></div>
              </div>
            ) : null}
            {message ? <div className="note errorNote" role="status">{message}</div> : null}
          </div>
        </div>
      </section>

      <section className="section finalSection" data-reveal aria-labelledby="final-title">
        <div className="sceneMedia finalMedia" aria-hidden="true">
          <Image src="/gabo-night-finale.webp" alt="" fill sizes="(max-width: 720px) 100vw, 720px" className="sceneImage finalSceneImage" />
          <div className="finalShade" />
          <div className="filmGrain" />
        </div>
        <div className="contentLayer finalContent">
          <div className="finalBrand" aria-label="GABO 50"><span className="script">GABO</span><strong className="serif">50</strong></div>
          <div className="rule" />
          <p className="finalPhrase serif" id="final-title">Vamos a brindar, reír y disfrutar al ritmo de la vida.</p>
        </div>
      </section>
    </main>
  );
}

function Count({ number, label, pad = false }: { number: number; label: string; pad?: boolean }) {
  return <div className="count"><div className="n serif">{pad ? String(number).padStart(2, "0") : number}</div><div className="l">{label}</div></div>;
}
