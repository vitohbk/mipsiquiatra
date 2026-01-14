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

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const copy = getLandingCopy(params.slug);

  return {
    title: copy.title,
    description: copy.description,
    alternates: {
      canonical: `/lp/${params.slug}`,
    },
    openGraph: {
      title: copy.title,
      description: copy.description,
      url: `/lp/${params.slug}`,
    },
  };
}

export default function LandingPageBySlug({ params }: { params: { slug: string } }) {
  const copy = getLandingCopy(params.slug);

  return <LandingPage heroTitle={copy.heroTitle} />;
}
