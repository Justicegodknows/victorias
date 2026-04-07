import Link from "next/link";

const features = [
  {
    icon: "💬",
    title: "Chat with AI",
    description: "Describe your dream home in plain English. Victoria understands context, preferences, and lifestyle needs.",
  },
  {
    icon: "💰",
    title: "True Cost Breakdown",
    description: "No hidden fees. We analyze legal, agency, and maintenance costs for every listing.",
  },
  {
    icon: "📍",
    title: "Neighborhood Intelligence",
    description: "Insights on traffic patterns, electricity stability, and proximity to key amenities in any area.",
  },
  {
    icon: "📊",
    title: "Affordability Check",
    description: "Smart financial tools to match properties with your income and long-term budget goals.",
  },
  {
    icon: "🔍",
    title: "Smart Search",
    description: 'Advanced filtering that goes beyond bedrooms. Search by lighting, security, or "vibe".',
  },
  {
    icon: "📲",
    title: "WhatsApp Connect",
    description: "Get instant alerts and chat with verified agents directly through your favorite messaging app.",
  },
];

const cities = [
  { name: "Lagos", neighborhoods: ["Ikoyi", "VI", "Lekki"], image: "/images/lagos.jpg" },
  { name: "Abuja", neighborhoods: ["Maitama", "Asokoro", "Wuse"], image: "/images/abuja.jpg", offset: true },
  { name: "Port Harcourt", neighborhoods: ["GRA Phase 1", "Odili Rd"], image: "/images/ph.jpg" },
];

