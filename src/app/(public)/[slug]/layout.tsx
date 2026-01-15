import type { Metadata } from "next";

type Props = {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
};

const slugMetadata: Record<string, { title: string; description: string }> = {
  "primera-cita": {
    title: "Primera Cita - Mi Psiquiatra",
    description:
      "Agenda tu primera consulta de psiquiatría clínica para adultos por telemedicina en Chile. Selecciona día y horario disponibles.",
  },
};

const defaultMetadata = {
  title: "Agenda tu hora - Mi Psiquiatra",
  description: "Agenda tu consulta de psiquiatría clínica para adultos por telemedicina en Chile.",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const meta = slugMetadata[slug] ?? defaultMetadata;

  return {
    title: meta.title,
    description: meta.description,
  };
}

export default function PublicSlugLayout({ children }: Props) {
  return <>{children}</>;
}
