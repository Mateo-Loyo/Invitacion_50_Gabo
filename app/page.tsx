import Image from "next/image";

export default function Home() {
  return (
    <main className="site launcher">
      <Image
        src="/gabo-premium-hero.webp"
        alt=""
        fill
        priority
        sizes="(max-width: 720px) 100vw, 720px"
        className="launcherImage"
      />
      <div className="launcherShade" aria-hidden="true" />
      <section className="launcherPanel">
        <div className="eyebrow gold">Invitación privada</div>
        <div className="rule" />
        <div className="brandLockup compact" aria-label="GABO 50">
          <span className="brandName script">GABO</span>
          <strong className="brandNumber serif">50</strong>
        </div>
        <p className="serif launcherLead">Hoy no celebro 50 años, celebro el compartirlos con personas como tú.</p>
        <p className="small">Abre el enlace personal que recibiste para consultar tus lugares y confirmar asistencia.</p>
        <div className="eyebrow gold launcherDate">10 de octubre 2026</div>
      </section>
    </main>
  );
}