export default function Home(): React.ReactElement {
  return (
    <div className="flex flex-1 flex-col">
      {/* Top Nav */}
      <nav className="sticky top-0 w-full z-50 glass-nav shadow-[0px_20px_40px_rgba(26,27,34,0.06)]">
        <div className="flex justify-between items-center px-8 h-20 w-full max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-12">
            <span className="text-2xl font-black tracking-tighter text-emerald-900 dark:text-emerald-50 font-(family-name:--font-geist-sans)">
              Victoria&apos;s
            </span>
            <div className="hidden md:flex gap-8 items-center">
              <Link href="/" className="font-(family-name:--font-geist-sans) font-semibold tracking-tight text-emerald-700 dark:text-emerald-400 border-b-2 border-emerald-700 dark:border-emerald-400 pb-1">
                Discover
              </Link>
              <Link href="/tenant/browse" className="font-(family-name:--font-geist-sans) font-semibold tracking-tight text-zinc-500 dark:text-zinc-400 hover:text-emerald-600 transition-colors">
                Listings
              </Link>
              <Link href="/tenant" className="font-(family-name:--font-geist-sans) font-semibold tracking-tight text-zinc-500 dark:text-zinc-400 hover:text-emerald-600 transition-colors">
                Concierge
              </Link>
              <Link href="/tenant/saved" className="font-(family-name:--font-geist-sans) font-semibold tracking-tight text-zinc-500 dark:text-zinc-400 hover:text-emerald-600 transition-colors">
                Saved
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/register" className="btn-primary-gradient text-white px-6 py-2.5 rounded-full font-semibold active:scale-90 transition-transform">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero-gradient pt-24 pb-32 px-8 overflow-hidden">
        <div className="max-w-screen-xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <h1 className="font-(family-name:--font-manrope) text-6xl md:text-7xl font-extrabold tracking-tight text-[#1a1b22] dark:text-zinc-50 mb-8 leading-[1.1]">
              Find your perfect <br />
              <span className="text-[#006b2c] dark:text-emerald-400">apartment</span> in Nigeria
            </h1>
            <div className="pl-[10%]">
              <p className="text-xl text-[#3e4a3d] dark:text-zinc-400 max-w-lg mb-10 leading-relaxed">
                Meet Victoria, your digital curator. Experience a bespoke property search powered by AI intelligence that understands the nuances of the Nigerian market.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/register" className="btn-primary-gradient text-white px-8 py-4 rounded-full font-bold text-lg shadow-lg hover:shadow-xl transition-all">
                  Get Started — It&apos;s Free
                </Link>
                <Link href="/login" className="bg-[#e3e1ec] dark:bg-zinc-800 text-[#006b2c] dark:text-emerald-400 px-8 py-4 rounded-full font-bold text-lg hover:bg-[#e8e7f1] dark:hover:bg-zinc-700 transition-all">
                  Sign In
                </Link>
              </div>
            </div>
          </div>
          <div className="relative hidden lg:block">
            <div className="absolute -top-12 -right-12 w-64 h-64 bg-emerald-200/20 rounded-full blur-3xl" />
            <div className="rounded-2xl shadow-2xl relative z-10 w-full aspect-square bg-linear-to-br from-emerald-100 to-emerald-50 dark:from-zinc-800 dark:to-zinc-900 flex items-center justify-center">
              <span className="text-8xl">🏠</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-8 bg-[#fbf8ff] dark:bg-zinc-950">
        <div className="max-w-screen-xl mx-auto">
          <div className="mb-16">
            <span className="font-mono text-[#006b2c] dark:text-emerald-400 uppercase tracking-[0.3em] font-bold text-sm">
              Capabilities
            </span>
            <h2 className="font-(family-name:--font-manrope) text-4xl font-bold mt-4 dark:text-zinc-50">
              Intelligent curation.
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div key={feature.title} className="bg-[#f4f2fd] dark:bg-zinc-900 p-8 rounded-2xl hover:bg-[#e3e1ec] dark:hover:bg-zinc-800 transition-colors group">
                <div className="text-4xl mb-6 group-hover:scale-110 transition-transform">{feature.icon}</div>
                <h3 className="font-(family-name:--font-manrope) text-xl font-bold mb-3 dark:text-zinc-50">
                  {feature.title}
                </h3>
                <p className="text-[#3e4a3d] dark:text-zinc-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cities */}
      <section className="py-24 px-8 bg-[#f4f2fd] dark:bg-zinc-900 overflow-hidden">
        <div className="max-w-screen-xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
            <div>
              <span className="font-mono text-[#006b2c] dark:text-emerald-400 uppercase tracking-[0.3em] font-bold text-sm">
                Destinations
              </span>
              <h2 className="font-(family-name:--font-manrope) text-4xl font-bold mt-4 dark:text-zinc-50">
                Nigeria&apos;s Finest Hubs
              </h2>
            </div>
            <Link href="/tenant/browse" className="text-[#006b2c] dark:text-emerald-400 font-bold flex items-center gap-2 hover:gap-4 transition-all">
              View All Cities →
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {cities.map((city) => (
              <div key={city.name} className={`relative group cursor-pointer overflow-hidden rounded-2xl shadow-xl ${city.offset ? "md:translate-y-12" : ""}`}>
                <div className="w-full aspect-[3/4] bg-linear-to-br from-emerald-700 to-emerald-900 group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute inset-0 bg-linear-to-t from-zinc-950 via-transparent to-transparent opacity-80" />
                <div className="absolute bottom-0 left-0 p-8">
                  <h3 className="text-white font-(family-name:--font-manrope) text-3xl font-bold mb-2">{city.name}</h3>
                  <div className="flex flex-wrap gap-2">
                    {city.neighborhoods.map((n) => (
                      <span key={n} className="text-zinc-300 text-xs font-mono bg-white/10 backdrop-blur-md px-3 py-1 rounded-full">
                        {n}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Landlord CTA */}
      <section className="py-32 px-8 bg-[#fbf8ff] dark:bg-zinc-950">
        <div className="max-w-screen-xl mx-auto">
          <div className="bg-[#1a1b22] dark:bg-zinc-800 rounded-[2.5rem] p-12 md:p-20 relative overflow-hidden">
            <div className="relative z-10 max-w-2xl">
              <h2 className="font-(family-name:--font-manrope) text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
                Are you a landlord?
              </h2>
              <p className="text-zinc-400 text-lg mb-10 leading-relaxed">
                Connect with verified, high-quality tenants curated by our AI system. Reduce vacancy times and manage your properties with unprecedented transparency.
              </p>
              <Link href="/register" className="bg-[#006b2c] text-white px-10 py-4 rounded-full font-bold text-lg hover:bg-[#00873a] transition-all inline-block">
                List Your Property
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#f4f2fd] dark:bg-zinc-900 py-12 px-8">
        <div className="max-w-screen-xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col items-center md:items-start gap-4">
            <span className="text-2xl font-black tracking-tighter text-emerald-900 dark:text-emerald-50 font-(family-name:--font-geist-sans)">
              Victoria&apos;s
            </span>
            <p className="text-[#3e4a3d] dark:text-zinc-400 text-sm">© {new Date().getFullYear()} Victoria&apos;s Shell. All rights reserved.</p>
          </div>
          <div className="flex gap-8 text-sm font-medium text-[#3e4a3d] dark:text-zinc-400">
            <Link href="#" className="hover:text-[#006b2c] dark:hover:text-emerald-400 transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-[#006b2c] dark:hover:text-emerald-400 transition-colors">Terms</Link>
            <Link href="#" className="hover:text-[#006b2c] dark:hover:text-emerald-400 transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
