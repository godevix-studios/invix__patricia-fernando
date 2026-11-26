import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { Route } from "./+types/home";
import { cn } from "../lib/cn";

const songId = "0OGCsECyIt8";
const venueMapUrl = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3644.3351726311807!2d-104.51489199999999!3d24.019243!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x869bb07ee698b0d9%3A0x46e42c3f9728aae5!2sHacienda%20Victoria!5e0!3m2!1ses-419!2smx!4v1795449568264!5m2!1ses-419!2smx";

const storyText = {
  meeting:
    "Hace catorce años nos vimos por primera vez en la universidad. No hacía falta decir mucho: desde ese momento ambos sabíamos que había algo ahí, una atracción distinta, difícil de ignorar.",
  paths:
    "El tiempo nos pidió caminar por separado. Cada uno tenía que recorrer su propio camino, tomar decisiones, equivocarse y aprender. Cometer nuestros propios errores era necesario para madurar.",
  growth:
    "Cada caída nos enseñó algo. Cada etapa nos fue moldeando hasta convertirnos en las personas que hoy somos… listos para entender, cuidar y ser lo mejor el uno para el otro.",
  promise:
    "Ha llegado el día que nadie imaginaba; hoy unimos nuestras almas y entrelazamos las manos y los corazones para iniciar una nueva historia, con la promesa de elegirnos cada día.",
};

const itinerary = [
  {
    time: "19:00",
    displayTime: "7:00 PM",
    icon: "glasses",
    title: "Cóctel de Bienvenida",
    description: "Comenzamos la noche brindando juntos.",
  },
  {
    time: "20:00",
    displayTime: "8:00 PM",
    icon: "church",
    title: "Ceremonia Simbólica",
    description: "El momento en que unimos nuestras vidas y nuestros corazones.",
  },
  {
    time: "21:00",
    displayTime: "9:00 PM",
    icon: "cutlery",
    title: "Banquete y Celebración",
    description: "Cenamos, brindamos y bailamos para celebrar nuestra nueva historia.",
  },
] as const;

const weddingDate = new Date("2027-01-23T00:00:00-06:00").getTime();

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Patricia y Fernando | Nuestra boda" },
    {
      name: "description",
      content: "Patricia y Fernando se casan el 23 de enero de 2027 en Hacienda la Victoria. Nos encantará compartir este día contigo.",
    },
    { property: "og:title", content: "Patricia y Fernando | Nuestra boda" },
    { property: "og:description", content: "23 de enero de 2027 · Hacienda la Victoria" },
    { property: "og:image", content: "/imgs/3.jpg" },
  ];
}

function ArrowIcon({ diagonal = false }: { diagonal?: boolean }) {
  return diagonal ? (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d="M5 19 19 5M7 5h12v12" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ) : (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d="M4 12h15m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function MusicIcon({ playing }: { playing: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path
        d="M9 18V5l11-2v13M9 8l11-2M9 18c0 1.4-1.3 2.5-3 2.5S3 19.4 3 18s1.3-2.5 3-2.5S9 16.6 9 18Zm11-2c0 1.4-1.3 2.5-3 2.5s-3-1.1-3-2.5 1.3-2.5 3-2.5 3 1.1 3 2.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {!playing && <path d="M3 3 21 21" stroke="currentColor" strokeWidth="1.4" />}
    </svg>
  );
}

function ItineraryIcon({ kind }: { kind: (typeof itinerary)[number]["icon"] }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {kind === "glasses" && (
        <>
          <path d="M3.5 5h10l-1 7a4 4 0 0 1-8 0l-1-7ZM8.5 16v10M4.5 28h8" />
          <path d="M18.5 5h10l-1 7a4 4 0 0 1-8 0l-1-7ZM23.5 16v10M19.5 28h8" />
        </>
      )}
      {kind === "church" && (
        <path d="M4 28h24M7 28V14l9-6 9 6v14M13 28v-7a3 3 0 0 1 6 0v7M16 8V3M13 5h6M10 16h2M20 16h2" />
      )}
      {kind === "cutlery" && (
        <path d="M5 3v9a4 4 0 0 0 8 0V3M9 3v26M5 9h8M23 3c-3 3-4 7-4 12h5V3h-1ZM24 15v14" />
      )}
    </svg>
  );
}

