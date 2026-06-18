import type { Metadata } from "next";

import LandingPage from "../../_components/landing-page";

type LandingCopy = {
  title: string;
  description: string;
  heroTitle: string;
  heroSubtitle: string;
};

const landingVariants: Record<string, LandingCopy> = {
  // Grupo: Psiquiatra Adultos
  "psiquiatra-adulto-online": {
    title: "Psiquiatra Adulto Online | Mi Psiquiatra",
    description: "Psiquiatra adulto online por videollamada en Chile. Agenda tu hora online.",
    heroTitle: "Psiquiatra Adulto Online",
    heroSubtitle: "Psiquiatría clínica para adultos vía videollamada. Atención disponible para todo Chile.",
  },
  "psiquiatra-de-adultos": {
    title: "Psiquiatra de Adultos | Mi Psiquiatra",
    description: "Psiquiatra de adultos por videollamada en Chile. Agenda tu hora online.",
    heroTitle: "¿Buscas un Psiquiatra de Adultos?",
    heroSubtitle: "Atención psiquiátrica especializada para personas adultas, a través de videollamada.",
  },
  // Grupo: Agendar Hora
  "agendar-hora-psiquiatra": {
    title: "Agendar hora de psiquiatra | Mi Psiquiatra",
    description: "Agendar hora de psiquiatra por videollamada en Chile. Agenda tu hora online.",
    heroTitle: "¿Buscas Agendar Hora de Psiquiatra?",
    heroSubtitle: "Agenda tu hora de psiquiatra de forma online. Disponibilidad actualizada en tiempo real.",
  },
  // Grupo: Videollamada Online
  "videollamada-psiquiatra-online": {
    title: "Videollamada con psiquiatra online | Mi Psiquiatra",
    description: "Videollamada con psiquiatra online en Chile. Agenda tu hora online.",
    heroTitle: "¿Buscas Videollamada con Psiquiatra Online?",
    heroSubtitle: "Consulta psiquiátrica por videollamada para personas adultas. Atención remota desde cualquier lugar de Chile.",
  },
  "psiquiatra-online": {
    title: "Psiquiatra Online | Mi Psiquiatra",
    description: "Psiquiatra online por videollamada en Chile. Consulta desde cualquier lugar.",
    heroTitle: "Psiquiatra Online",
    heroSubtitle: "Consulta psiquiátrica online para personas adultas en Chile. Atención por videollamada, sin necesidad de traslado.",
  },
  // Grupo: Sintomas
  "psiquiatra-ansiedad": {
    title: "Psiquiatra para Ansiedad | Mi Psiquiatra",
    description: "Psiquiatra para ansiedad por videollamada en Chile. Agenda tu consulta online.",
    heroTitle: "Psiquiatra para Ansiedad",
    heroSubtitle: "Evaluación y seguimiento clínico para trastornos de ansiedad en personas adultas, a través de videollamada.",
  },
  "psiquiatra-depresion": {
    title: "Psiquiatra para Depresión | Mi Psiquiatra",
    description: "Psiquiatra para depresión por videollamada en Chile. Agenda tu consulta online.",
    heroTitle: "Psiquiatra para Depresión",
    heroSubtitle: "Evaluación y seguimiento clínico para depresión y trastornos del ánimo en personas adultas, a través de videollamada.",
  },
  "psiquiatra-insomnio": {
    title: "Psiquiatra para Insomnio | Mi Psiquiatra",
    description: "Psiquiatra para insomnio por videollamada en Chile. Agenda tu consulta online.",
    heroTitle: "Psiquiatra para Insomnio",
    heroSubtitle: "Evaluación y seguimiento clínico para trastornos del sueño e insomnio en personas adultas, a través de videollamada.",
  },
};

const defaultDescription = "Psiquiatría clínica para adultos por videollamada en Chile.";

const toTitleCase = (value: string) =>
  value
    .split("-")
    .map((word) => (word ? `${word[0].toUpperCase()}${word.slice(1)}` : ""))
    .join(" ");

const getLandingCopy = (slug: string): LandingCopy => {
  const fallbackTitle = toTitleCase(slug);

  return (
    landingVariants[slug] ?? {
      title: `${fallbackTitle} | Mi Psiquiatra`,
      description: defaultDescription,
      heroTitle: fallbackTitle,
      heroSubtitle: "",
    }
  );
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const copy = getLandingCopy(slug);
  const canonicalUrl = `https://www.mipsiquiatra.cl/lp/${slug}`;

  return {
    title: copy.title,
    description: copy.description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: copy.title,
      description: copy.description,
      url: canonicalUrl,
    },
  };
}

export default async function LandingPageBySlug({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const copy = getLandingCopy(slug);

  return <LandingPage heroTitle={copy.heroTitle} heroSubtitle={copy.heroSubtitle} hideHeader />;
}
