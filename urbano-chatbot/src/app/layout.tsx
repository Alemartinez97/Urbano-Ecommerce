import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Premium AI Chatbot — Asistente Conversacional Inteligente",
  description: "Asistente virtual de última generación con Inteligencia Artificial agéntica, búsqueda semántica RAG, entrada y salida de voz interactiva, y persistencia local de conversaciones.",
  keywords: ["AI Chatbot", "Inteligencia Artificial", "RAG", "Speech to Text", "Agente Virtual", "Microservicio Chatbot"],
  authors: [{ name: "AI Dev Team" }],
  openGraph: {
    title: "Premium AI Chatbot — Asistente Conversacional Inteligente",
    description: "Habla con nuestro agente autónomo inteligente dotado de memoria local, buscador semántico RAG y entrada/salida de voz.",
    type: "website",
    locale: "es_ES",
    siteName: "AI Chatbot Microservice",
  },
  twitter: {
    card: "summary_large_image",
    title: "Premium AI Chatbot — Asistente Conversacional Inteligente",
    description: "Explora la siguiente frontera de la atención virtual con nuestro agente cognitivo agéntico.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Schema.org structured data for standard customer support application
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Premium AI Chatbot",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "All",
    "description": "Asistente conversacional agéntico dotado de recuperación semántica vectorial y entrada por voz.",
    "featureList": [
      "Orquestación agéntica autónoma",
      "Buscador semántico local Vector DB RAG",
      "Soporte nativo de Speech-to-Text y Text-to-Speech",
      "Persistencia de historial local con auto-titulado",
      "Logs estructurados compatibles con Datadog"
    ]
  };

  return (
    <html
      lang="es"
      className="h-full antialiased font-sans"
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-gray-950 text-gray-200">
        {children}
      </body>
    </html>
  );
}