function Intro({ onOpen }: { onOpen: () => void }) {
  const reduceMotion = useReducedMotion();
  const [envelopeOpen, setEnvelopeOpen] = useState(false);

  const nameMotion = (delay: number) => ({
    opacity: envelopeOpen ? 1 : 0,
    y: envelopeOpen ? 0 : 12,
    transition: { duration: reduceMotion ? 0 : 0.45, delay: reduceMotion ? 0 : delay },
  });

  return (
    <motion.main
      className="intro-screen envelope-screen"
      initial={false}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.4 }}
    >
      <div className={cn("envelope-stage", envelopeOpen && "is-open")}>
        <div className="envelope-reveal" aria-hidden={!envelopeOpen}>
          <span className="reveal-ornament" aria-hidden="true">✦</span>
          <p className="reveal-overline">Nos casamos</p>
          <h1 className="reveal-names">
            <motion.span animate={nameMotion(0.52)}>Patricia</motion.span>
            <motion.span className="reveal-amp" animate={nameMotion(0.66)}>&amp;</motion.span>
            <motion.span animate={nameMotion(0.8)}>Fernando</motion.span>
          </h1>
          <p className="reveal-date">23 de enero de 2027</p>
        </div>
        <button
          className={cn("envelope-button", envelopeOpen && "is-open")}
          type="button"
          onClick={() => setEnvelopeOpen(true)}
          disabled={envelopeOpen}
          aria-label="Abrir el sobre de Patricia y Fernando"
          aria-expanded={envelopeOpen}
        >
          <span className="envelope-cover envelope-cover-top" aria-hidden="true" />
          <span className="envelope-cover envelope-cover-bottom" aria-hidden="true" />
          {/* <span className="cover-names" aria-hidden="true">Patricia <span>&amp;</span> Fernando</span> */}
          <span className="cover-hint" aria-hidden="true">Toca para abrir</span>
        </button>
        <div className="envelope-action">
          <AnimatePresence mode="wait" initial={false}>
            {envelopeOpen ? (
              <motion.button
                key="enter"
                className="primary-button envelope-cta"
                type="button"
                onClick={onOpen}
                initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.4, delay: reduceMotion ? 0 : 1.1 }}
              >
                Ver invitación <ArrowIcon />
              </motion.button>
            ) : null}
          </AnimatePresence>
        </div>
        <span className="sr-only" role="status">
          {envelopeOpen ? "Sobre abierto. Ya puedes ver la invitación." : ""}
        </span>
      </div>
    </motion.main>
  );
}

