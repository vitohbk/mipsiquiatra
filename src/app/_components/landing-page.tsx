import Image from "next/image";
import { RevealAnimations } from "./reveal-animations";

const heroImage = "/assets/hero.webp";
const logoImage = "/assets/logo.webp";
const marielaImage = "/assets/mariela-yanez.webp";
const methodImage = "/assets/metodo.webp";
const placeImages = [
  "/assets/telemedicina-1.webp",
  "/assets/telemedicina-2.webp",
  "/assets/telemedicina-3.webp",
];
const isapreLogos = [
  {
    src: "/assets/isapre-masvida.webp",
    alt: "Isapre Nueva Masvida",
  },
  {
    src: "/assets/isapre-colmena.webp",
    alt: "Isapre Colmena",
  },
  {
    src: "/assets/isapre-vidatres.webp",
    alt: "Isapre VidaTres",
  },
  {
    src: "/assets/isapre-banmedica.webp",
    alt: "Isapre Banmedica",
  },
  {
    src: "/assets/isapre-consalud.webp",
    alt: "Isapre Consalud",
  },
  {
    src: "/assets/isapre-cruzblanca.webp",
    alt: "Isapre CruzBlanca",
  },
];
const services = [
  [
    "Trastornos del Sueño",
    "Trastorno de Ansiedad",
    "Trastorno de Pánico",
    "Fobias",
    "Estrés agudo",
    "Estrés postraumático",
    "Depresión",
  ],
  [
    "Trastorno Bipolar",
    "Trastornos Adaptativos",
    "Duelos",
    "Trastornos de la Personalidad",
    "Traumas",
    "Esquizofrenia y otras Psicosis",
    "Descontrol de Impulsos",
  ],
  [
    "Trastornos postparto",
    "Agresividad",
    "Trastornos de la Alimentación",
    "Trastorno Obsesivo Compulsivo",
    "Distimia",
    "Ludopatía",
    "Evaluaciones para informes",
  ],
];
const testimonials = [
  {
    quote:
      "La Dra. Yañez es una muy buena profesional, empática, y maneja muy bien los conocimientos de su área de psiquiatría.",
    name: "S. P. (anonimizado)",
  },
  {
    quote:
      "Como profesional es excelente con sus consejos, su orientación y las tareas que me ha asignado. Me sentí escuchada y acompañada durante la consulta.",
    name: "G. S. (anonimizado)",
  },
  {
    quote:
      "La experiencia de atención es muy buena. He estado con psiquiatras antes y sólo se enfocaban en la entrega de medicamentos.",
    name: "S. L. (anonimizado)",
  },
  {
    quote:
      "Por primera vez fui escuchada, comprendida y acogida. Fue un espacio profesional donde pude hablar con confianza.",
    name: "A. V. (anonimizado)",
  },
  {
    quote:
      "Íntegra, empática y acogedora. Genera un espacio profesional y respetuoso. Genera las condiciones para sentirse cómoda.",
    name: "M. S. (anonimizado)",
  },
  {
    quote:
      "Primera vez que me siento tan escuchada y comprendida con un profesional de salud mental.",
    name: "M. F. (anonimizado)",
  },
];

type LandingPageProps = {
  heroTitle: string;
  hideHeader?: boolean;
};

