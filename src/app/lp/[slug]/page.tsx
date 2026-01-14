import type { Metadata } from "next";

import LandingPage from "../../_components/landing-page";

type LandingCopy = {
  title: string;
  description: string;
  heroTitle: string;
};

const landingVariants: Record<string, LandingCopy> = {
  "psiquiatra-adulto-online": {
    title: "Psiquiatra Adulto Online | Mi Psiquiatra",
    description: "Psiquiatra adulto online por videollamada en Chile. Agenda tu hora online.",
    heroTitle: "Psiquiatra Adulto Online",
  },
  "psiquiatra-de-adultos": {
    title: "Psiquiatra de Adultos | Mi Psiquiatra",
    description: "Psiquiatra de adultos por videollamada en Chile. Agenda tu hora online.",
    heroTitle: "¿Buscas un Psiquiatra de Adultos?",
  },
  "agendar-hora-psiquiatra": {
    title: "Agendar hora de psiquiatra | Mi Psiquiatra",
    description: "Agendar hora de psiquiatra por videollamada en Chile. Agenda tu hora online.",
    heroTitle: "¿Buscas Agendar Hora de Psiquiatra?",
  },
  "videollamada-psiquiatra-online": {
    title: "Videollamada con psiquiatra online | Mi Psiquiatra",
    description: "Videollamada con psiquiatra online en Chile. Agenda tu hora online.",
    heroTitle: "¿Buscas Videollamada con Psiquiatra Online?",
  },
  "ayuda-psiquiatra": {
    title: "Ayuda de psiquiatra | Mi Psiquiatra",
    description: "Ayuda de psiquiatra por videollamada en Chile. Agenda tu hora online.",
    heroTitle: "¿Buscas Ayuda de Psiquiatra?",
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

  return <LandingPage heroTitle={copy.heroTitle} />;
}