function Countdown() {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const update = () => setRemaining(Math.max(0, weddingDate - Date.now()));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (remaining === 0) {
    return <p className="countdown-arrived">¡El gran día llegó!</p>;
  }

  const values = remaining === null
    ? ["—", "—", "—", "—"]
    : [
        Math.floor(remaining / 86_400_000),
        Math.floor((remaining / 3_600_000) % 24),
        Math.floor((remaining / 60_000) % 60),
        Math.floor((remaining / 1_000) % 60),
      ].map((value) => String(value).padStart(2, "0"));

  return (
    <div className="countdown" aria-label="Cuenta regresiva para el 23 de enero de 2027">
      <p className="countdown-intro">Faltan</p>
      <div className="countdown-grid">
        {(["Días", "Horas", "Minutos", "Segundos"] as const).map((label, index) => (
          <div className="countdown-unit" key={label}>
            <span className="countdown-number">{values[index]}</span>
            <span className="countdown-label">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PhotoBand({ src, alt, placement }: { src: string; alt: string; placement: string }) {
  return (
    <div className={cn("photo-band", placement)}>
      <img src={src} alt={alt} loading="lazy" />
    </div>
  );
}

function Invitation({ playing, onToggleMusic }: { playing: boolean; onToggleMusic: () => void }) {
  const reduceMotion = useReducedMotion();

  const fadeInUp = (delay: number) => ({
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduceMotion ? 0 : 0.8, delay: reduceMotion ? 0 : delay, ease: "easeOut" },
  });

  return (
    <motion.main
      className="invitation"
      initial={false}
      animate={{ opacity: 1 }}
      transition={{ duration: reduceMotion ? 0 : 0.4 }}
    >
      {/* 1. Bendición de las mamás (Hero principal) */}
      <section className="blessing-hero" aria-labelledby="blessing-title">
        <div className="blessing-hero-inner">
          <motion.div className="tiny-rule" aria-hidden="true" {...fadeInUp(0.2)} />
          <motion.h2 id="blessing-title" {...fadeInUp(0.5)}>
            Con la bendición de Dios y el amor de nuestras madres
          </motion.h2>
          <motion.div className="mothers" {...fadeInUp(1.0)}>
            <span>María Felicitas Cazares Alvarado</span>
            <span className="mothers-amp" aria-hidden="true">&amp;</span>
            <span>Maria Trinidad Castañon Hernandez</span>
          </motion.div>
        </div>
        <motion.a 
          className="scroll-cue" 
          href="#inicio" 
          aria-label="Ir a la siguiente sección"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reduceMotion ? 0 : 0.6, delay: reduceMotion ? 0 : 1.6 }}
        >
          <span>Desliza para descubrir</span>
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
            <path d="M12 3v17m-6-6 6 6 6-6" stroke="currentColor" strokeWidth="1.3" />
          </svg>
        </motion.a>
      </section>

      {/* 2. Hero (nombres de los novios) */}
      <section className="open-hero" id="inicio" aria-labelledby="open-title">
        <img
          className="open-hero-image"
          src="/imgs/1.webp"
          alt="Patricia y Fernando tomados de la mano"
          fetchPriority="high"
        />
        <div className="open-hero-shade" aria-hidden="true" />
        <div className="open-hero-content">
          <p className="open-hero-intro">Nos casamos</p>
          <h1 id="open-title">Patricia <span>&amp;</span> Fernando</h1>
          <p className="open-hero-date">23 de enero de 2027</p>
          {/* <span className="open-hero-rule" aria-hidden="true" />
          <p className="open-hero-venue">Hacienda la Victoria</p> */}
        </div>
            {/* <a className="scroll-cue" href="#historia" aria-label="Ir a nuestra historia">
              <span>Desliza para descubrir</span>
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
                <path d="M12 3v17m-6-6 6 6 6-6" stroke="currentColor" strokeWidth="1.3" />
              </svg>
            </a> */}
      </section>

      <button
        className={cn("floating-music", playing && "is-playing")}
        type="button"
        onClick={onToggleMusic}
        aria-label={playing ? "Pausar música" : "Reproducir música"}
        aria-pressed={playing}
      >
        <MusicIcon playing={playing} />
      </button>

      {/* 3. Historia (con fotos) */}
      <section className="paper-section story-opening" id="historia" aria-labelledby="story-title">
        <div className="tiny-rule" aria-hidden="true" />
        <h2 id="story-title">Nuestra historia</h2>
        <p className="story-lead">Hay encuentros que el tiempo nunca borra.</p>
        <p>{storyText.meeting}</p>
      </section>

      <PhotoBand
        src="/imgs/2.webp"
        alt="Patricia y Fernando compartiendo un beso"
        placement="photo-kiss"
      />

      <section className="paper-section journey-section" aria-labelledby="journey-title">
        <div className="tiny-rule" aria-hidden="true" />
        <h2 id="journey-title">Nuestros caminos</h2>
        <p>{storyText.paths}</p>
        <p>{storyText.growth}</p>
      </section>

      <PhotoBand
        src="/imgs/3.webp"
        alt="Patricia y Fernando mirándose con cariño"
        placement="photo-embrace"
      />

      <section className="paper-section promise-section" aria-labelledby="promise-title">
        <div className="tiny-rule" aria-hidden="true" />
        <h2 id="promise-title">Todo valió la pena</h2>
        <p>{storyText.promise}</p>
      </section>

      {/* 4. Cuenta regresiva */}
      <section className="date-section" aria-labelledby="date-title">
        <div className="date-paper">
          <h2 id="date-title">El gran día</h2>
          <div className="date-line" aria-label="Viernes 23 de enero de 2027">
            <span>Viernes</span>
            <strong>23</strong>
            <span>Enero · 2027</span>
          </div>
          <Countdown />
        </div>
      </section>

      {/* 5. Itinerario */}
      <section className="itinerary-section" aria-labelledby="itinerary-title">
        <div className="itinerary-inner">
          <div className="tiny-rule" aria-hidden="true" />
          <h2 id="itinerary-title">Itinerario</h2>
          <ol className="itinerary-list">
            {itinerary.map((event) => (
              <li className="itinerary-item" key={event.time}>
                <time className="itinerary-time" dateTime={event.time}>{event.displayTime}</time>
                <div className="itinerary-detail">
                  <span className="itinerary-icon"><ItineraryIcon kind={event.icon} /></span>
                  <h3>{event.title}</h3>
                  <p>{event.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 6. Ubicación */}
      <section className="venue-section" aria-labelledby="venue-title">
        <div className="tiny-rule" aria-hidden="true" />
        <h2 id="venue-title">¿Dónde nos vemos?</h2>
        <div className="venue-line" aria-hidden="true" />
        <p>Nos encantará celebrar contigo en</p>
        <h3>Hacienda la Victoria</h3>
        <div className="venue-map">
          <iframe
            src={venueMapUrl}
            title="Mapa de Hacienda la Victoria"
            width="600"
            height="450"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      </section>

      {/* 7. Código de vestimenta */}
      <section className="dress-section" aria-labelledby="dress-title">
        <div className="dress-paper">
          <div className="tiny-rule" aria-hidden="true" />
          <h2 id="dress-title">Código de vestimenta</h2>
          <p>Te pedimos no usar estos colores</p>
          <div className="reserved-colors">
            <span className="reserved-color">
              <span className="color-swatch coffee" aria-hidden="true" />
              <span className="reserved-color-label">Café</span>
            </span>
            <span className="reserved-color">
              <span className="color-swatch blue" aria-hidden="true" />
              <span className="reserved-color-label">Azul</span>
            </span>
          </div>
        </div>
      </section>

      {/* 8. Footer (sin sección RSVP) */}
      <footer className="site-footer">
        <div className="footer-ornament" aria-hidden="true"><span>&amp;</span></div>
        <p>Gracias por ser parte de nuestra historia</p>
        <strong>Patricia <span>&amp;</span> Fernando</strong>
        <small>23 · 01 · 2027</small>
        <small className="footer-credit">
          Invitación elaborada por <a href="https://www.godevix-studios.com/">Godevix Studios</a>
        </small>
      </footer>

      {playing && (
        <iframe
          className="music-embed"
          src={`https://www.youtube.com/embed/${songId}?autoplay=1&loop=1&playlist=${songId}&controls=0&playsinline=1`}
          title="Música de la invitación"
          allow="autoplay; encrypted-media"
          referrerPolicy="strict-origin-when-cross-origin"
          tabIndex={-1}
        />
      )}
    </motion.main>
  );
}

export default function Home() {
  const [opened, setOpened] = useState(false);
  const [playing, setPlaying] = useState(false);

  function openInvitation() {
    setOpened(true);
    setPlaying(true);
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {opened ? (
        <Invitation
          key="invitation"
          playing={playing}
          onToggleMusic={() => setPlaying((value) => !value)}
        />
      ) : (
        <Intro key="welcome" onOpen={openInvitation} />
      )}
    </AnimatePresence>
  );
}
