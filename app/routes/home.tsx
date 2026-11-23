import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { Route } from "./+types/home";
import { cn } from "../lib/cn";

const songId = "0OGCsECyIt8";

const storyText = {
  meeting: "Hace catorce años nos vimos por primera vez en la universidad. No hacía falta decir mucho: desde ese momento ambos sabíamos que había algo ahí, una atracción distinta, difícil de ignorar.",
  paths: "El tiempo nos pidió caminar por separado. Cada uno tenía que recorrer su propio camino, tomar decisiones, equivocarse y aprender. Cometer nuestros propios errores era necesario para madurar.",
  growth: "Cada caída nos enseñó algo. Cada etapa nos fue moldeando hasta convertirnos en las personas que hoy somos… listos para entender, cuidar y ser lo mejor el uno para el otro.",
};

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Patricia y Fernando | Nuestra boda" },
    {
      name: "description",
      content: "Patricia y Fernando se casan el 22 de enero de 2027 en Hacienda la Victoria. Nos encantará compartir este día contigo.",
    },
    { property: "og:title", content: "Patricia y Fernando | Nuestra boda" },
    { property: "og:description", content: "22 de enero de 2027 · Hacienda la Victoria" },
    { property: "og:image", content: "/imgs/3.jpeg" },
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

function Intro({ onOpen }: { onOpen: () => void }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.main
      className="intro-screen"
      initial={false}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.4 }}
    >
      <div className="intro-photo" aria-hidden="true" />
      <div className="intro-shade" aria-hidden="true" />
      <div className="intro-frame" aria-hidden="true" />
      <div className="intro-topline">
        <span>P &amp; F</span>
        <span>22.01.2027</span>
      </div>
      <div className="intro-content">
        <p className="intro-invitation">Tenemos algo muy especial que compartir contigo</p>
        <h1>
          Patricia <span>&amp;</span> Fernando
        </h1>
        <p className="intro-date">22 de enero de 2027</p>
        <button className={cn("primary-button", "intro-button")} type="button" onClick={onOpen}>
          Ver invitación <ArrowIcon />
        </button>
      </div>
      <p className="intro-bottomline">Una historia que comienza de nuevo</p>
    </motion.main>
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

  return (
    <motion.main
      className="invitation"
      initial={false}
      animate={{ opacity: 1 }}
      transition={{ duration: reduceMotion ? 0 : 0.4 }}
    >
      <section className="open-hero" id="inicio" aria-labelledby="open-title">
        <img
          className="open-hero-image"
          src="/imgs/1.jpeg"
          alt="Patricia y Fernando tomados de la mano"
          fetchPriority="high"
        />
        <div className="open-hero-shade" aria-hidden="true" />
        <div className="open-hero-content">
          <p className="open-hero-intro">Nos casamos</p>
          <h1 id="open-title">Patricia <span>&amp;</span> Fernando</h1>
          <p className="open-hero-date">22 de enero de 2027</p>
          <span className="open-hero-rule" aria-hidden="true" />
          <p className="open-hero-venue">Hacienda la Victoria</p>
        </div>
        <a className="scroll-cue" href="#historia" aria-label="Ir a nuestra historia">
          <span>Desliza para descubrir</span>
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
            <path d="M12 3v17m-6-6 6 6 6-6" stroke="currentColor" strokeWidth="1.3" />
          </svg>
        </a>
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

      <section className="paper-section story-opening" id="historia" aria-labelledby="story-title">
        <div className="tiny-rule" aria-hidden="true" />
        <h2 id="story-title">Nuestra historia</h2>
        <p className="story-lead">Hay encuentros que el tiempo nunca borra.</p>
        <p>{storyText.meeting}</p>
      </section>

      <PhotoBand
        src="/imgs/2.jpeg"
        alt="Patricia y Fernando compartiendo un beso"
        placement="photo-kiss"
      />

      <section className="paper-section journey-section" aria-labelledby="journey-title">
        <div className="tiny-rule" aria-hidden="true" />
        <h2 id="journey-title">Nuestros caminos</h2>
        <p>{storyText.paths}</p>
        <p>{storyText.growth}</p>
      </section>

      <section className="date-section" aria-labelledby="date-title">
        <div className="date-paper">
          <h2 id="date-title">El gran día</h2>
          <p>El día en que empezamos una nueva historia</p>
          <div className="date-line" aria-label="Viernes 22 de enero de 2027">
            <span>Viernes</span>
            <strong>22</strong>
            <span>Enero · 2027</span>
          </div>
          <p className="date-closing">para elegirnos cada día</p>
        </div>
      </section>

      <PhotoBand
        src="/imgs/3.jpeg"
        alt="Patricia y Fernando mirándose con cariño"
        placement="photo-embrace"
      />

      <section className="paper-section promise-section" aria-labelledby="promise-title">
        <div className="tiny-rule" aria-hidden="true" />
        <h2 id="promise-title">Todo valió la pena</h2>
        <p>
          Catorce años después, entendemos que todo valió la pena. Ese día por fin llegó… y hoy
          empezamos una nueva historia en la que vamos a elegirnos cada día.
        </p>
        <p className="promise-last">¡Nos casamos!</p>
      </section>

      <section className="blessing-section" aria-labelledby="blessing-title">
        <div className="blessing-inner">
          <div className="tiny-rule" aria-hidden="true" />
          <h2 id="blessing-title">Con la bendición de Dios</h2>
          <p>y el amor de nuestras madres</p>
          <div className="mothers">
            <span>María Felicitas Cazares Alvarado</span>
            <span className="mothers-amp" aria-hidden="true">&amp;</span>
            <span>Maria Trinidad Castañon Hernandez</span>
          </div>
        </div>
      </section>

      <section className="venue-section" aria-labelledby="venue-title">
        <div className="tiny-rule" aria-hidden="true" />
        <h2 id="venue-title">Dónde nos vemos</h2>
        <div className="venue-line" aria-hidden="true" />
        <p>Nos encantará celebrar contigo en</p>
        <h3>Hacienda la Victoria</h3>
        <span>Viernes, 22 de enero de 2027</span>
      </section>

      <section className="dress-section" aria-labelledby="dress-title">
        <div className="dress-paper">
          <div className="tiny-rule" aria-hidden="true" />
          <h2 id="dress-title">Código de vestimenta</h2>
          <p>Reservamos los tonos café y azul para la familia y el cortejo.</p>
          <div className="reserved-colors" aria-label="Tonos reservados: café y azul">
            <span className="color-swatch coffee" />
            <span className="color-swatch blue" />
          </div>
        </div>
      </section>

      <section className="rsvp-section" aria-labelledby="rsvp-title">
        <div className="tiny-rule" aria-hidden="true" />
        <h2 id="rsvp-title">¿Nos acompañas?</h2>
        <p>Confírmanos si podremos compartir contigo este día tan especial.</p>
        <button className="rsvp-button" type="button" disabled>
          Confirmar asistencia <ArrowIcon diagonal />
        </button>
      </section>

      <footer className="site-footer">
        <div className="footer-ornament" aria-hidden="true"><span>&amp;</span></div>
        <p>Gracias por ser parte de nuestra historia</p>
        <strong>Patricia <span>&amp;</span> Fernando</strong>
        <small>22 · 01 · 2027</small>
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
