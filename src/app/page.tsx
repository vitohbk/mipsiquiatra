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
    name: "Sebastián Perry",
  },
  {
    quote:
      "Como profesional es excelente con sus consejos, sus tratamientos y las tareas que me ha asignado, ha cambiado mi vida.",
    name: "Graciela Sánchez",
  },
  {
    quote:
      "La experiencia de atención es muy buena. He estado con psiquiatras antes y sólo se enfocaban en la entrega de medicamentos.",
    name: "Suely López",
  },
  {
    quote:
      "Por primera vez fui escuchada, comprendida y acogida. Gracias a su atención, logré estar bien y sentirme yo de nuevo.",
    name: "Arelis Vidal",
  },
  {
    quote:
      "Íntegra, empática, acogedora y preocupada por el avance del paciente. Genera las condiciones para sentirse cómoda.",
    name: "Maritza Santibáñez",
  },
  {
    quote:
      "Me he atendido por unos 4 meses. Primera vez que me siento tan escuchada y comprendida con un profesional de salud mental.",
    name: "Marilyn Fernández",
  },
];

export default function Home() {
  return (
    <main className="font-[var(--font-source-sans)] text-[#3a3a3a]">
      <header className="sticky top-0 z-50 border-b border-black/5 bg-white/90 backdrop-blur">
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

      <section
        className="relative flex min-h-[80vh] items-center overflow-hidden text-center"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.35)), url(${heroImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="mx-auto max-w-6xl px-6 py-20 text-white">
          <p className="text-lg uppercase tracking-[0.35em] text-white/80">
            Caminos Difíciles, llevan a Lugares Hermosos
          </p>
          <h1 className="mt-6 font-[var(--font-playfair)] text-[5rem] leading-[1.1]">
            ¿Necesitas un Psiquiatra?
          </h1>
          <div className="mt-10">
            <a
              href="https://www.mipsiquiatra.cl/primera-cita/"
              className="inline-flex items-center rounded-full bg-[#39cec9] px-10 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-black shadow-lg transition hover:translate-y-0.5"
            >
              Agendar una hora
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
            <p>
              Soy <strong>Médico Cirujano</strong> de la Universidad de Chile y Especialista en{" "}
              <strong>Psiquiatría de Adultos</strong> de la Universidad de Santiago de Chile. Me he
              dedicado a subespecializarme en trauma, siendo actualmente <strong>Terapeuta EMDR</strong>.
            </p>
            <p>
              Escogí ser Psiquiatra porque considero a la mente un mundo fascinante y si logras
              mantenerte saludable mental y emocionalmente, tu vida puede cambiar de manera maravillosa.
            </p>
            <p>
              Por eso estoy convencida de que si quieres lograr un bienestar pleno debes poner tu salud
              mental en primer lugar. Es el primer eslabón para conseguir sentirte feliz.
            </p>
            <p>
              En mi consulta, quiero que mis pacientes se sientan cómodos para abrirme su mundo
              emocional y así encontremos las respuestas o soluciones que necesitan para sentirse plenos.
            </p>
            <p>El camino puede ser difícil, pero podemos llegar a un lugar mejor.</p>
            <Image src={signatureImage} alt="Firma" width={250} height={106} className="h-20 w-auto" />
          </div>
        </div>
      </section>

      <section id="testimonios" className="bg-[#f9fafb] py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center" style={{ fontSize: "4rem" }}>
            Testimonios
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-[#4b4f58]">
            Siempre busco que los pacientes logren sentirse cómodos para contarme sus dolencias
            emocionales y, así, poder contribuir a aliviarlos.
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
          <a
            href="#testimonios"
            className="mt-10 inline-flex items-center text-sm uppercase tracking-[0.25em] text-[#b87333] hover:text-[#39cec9]"
          >
            Ver más testimonios
          </a>
        </div>
      </section>

      <section id="servicios" className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center" style={{ fontSize: "4rem" }}>
            Mis servicios
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-[#4b4f58]">
            Mi experiencia laboral y estudios me permiten ayudarte con los siguientes problemas.
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

      <section className="bg-[#f9fafb] py-20">
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
                  Primera entrevista
                </h3>
                <p className="mt-4 text-[#4b4f58]">
                  Aquí me interesa conocerte y que conformemos una alianza de trabajo para encontrar
                  qué te aqueja y construir un diagnóstico inicial. Aunque muchas veces no es posible un
                  diagnóstico definitivo en la primera entrevista, sí me permitirá proponerte un plan de
                  acción para aliviar tus síntomas.
                </p>
              </div>
              <div className="rounded-3xl border border-[#f0e4d6] bg-white p-6">
                <p className="step-number">2.</p>
                <h3 className="mt-4 font-[var(--font-playfair)] text-2xl text-[#2f2f2f]">
                  Control psiquiátrico
                </h3>
                <p className="mt-4 text-[#4b4f58]">
                  Se trata de las evaluaciones que siguen a la primera entrevista. Su objetivo es
                  observar tu evolución, afinar diagnósticos y medir la respuesta al tratamiento. En
                  esta etapa busco tener una mirada crítica y flexible para adaptarme a tus necesidades.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center" style={{ fontSize: "4rem" }}>
            ¿Dónde nos reuniremos?
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-center text-lg text-[#4b4f58]">
            Actualmente todas las atenciones serán por telemedicina. Nuestras reuniones serán a través
            de Zoom o una videollamada de WhatsApp, según preferencia del paciente.
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

      <section className="bg-[#f9fafb] py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center" style={{ fontSize: "4rem" }}>
            ¿Cómo comenzar a sanar?
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              {
                step: "1",
                title: "Decide hacer un cambio",
                text: "Toma la decisión de comenzar un tratamiento. Caminos difíciles llevan a lugares hermosos.",
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

      <section className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center" style={{ fontSize: "4rem" }}>
            ¿Cuánto cuesta mi consulta?
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-[#f0e4d6] bg-[#fffdf9] p-8 text-center">
              <p className="price-number">$85.000</p>
              <p className="mt-2 text-[#4b4f58]">Primera entrevista</p>
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
        className="relative flex min-h-[50vh] items-center justify-center"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.35)), url(${heroImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="text-center text-white">
          <h2 className="text-center" style={{ fontSize: "4rem" }}>
            ¿Ya quieres comenzar?
          </h2>
          <a
            href="https://www.mipsiquiatra.cl/primera-cita/"
            className="mt-8 inline-flex items-center gap-3 rounded-full bg-[#39cec9] px-8 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-black shadow-lg transition hover:translate-y-0.5"
          >
            Agendar una hora
          </a>
        </div>
      </section>

      <footer className="bg-white py-10 text-center text-xs uppercase tracking-[0.3em] text-[#b87333]">
        Mi Psiquiatra · Servicios de Psiquiatría Clínica
      </footer>
    </main>
  );
}
