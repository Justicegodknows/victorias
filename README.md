# Victoria's — AI-Powered Apartment Finder for Nigeria

Victoria's is an AI-driven apartment search platform for Nigeria's major cities: **Lagos**, **Abuja**, and **Port Harcourt**. Tenants chat with an AI concierge ("Victoria") that understands the Nigerian rental market, while landlords manage listings, pricing insights, and tenant inquiries from a dedicated dashboard.

## Features

### Tenant Experience
- **AI Concierge Chat** — natural language apartment search powered by Vercel AI SDK v6 with RAG-augmented responses, semantic apartment search, and live web lookups
- **Browse & Filter** — structured search by city, apartment type, and budget with real-time Rental Price Index (RPI) badges
- **Affordability Analysis** — income-based affordability checks with total upfront cost breakdowns (rent + deposit + agent fee)
- **Neighborhood Intelligence** — environmental factors (power supply, flood risk, security ratings) and neighborhood knowledge base
- **Saved Apartments** — bookmark and revisit listings

### Landlord Experience
- **Listing Management** — multi-step listing creation with photos, amenities, and environmental data
- **Market Pricing Insights** — recommended rent range based on comparable listings and LGA-level RPI
- **Inquiry Dashboard** — view and manage tenant inquiries across all properties
- **RPI Benchmarking** — see how each listing's rent compares to the local market band

### AI Capabilities
- Semantic search across apartments and a curated knowledge base
- Rental Price Index (RPI) — a computed market benchmark blending historical transactions, current comparables, and inflation data
- Web search integration (Tavily / Brave) for live market news and policy updates
- Automatic affordability assessment and cost breakdowns
- Multi-tool agentic workflow with up to 10 reasoning steps per query

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, React 19) |
| AI | Vercel AI SDK v6, HuggingFace Inference API (default), Ollama (optional) |
| Database & Auth | Supabase (Postgres, Auth, Storage, Row Level Security) |
| Styling | Tailwind CSS v4, shadcn/ui components |
| Animations | Motion (Framer Motion), Rive |
| Linting | ESLint 9 (flat config) |
| Testing | Playwright |
| Language | TypeScript (strict mode) |

## Project Structure

```
victorias/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Login & registration pages
│   ├── (dashboard)/
│   │   ├── landlord/       # Landlord dashboard, listings, inquiries
│   │   └── tenant/         # AI chat, browse, saved apartments
│   ├── api/                # API routes (chat, embeddings, RPI, auth)
│   ├── components/         # App-specific components (chat, RPI badge)
│   └── lib/                # Core logic
│       ├── ai/             # AI provider, tools, RAG, embeddings, prompts
│       ├── data/           # Neighborhood & city reference data
│       └── supabase/       # Supabase client/server/middleware helpers
├── components/ui/          # Shared shadcn/ui components
├── lib/                    # Shared utilities
├── supabase/               # Supabase config & migrations
├── tests/                  # Playwright smoke & e2e tests
├── middleware.ts            # Auth session middleware
├── next.config.ts
├── tailwind (CSS-only)     # Configured in app/globals.css via @theme
└── eslint.config.mjs       # ESLint 9 flat config
```

## Getting Started

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project (for Postgres, Auth, and Storage)
- A [HuggingFace](https://huggingface.co) API key (for AI features) **or** a local [Ollama](https://ollama.ai) instance

### Setup

1. **Clone and install dependencies:**

```bash
git clone <your-repo-url>
cd victorias
npm install
```

2. **Configure environment variables:**

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in your credentials:

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
HUGGINGFACE_API_KEY=hf_your-key

# Optional
TAVILY_API_KEY=              # For AI web search
BRAVE_SEARCH_API_KEY=        # Fallback web search
AI_HEALTH_KEY=               # Protect /api/ai/health
RPI_RECOMPUTE_KEY=           # Protect RPI recompute endpoint
```

3. **Set up the database:**

Run the migrations in order in your Supabase SQL Editor, or use the Supabase CLI:

```bash
supabase db push
```

4. **Start the development server:**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Commands

```bash
npm run dev          # Start development server (hot reload)
npm run build        # Type-check and build for production
npm run start        # Serve the production build
npm run lint         # Run ESLint across all files
npm test             # Run all Playwright tests
npm run test:smoke   # Run smoke tests only
```

## Run with Docker (Local)

Use Docker Compose to run the app locally with hot reload.

```bash
docker compose up --build
```

Then open [http://localhost:3000](http://localhost:3000).

To stop the container:

```bash
docker compose down
```

Notes:
- The compose setup reads environment variables from `.env.local`.
- File changes in this repository are mounted into the container for local development.

## AI Provider Configuration

HuggingFace is the default primary provider for both chat and embeddings. To use Ollama instead (e.g., for local development):

```bash
AI_PRIMARY_PROVIDER=ollama
EMBEDDING_PRIMARY_PROVIDER=ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434/v1
```

The system supports automatic fallback: if the primary provider is unreachable, it tries the next configured provider.

## Deployment

### Vercel (Recommended)

1. Import the repo in the [Vercel dashboard](https://vercel.com/new)
2. Next.js is auto-detected — no build config changes needed
3. Add all environment variables from `.env.example` in Project Settings → Environment Variables
4. Deploy

### DigitalOcean App Platform

1. Create a Web Service from your Git repo
2. Build command: `npm ci && npm run build`
3. Run command: `npm run start`
4. Set environment variables and configure health check path to `/api/ai/health`

## API Routes

| Route | Method | Description |
|---|---|---|
| `/api/chat` | POST | AI chat with streaming responses |
| `/api/embeddings` | POST | Sync apartment/knowledge embeddings |
| `/api/rpi` | GET | Query Rental Price Index data |
| `/api/rpi` | POST | Recompute RPI (protected) |
| `/api/ai/health` | GET | AI provider health check |
| `/api/auth/signout` | POST | Sign out current user |

## License

Private — not open-source.
