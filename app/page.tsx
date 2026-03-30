import Link from "next/link";

export default function Home(): React.ReactElement {
  return (
    <div className="flex flex-1 flex-col">
      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center bg-gradient-to-b from-green-50 to-white px-4 py-24 text-center dark:from-zinc-900 dark:to-zinc-950">
        <div className="mx-auto max-w-3xl">
          <span className="inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-400">
            AI-Powered Apartment Finder
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl lg:text-6xl dark:text-zinc-50">
            Find your perfect apartment in{" "}
            <span className="text-green-600">Nigeria</span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Victoria is your AI-powered apartment finder for Lagos, Abuja, and Port Harcourt.
            Tell her your budget, preferred area, and must-haves — she&apos;ll find the best matches
            and help you understand the true cost of each apartment.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/register"
              className="rounded-full bg-green-600 px-8 py-3 text-sm font-semibold text-white shadow-sm hover:bg-green-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
            >
              Get Started — It&apos;s Free
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-zinc-300 px-8 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-zinc-200 bg-white px-4 py-20 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            How Victoria helps you
          </h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: "💬",
                title: "Chat with AI",
                description:
                  "Tell Victoria what you need in natural language. She understands Nigerian rent, neighborhoods, and budgets.",
              },
              {
                icon: "₦",
                title: "True Cost Breakdown",
                description:
                  "See the full upfront cost — annual rent, caution deposit, agent fee, and agreement fee. No hidden surprises.",
              },
              {
                icon: "🏘️",
                title: "Neighborhood Intelligence",
                description:
                  "Get honest insights about flooding risk, power supply, security, traffic, and nearby amenities for every area.",
              },
              {
                icon: "📊",
                title: "Affordability Check",
                description:
                  "Victoria assesses whether an apartment fits your income using Nigerian affordability standards (rent ≤ 30% of annual income).",
              },
              {
                icon: "🔍",
                title: "Smart Search",
                description:
                  "Filter by city, budget, apartment type, amenities, and environmental factors. Browse or let the AI search for you.",
              },
              {
                icon: "📱",
                title: "WhatsApp Connect",
                description:
                  "Reach landlords directly via WhatsApp. Send inquiries through the platform and get notified when they respond.",
              },
            ].map((feature) => (
              <div key={feature.title} className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
                <span className="text-2xl">{feature.icon}</span>
                <h3 className="mt-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cities */}
      <section className="border-t border-zinc-200 bg-zinc-50 px-4 py-20 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Available in 3 major cities
          </h2>
          <div className="mt-10 flex flex-col items-center justify-center gap-6 sm:flex-row">
            {[
              { city: "Lagos", description: "Lekki, Yaba, Ikeja, Ajah, Surulere & more" },
              { city: "Abuja", description: "Wuse, Maitama, Gwarinpa, Kubwa & more" },
              { city: "Port Harcourt", description: "GRA, Rumuodara, Woji & more" },
            ].map((item) => (
              <div key={item.city} className="w-full max-w-xs rounded-xl bg-white p-6 shadow-sm dark:bg-zinc-800">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{item.city}</h3>
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA for landlords */}
      <section className="border-t border-zinc-200 bg-white px-4 py-20 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Are you a landlord?
          </h2>
          <p className="mt-4 text-zinc-600 dark:text-zinc-400">
            List your apartments for free and reach tenants searching with AI. Add photos, set your price, and receive inquiries directly.
          </p>
          <Link
            href="/register"
            className="mt-8 inline-block rounded-full bg-zinc-900 px-8 py-3 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            List your apartment
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-zinc-50 px-4 py-8 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between text-sm text-zinc-500 dark:text-zinc-400">
          <span className="font-semibold text-green-600">Victoria&apos;s</span>
          <span>© {new Date().getFullYear()} Victoria&apos;s. AI-powered apartment finder for Nigeria.</span>
        </div>
      </footer>
    </div>
  );
}
