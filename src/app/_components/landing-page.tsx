import Image from "next/image";

const heroImage = "/assets/hero.webp";
const logoImage = "/assets/logo.webp";
const marielaImage = "/assets/mariela-yanez.webp";
const signatureImage = "/assets/firma.webp";
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
    <main className="font-[var(--font-source-sans)] text-[#3a3a3a]">
      {!hideHeader && (
      <header className="border-b border-black/5 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Image src={logoImage} alt="Mi Psiquiatra" width={56} height={56} className="h-14 w-14 object-contain" />
            <div>
              <p className="site-title text-[#2f2f2f]">Mi Psiquiatra</p>
              <p className="site-description tracking-wide text-[#8b8b8b]">
                Psiquiatría Clínica para Adultos
              </p>
            </div>
          </div>
          <nav className="hidden items-center gap-8 text-sm uppercase tracking-[0.25em] text-[#b87333] md:flex">
            <a href="#quiensoy" className="hover:text-[#39cec9]">
              Quién soy
            </a>
            <a href="#testimonios" className="hover:text-[#39cec9]">
              Testimonios
            </a>
            <a href="#servicios" className="hover:text-[#39cec9]">
              Servicios
            </a>
          </nav>
          <details className="md:hidden">
            <summary className="cursor-pointer text-sm font-semibold text-[#39cec9]">Menú</summary>
            <div className="absolute right-6 top-16 w-52 rounded-2xl border border-[#f0e4d6] bg-white p-4 text-sm shadow-xl">
              <a className="block py-2 text-[#b87333]" href="#quiensoy">
                Quién soy
              </a>
              <a className="block py-2 text-[#b87333]" href="#testimonios">
                Testimonios
              </a>
              <a className="block py-2 text-[#b87333]" href="#servicios">
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
          <h1 className="mt-6 font-[var(--font-playfair)] text-[5rem] leading-[1.1]">{heroTitle}</h1>
          <p className="mx-auto mt-4 max-w-3xl text-lg uppercase tracking-[0.2em] text-white/90">
            ATENCIÓN PSIQUIÁTRICA PARA PERSONAS ADULTAS, VÍA TELEMEDICINA.
          </p>
          <div className="mt-10">
            <a
              href="https://www.mipsiquiatra.cl/primera-cita/"
              className="inline-flex items-center rounded-full bg-[#39cec9] px-10 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-black shadow-lg transition hover:translate-y-0.5"
            >
              Agendar una Cita
            </a>
          </div>
        </div>
      </section>

      <section id="quiensoy" className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center" style={{ fontSize: "4rem" }}>
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
            />
          </div>
          <div className="space-y-6 text-lg leading-relaxed text-[#4b4f58]">
            <h3 className="font-[var(--font-playfair)] text-3xl text-[#2f2f2f]">
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

      <section id="testimonios" className="bg-[#f9fafb] py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center" style={{ fontSize: "4rem" }}>
            Testimonios
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-[#4b4f58]">
            Siempre busco que los pacientes se sientan cómodos para contarme sus experiencias 
            y dificultades emocionales, en un espacio profesional y respetuoso.
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {testimonials.map((item) => (
              <div key={item.name} className="rounded-3xl border border-[#f0e4d6] bg-white p-6">
                <p className="text-sm text-[#4b4f58]">"{item.quote}"</p>
                <p className="mt-4 text-xs uppercase tracking-[0.25em] text-[#b87333]">★★★★★</p>
                <p className="mt-3 font-semibold text-[#2f2f2f]">{item.name}</p>
              </div>
            ))}
          </div>
          <div className="mx-auto mt-8 flex max-w-3xl items-center justify-center gap-2 rounded-3xl border border-[#c7dbf5] bg-[#e7f0fb] p-4 text-center text-sm text-[#2a4f8c]">
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

      <section id="servicios" className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center" style={{ fontSize: "4rem" }}>
            Mis servicios
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-[#4b4f58]">
            Mi experiencia laboral y estudios se orientan a la atención de personas adultas con dificultades como:
          </p>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {services.map((column, index) => (
              <div key={`service-col-${index}`} className="rounded-3xl border border-[#f0e4d6] bg-[#fffdf9] p-6">
                <ul className="space-y-3 text-base text-[#4b4f58]">
                  {column.map((item) => (
                    <li key={item} className="border-b border-[#f4ece2] pb-2 last:border-none">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="como-trabajare" className="bg-[#f9fafb] py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center" style={{ fontSize: "4rem" }}>
            ¿Cómo trabajaré contigo?
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-center text-lg text-[#4b4f58]">
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
              className="rounded-3xl object-cover"
            />
            <div className="space-y-8">
              <div className="rounded-3xl border border-[#f0e4d6] bg-white p-6">
                <p className="step-number">1.</p>
                <h3 className="mt-4 font-[var(--font-playfair)] text-2xl text-[#2f2f2f]">
                  Primera Cita
                </h3>
                <p className="mt-4 text-[#4b4f58]">
                  Aquí me interesa conocerte y que conformemos una alianza de trabajo para encontrar
                  qué te aqueja y construir un diagnóstico inicial. Aunque muchas veces no es posible un
                  diagnóstico definitivo en la primera cita, sí me permitirá proponerte un plan de
                  atención y seguimiento clínico acorde a tu situación.
                </p>
              </div>
              <div className="rounded-3xl border border-[#f0e4d6] bg-white p-6">
                <p className="step-number">2.</p>
                <h3 className="mt-4 font-[var(--font-playfair)] text-2xl text-[#2f2f2f]">
                  Control psiquiátrico
                </h3>
                <p className="mt-4 text-[#4b4f58]">
                  Se trata de las evaluaciones que siguen a la primera cita. Su objetivo es realizar seguimiento clínico, afinar diagnósticos y ajustar el plan de atención cuando corresponda. En
                  esta etapa busco tener una mirada crítica y flexible para adaptarme a tus necesidades.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="donde" className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center" style={{ fontSize: "4rem" }}>
            ¿Dónde nos reuniremos?
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-center text-lg text-[#4b4f58]">
            Actualmente todas las atenciones serán por telemedicina. Nuestras reuniones se realizan 
            por videollamada, principalmente a través de Zoom, según preferencia del paciente.
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {placeImages.map((src, index) => (
              <Image
                key={src}
                src={src}
                alt={`Lugar ${index + 1}`}
                width={427}
                height={427}
                className="rounded-3xl object-cover"
              />
            ))}
          </div>
        </div>
      </section>

      <section id="como-comenzar" className="bg-[#f9fafb] py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center" style={{ fontSize: "4rem" }}>
            ¿Cómo comenzar el proceso de atención?
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
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
            ].map((item) => (
              <div key={item.step} className="rounded-3xl border border-[#f0e4d6] bg-white p-6">
                <p className="step-number">{item.step}.</p>
                <h3 className="mt-4 font-[var(--font-playfair)] text-2xl text-[#2f2f2f]">
                  {item.title}
                </h3>
                <p className="mt-4 text-[#4b4f58]">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="precios" className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center" style={{ fontSize: "4rem" }}>
            ¿Cuánto cuesta mi consulta?
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-[#f0e4d6] bg-[#fffdf9] p-8 text-center">
              <p className="price-number">$85.000</p>
              <p className="mt-2 text-[#4b4f58]">Primera Cita</p>
            </div>
            <div className="rounded-3xl border border-[#f0e4d6] bg-[#fffdf9] p-8 text-center">
              <p className="price-number">$65.000</p>
              <p className="mt-2 text-[#4b4f58]">Controles posteriores</p>
            </div>
          </div>
          <div className="mt-8 rounded-3xl border border-[#f0e4d6] bg-white p-6">
            <h4 className="font-[var(--font-playfair)] text-xl text-[#2f2f2f]">Reembolsos</h4>
            <p className="mt-2 text-sm text-[#4b4f58]">
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
          <h2 className="text-center" style={{ fontSize: "4rem" }}>
            ¿Quieres agendar una cita?
          </h2>
          <a
            href="https://www.mipsiquiatra.cl/primera-cita/"
            className="mt-8 inline-flex items-center gap-3 rounded-full bg-[#39cec9] px-8 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-black shadow-lg transition hover:translate-y-0.5"
          >
            Agendar una Cita
          </a>
        </div>
      </section>

      <footer className="bg-[#2f2f2f] py-10 text-center text-sm leading-relaxed text-white/80">
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
    </main>
  );
}
