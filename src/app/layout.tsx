import type { Metadata } from "next";
import { headers } from "next/headers";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

/**
 * Genera metadata dinámica según el tenant activo.
 *
 * En producción, Next.js lee el hostname y genera <title>, <meta>,
 * y Open Graph tags específicos para cada municipio.
 */
export async function generateMetadata(): Promise<Metadata> {
  const headersList = headers();
  const host = headersList.get("host") || "";
  const tenantName = headersList.get("x-tenant-name");
  const tenantSlug = headersList.get("x-tenant-slug");

  // Si hay tenant, personalizar SEO
  if (tenantName && tenantSlug) {
    const title = `TE CUIDA — ${tenantName}`;
    const description = `Portal de bienestar emocional y salud comunitaria de ${tenantName}. Programas de mindfulness, gestión del estrés, apoyo familiar y más para los ciudadanos de ${tenantName}.`;

    return {
      title: {
        default: title,
        template: `%s | ${tenantName} — TE CUIDA`,
      },
      description,
      metadataBase: new URL(`https://${host}`),
      openGraph: {
        title,
        description,
        type: "website",
        locale: "es_ES",
        siteName: "TE CUIDA",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
      },
      robots: {
        index: true,
        follow: true,
      },
    };
  }

  // SEO por defecto (landing page sin tenant)
  return {
    title: {
      default: "TE CUIDA — Bienestar ciudadano",
      template: "%s | TE CUIDA",
    },
    description:
      "Plataforma de bienestar emocional y salud comunitaria para municipios. Programas de mindfulness, gestión del estrés, apoyo familiar y más.",
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_BASE_DOMAIN
        ? `https://${process.env.NEXT_PUBLIC_BASE_DOMAIN}`
        : "http://localhost:3000"
    ),
    openGraph: {
      title: "TE CUIDA — Bienestar ciudadano",
      description:
        "Plataforma de bienestar emocional y salud comunitaria para municipios.",
      type: "website",
      locale: "es_ES",
      siteName: "TE CUIDA",
    },
    twitter: {
      card: "summary_large_image",
      title: "TE CUIDA — Bienestar ciudadano",
      description:
        "Plataforma de bienestar emocional y salud comunitaria para municipios.",
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Leer colores del tenant desde headers para inyectar CSS variables
  const headersList = headers();
  const tenantPrimary = headersList.get("x-tenant-primary") || "#1e40af";
  const tenantSecondary = headersList.get("x-tenant-secondary") || "#3b82f6";
  const tenantAccent = headersList.get("x-tenant-accent") || "#f59e0b";
  const tenantText = headersList.get("x-tenant-text") || "#f8fafc";

  const tenantStyle = {
    "--tenant-primary": tenantPrimary,
    "--tenant-secondary": tenantSecondary,
    "--tenant-accent": tenantAccent,
    "--tenant-text": tenantText,
  } as React.CSSProperties;

  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={tenantStyle}
      >
        {children}
      </body>
    </html>
  );
}