export default function LandingPage({ heroTitle, hideHeader = false }: LandingPageProps) {
  return (
    <main className="font-[var(--font-source-sans)] text-[var(--brand-body)]">
      {!hideHeader && (
      <header className="sticky top-0 z-10 border-b border-black/5 bg-white/90 backdrop-blur">
        <div className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Image src={logoImage} alt="Mi Psiquiatra" width={56} height={56} className="h-14 w-14 object-contain" />
            <div>
              <p className="site-title text-[var(--brand-ink)]">Mi Psiquiatra</p>
              <p className="site-description tracking-wide text-[var(--brand-muted)]">
                Psiquiatría Clínica para Adultos
              </p>
            </div>
          </div>
          <nav className="hidden items-center gap-8 text-sm uppercase tracking-[0.25em] text-[var(--copper-dark)] md:flex">
            <a href="#quiensoy" className="transition-colors duration-150 hover:text-[var(--teal-600)]">
              Quién soy
            </a>
            <a href="#testimonios" className="transition-colors duration-150 hover:text-[var(--teal-600)]">
              Testimonios
            </a>
            <a href="#servicios" className="transition-colors duration-150 hover:text-[var(--teal-600)]">
              Servicios
            </a>
          </nav>
          <details className="md:hidden">
            <summary aria-label="Abrir menú de navegación" className="cursor-pointer text-sm font-semibold text-[var(--teal-600)]">Menú</summary>
            <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl border border-[var(--brand-border)] bg-white p-4 text-sm shadow-xl">
              <a className="block py-3.5 text-[var(--copper-dark)] transition-colors duration-150 hover:text-[var(--teal-600)]" href="#quiensoy">
                Quién soy
              </a>
              <a className="block py-3.5 text-[var(--copper-dark)] transition-colors duration-150 hover:text-[var(--teal-600)]" href="#testimonios">
                Testimonios
              </a>
              <a className="block py-3.5 text-[var(--copper-dark)] transition-colors duration-150 hover:text-[var(--teal-600)]" href="#servicios">
                Servicios
              </a>
            </div>
          </details>
        </div>
      </header>
      )}

      <section
        id="hero"
        className="relative flex min-h-screen items-center overflow-hidden text-center"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.35)), url(${heroImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="mx-auto max-w-6xl px-6 py-20 text-white">
          <h1 className="mt-6 heading-hero hero-animate" data-delay="1">{heroTitle}</h1>
          <p className="mx-auto mt-4 max-w-3xl text-lg uppercase tracking-[0.1em] text-white/90 md:tracking-[0.2em] hero-animate" data-delay="2">
            ATENCIÓN PSIQUIÁTRICA PARA PERSONAS ADULTAS, VÍA TELEMEDICINA.
          </p>
          <div className="mt-10 hero-animate" data-delay="3">
            <a
              href="https://www.mipsiquiatra.cl/primera-cita/"
              className="inline-flex items-center rounded-full bg-[var(--brand-teal)] px-10 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-white shadow-lg transition hover:-translate-y-1 hover:opacity-90"
            >
              Agendar una Cita
            </a>
          </div>
        </div>
      </section>

      <section id="quiensoy" className="bg-white py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="heading-section text-center">
            ¿Quién soy?
          </h2>
        </div>
        <div className="mx-auto mt-12 grid max-w-6xl gap-12 px-6 md:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            <Image
              src={marielaImage}
              alt="Mariela Yañez"
              width={686}
              height={914}
              className="mt-6 rounded-3xl object-cover"
              data-reveal="scale"
            />
          </div>
          <div className="space-y-6 text-base leading-relaxed text-[var(--brand-body)] md:text-lg" data-reveal="" data-delay="1">
            <h3 className="font-[var(--font-vollkorn)] text-3xl text-[var(--brand-ink)]">
              Mi nombre es Mariela Yañez
            </h3>
              <p><strong>Soy médico cirujano de la Universidad de Chile y psiquiatra de adultos de la Universidad de Santiago, terapeuta EMDR y más de 10 años de experiencia.</strong></p>
              <p>Entiendo la consulta psiquiátrica como un espacio de escucha, evaluación y acompañamiento profesional, en el que es posible conversar con tranquilidad sobre las dificultades que motivan la consulta.</p>
              <p>La atención se construye de manera individual, respetando los tiempos y necesidades de cada persona, y considerando un abordaje clínico acorde a su situación particular.</p>
              <p>El objetivo de este espacio es ofrecer orientación y seguimiento en un marco de cuidado, respeto y confidencialidad.</p>
              <p><em>Si estás buscando orientación profesional en salud mental, puedes agendar una consulta</em></p>
          </div>
        </div>
      </section>

      <section id="testimonios" className="bg-[var(--teal-100)] py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="heading-section text-center">
            Testimonios
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-[var(--brand-body)]">
            Siempre busco que los pacientes se sientan cómodos para contarme sus experiencias
            y dificultades emocionales, en un espacio profesional y respetuoso.
          </p>
          <div className="mt-12 columns-1 gap-12 md:columns-2">
            {testimonials.map((item, i) => (
              <div key={item.name} className="mb-8 break-inside-avoid border-b border-[var(--brand-border)] pb-8 last:border-b-0 last:pb-0" data-reveal="" data-delay={String(i + 1)}>
                <p className="text-xs uppercase tracking-[0.25em] text-[var(--copper-dark)]">★★★★★</p>
                <p className="mt-3 text-base leading-relaxed text-[var(--brand-body)]">&quot;{item.quote}&quot;</p>
                <p className="mt-3 text-sm font-semibold text-[var(--brand-ink)]">{item.name}</p>
              </div>
            ))}
          </div>
          <div className="mx-auto mt-8 flex max-w-3xl items-center justify-center gap-2 rounded-3xl border border-[var(--teal-200)] bg-[var(--teal-200)] p-4 text-center text-sm text-[var(--teal-800)]">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M12 10.5v6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <circle cx="12" cy="7.5" r="1" fill="currentColor" />
            </svg>
            <span>
              Los resultados varían caso a caso y dependen principalmente del involucramiento del paciente en su proceso.
            </span>
          </div>
        </div>
      </section>

      <section id="servicios" className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="heading-section text-center">
            Mis servicios
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-[var(--brand-body)]">
            Mi experiencia laboral y estudios se orientan a la atención de personas adultas con dificultades como:
          </p>
          <ul className="mt-10 columns-1 gap-x-12 text-base text-[var(--brand-body)] md:columns-2 lg:columns-3">
            {services.flat().map((item) => (
              <li key={item} className="break-inside-avoid border-b border-[var(--brand-border)] py-3">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="como-trabajare" className="bg-white py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="heading-section text-center">
            ¿Cómo trabajaré contigo?
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-center text-lg text-[var(--brand-body)]">
            A diferencia de otras enfermedades, las enfermedades de la mente no se pueden identificar
            con un examen de laboratorio ni de imagen. La principal herramienta para diagnosticarlas es
            a través de la anamnesis o entrevista clínica, pero también se utiliza la observación
            clínica, pruebas psicológicas y/o cognitivas en algunos casos.
          </p>
          <div className="mt-12 grid gap-10 md:grid-cols-[0.9fr_1.1fr]">
            <Image
              src={methodImage}
              alt="Psiquiatra adultos"
              width={686}
              height={915}
              className="max-h-[420px] w-full rounded-3xl object-cover md:max-h-none"
            />
            <div className="space-y-8">
              <div className="rounded-3xl border border-[var(--brand-border)] bg-white p-6">
                <p className="step-number">1.</p>
                <h3 className="mt-4 font-[var(--font-vollkorn)] text-2xl text-[var(--brand-ink)]">
                  Primera Cita
                </h3>
                <p className="mt-4 text-[var(--brand-body)]">
                  Aquí me interesa conocerte y que conformemos una alianza de trabajo para encontrar
                  qué te aqueja y construir un diagnóstico inicial. Aunque muchas veces no es posible un
                  diagnóstico definitivo en la primera cita, sí me permitirá proponerte un plan de
                  atención y seguimiento clínico acorde a tu situación.
                </p>
              </div>
              <div className="rounded-3xl border border-[var(--brand-border)] bg-white p-6">
                <p className="step-number">2.</p>
                <h3 className="mt-4 font-[var(--font-vollkorn)] text-2xl text-[var(--brand-ink)]">
                  Control psiquiátrico
                </h3>
                <p className="mt-4 text-[var(--brand-body)]">
                  Se trata de las evaluaciones que siguen a la primera cita. Su objetivo es realizar seguimiento clínico, afinar diagnósticos y ajustar el plan de atención cuando corresponda. En
                  esta etapa busco tener una mirada crítica y flexible para adaptarme a tus necesidades.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="donde" className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="heading-section text-center">
            ¿Dónde nos reuniremos?
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-center text-lg text-[var(--brand-body)]">
            Actualmente todas las atenciones serán por telemedicina. Nuestras reuniones se realizan 
            por videollamada, principalmente a través de Zoom, según preferencia del paciente.
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {placeImages.map((src, index) => (
              <Image
                key={src}
                src={src}
                alt={["Consulta de telemedicina", "Entorno de videollamada médica", "Espacio de atención en línea"][index]}
                width={427}
                height={427}
                className={`rounded-3xl object-cover${index > 0 ? " hidden md:block" : ""}`}
              />
            ))}
          </div>
        </div>
      </section>

      <section id="como-comenzar" className="bg-[var(--teal-100)] py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="heading-section text-center">
            ¿Cómo comenzar el proceso de atención?
          </h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              {
                step: "1",
                title: "Decide hacer un cambio",
                text: "Toma la decisión de solicitar una consulta profesional.",
              },
              {
                step: "2",
                title: "Agenda tu hora",
                text: "Mi disponibilidad de horario está a tu disposición, completamente en línea con un sistema de recordatorios.",
              },
              {
                step: "3",
                title: "Paga tu consulta",
                text: "Paga tu consulta de forma previa 100% en línea. Todos los métodos de pago disponibles.",
              },
            ].map((item, i) => (
              <div key={item.step} className="rounded-3xl bg-white p-8" data-reveal="" data-delay={String(i + 1)}>
                <p className="step-number">{item.step}.</p>
                <h3 className="mt-4 font-[var(--font-vollkorn)] text-2xl text-[var(--brand-ink)]">
                  {item.title}
                </h3>
                <p className="mt-4 text-[var(--brand-body)]">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="precios" className="bg-white py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="heading-section text-center">
            ¿Cuánto cuesta mi consulta?
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl bg-[var(--teal-100)] p-10 text-center" data-reveal="">
              <p className="price-number">$85.000</p>
              <p className="mt-2 text-[var(--brand-body)]">Primera Cita</p>
            </div>
            <div className="rounded-3xl border border-[var(--brand-border)] bg-[var(--brand-paper)] p-10 text-center" data-reveal="" data-delay="1">
              <p className="price-number">$65.000</p>
              <p className="mt-2 text-[var(--brand-body)]">Controles posteriores</p>
            </div>
          </div>
          <div className="mt-8 rounded-3xl bg-[var(--teal-100)] p-6">
            <h4 className="font-[var(--font-vollkorn)] text-xl text-[var(--brand-ink)]">Reembolsos</h4>
            <p className="mt-2 text-sm text-[var(--brand-body)]">
              Isapre MasVida · Isapre Colmena · Isapre Consalud · Isapre Banmédica · Isapre VidaTres ·
              Isapre CruzBlanca
            </p>
            <div className="mt-6 grid grid-cols-2 gap-6 md:grid-cols-3">
              {isapreLogos.map((logo) => (
                <Image
                  key={logo.alt}
                  src={logo.src}
                  alt={logo.alt}
                  width={180}
                  height={70}
                  className="h-14 w-auto object-contain"
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id="cta"
        className="relative flex min-h-[50vh] items-center justify-center"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.35)), url(${heroImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="text-center text-white">
          <h2 className="heading-section text-center">
            ¿Quieres agendar una cita?
          </h2>
          <a
            href="https://www.mipsiquiatra.cl/primera-cita/"
            className="mt-8 inline-flex items-center gap-3 rounded-full bg-[var(--brand-teal)] px-8 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-white shadow-lg transition hover:-translate-y-1 hover:opacity-90"
          >
            Agendar una Cita
          </a>
        </div>
      </section>

      <footer className="bg-[#0d1c1d] pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-10 text-center text-sm leading-relaxed text-white/70">
        <p className="font-semibold text-white">Mi Psiquiatra</p>
        <p className="mt-2">Dra. Mariela Yañez · Médico cirujano · Psiquiatría clínica para adultos · Terapeuta EMDR</p>
        <p className="mt-1">Atención por telemedicina (videollamada) · Chile</p>
        <div className="mx-auto mt-6 max-w-xl rounded-lg bg-red-900/40 px-6 py-4">
          <p className="text-xs font-medium text-white">
            Este sitio no corresponde a un servicio de urgencias.
          </p>
          <p className="mt-1 text-xs text-white/80">
            Si estás en una situación de crisis, busca atención presencial inmediata en un servicio de urgencia.
            Puedes consultar información en{" "}
            <a
              href="https://psiquiatrico.cl/urgencias/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-white"
            >
              psiquiatrico.cl/urgencias
            </a>
          </p>
        </div>
      </footer>
      <RevealAnimations />
    </main>
  );
}
