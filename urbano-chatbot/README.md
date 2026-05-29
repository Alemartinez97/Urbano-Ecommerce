# 🤖 Premium AI Chatbot — Microservicio Conversacional Autónomo

¡Bienvenido al repositorio del **Asistente Virtual Inteligente y Agéntico**! 

Este proyecto es una aplicación full-stack moderna y ultra-premium desarrollada como un microservicio completamente independiente con **Next.js (App Router)**, **TypeScript**, **Tailwind CSS v4** y **Vercel AI SDK**, lista para ser dockerizada y desplegada en infraestructuras cloud y en el edge (como **Cloudflare** o **Vercel**), diseñada bajo los principios de la **Arquitectura Limpia y Hexagonal**.

---

## 🚀 Características Clave (Enterprise & Premium)

1. **Diseño Premium y Futurista (WOW Factor):** Interfaz totalmente responsive con estilo espacial oscuro, difuminados de cristal (`glassmorphism`), gradientes animados y transiciones fluidas diseñadas con `framer-motion` y `lucide-react`.
2. **Búsqueda Semántica RAG & Base de Datos Vectorial Local:** Incorpora una base de datos vectorial in-memory local (`vector-db.ts`) con fallback híbrido de alta precisión. Si detecta la API Key de OpenAI, realiza embeddings con `text-embedding-3-small` en tiempo real y calcula similitud de coseno; si funciona offline, activa una búsqueda por solapamiento de tokens y peso TF-IDF.
3. **Voice AI Bidireccional (Micrófono y Audio):**
   * **Speech-to-Text (STT):** Permite al usuario hablar directamente al chat a través de su micrófono utilizando la API Web Speech nativa del navegador. Incluye animación de onda de frecuencia en tiempo real y transcripción instantánea al campo de escritura.
   * **Text-to-Speech (TTS):** Sintetiza las respuestas escritas de la IA en audio hablado de forma fluida en español utilizando la API de síntesis nativa, totalmente gratis.
4. **Mantenimiento de Historial Local:** Sidebar interactiva que almacena las sesiones de conversación en el `localStorage` del usuario, permitiendo crear, renombrar y reanudar chats de forma segura y privada.
5. **Logs & Observabilidad Estructurada:** Sistema de logging integrado (`logger.ts`) que distingue entre entornos. En desarrollo muestra logs amigables con código de colores; en producción exporta logs en formato estructurado JSON nativo, listo para ser consumido por agregadores cloud como **Datadog** o **Cloudflare Logs**.
6. **SEO Técnico Avanzado:** Optimización completa con Schema.org JSON-LD para asistentes virtuales de software, meta tags enriquecidos para redes sociales (OpenGraph y Twitter Cards) y metadatos de rastreo.

---

## 🏛️ Arquitectura del Sistema (Clean & Hexagonal)

La estructura del código está dividida estrictamente en capas desacopladas dentro del directorio `src/`, asegurando que puedas migrar o integrar cualquier servicio externo (por ejemplo, bases de datos en la nube como Firebase) en el futuro reemplazando únicamente sus adaptadores:

```
urbano-chatbot/src/
├── domain/                    # Capa Core (Contratos y Entidades independientes de frameworks)
│   └── entities/              # Modelos de dominio independientes
│
├── application/               # Capa de Lógica de Negocio y Casos de Uso
│   └── use-cases/             # OrchestrateChatUseCase (Orquestador cognitivo de herramientas RAG)
│
├── infrastructure/            # Capa de Adaptadores Externos e Integraciones
│   └── adapters/              # VectorDBService (Buscador vectorial y dataset in-memory de FAQs)
│
├── lib/                       # Utilidades transversales e infraestructura técnica
│   ├── logger.ts              # Logger estructurado de observabilidad (Datadog compatible)
│   └── utils.ts               # Utilidades de estilos y clases CSS
│
└── app/                       # Capa de Entrega (Next.js Delivery Layer)
    ├── api/chat/route.ts      # API Controller (Streaming agéntico de respuestas)
    ├── globals.css            # Estilos del sistema de diseño (Tailwind v4)
    ├── page.tsx               # Vista principal de interacción conversacional
    └── layout.tsx             # Layout global con SEO técnico optimizado
```

---

## 🐳 Dockerización del Microservicio

Este chatbot está configurado y optimizado para funcionar como un contenedor de Docker liviano.

### 1. Construir la imagen localmente
Desde la raíz del proyecto, ejecuta:
```bash
docker build -t premium-ai-chatbot -f Dockerfile .
```

### 2. Ejecutar el contenedor
Ejecuta la imagen mapeando el puerto oficial expuesto (3000):
```bash
docker run -p 3000:3000 --env OPENAI_API_KEY=tu-clave-aqui premium-ai-chatbot
```

---

## 🛠️ Instalación y Configuración Local

### Prerrequisitos
* Node.js v20+
* npm

### 1. Clonar e Instalar dependencias
Desde la carpeta raíz del proyecto, navega al directorio del chatbot e instala los paquetes:
```bash
cd urbano-chatbot
npm install
```

### 2. Configurar variables de entorno
Crea tu archivo `.env` copiando la plantilla:
```bash
cp .env.example .env
```
Abre el archivo `.env` y añade tu clave de OpenAI real:
```env
OPENAI_API_KEY=sk-proj-tu-clave-aqui...
```

### 3. Iniciar el Servidor de Desarrollo
Corre la aplicación localmente:
```bash
npm run dev
```
La aplicación se levantará en: **`http://localhost:3000`**. ¡Ábrela en tu navegador para ver la interfaz en acción!

---

## ☁️ Guía de Despliegue en la Nube y Edge

### ⚡ Despliegue en Cloudflare Workers / Pages
Este proyecto es compatible con el Edge Runtime de Cloudflare Pages mediante el adaptador `@cloudflare/next-on-pages`.
1. Asegúrate de tener instalado el CLI de Wrangler.
2. Configura tus credenciales de Cloudflare.
3. Ejecuta el comando de compilación y publicación de Cloudflare Pages:
   ```bash
   npx @cloudflare/next-on-pages
   npx wrangler pages deploy .vercel/output
   ```

### 💧 Integración con Firebase (Cloud Persistence)
Si deseas agregar persistencia remota en lugar de usar únicamente `localStorage`:
1. Inicializa el SDK de Firebase en una nueva utilidad (`src/lib/firebase.ts`).
2. Crea un adaptador (`FirebaseChatRepository`) en `src/infrastructure/adapters` que extienda la interfaz de persistencia de sesiones.
3. El frontend sincronizará automáticamente las sesiones en Firestore cuando el usuario esté autenticado.
