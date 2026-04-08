import Link from "next/link";

const featuredListings = [
  {
    title: "Luxury Villa in Maitama",
    city: "Abuja",
    price: "N12,500,000",
    beds: 4,
    baths: 5,
    area: "620 sqm",
    image:
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Modern Apartment in Lekki",
    city: "Lagos",
    price: "N3,600,000",
    beds: 2,
    baths: 2,
    area: "180 sqm",
    image:
      "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Waterfront Home in GRA",
    city: "Port Harcourt",
    price: "N2,400,000",
    beds: 3,
    baths: 3,
    area: "260 sqm",
    image:
      "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1200&q=80",
  },
];

export default function Home(): React.ReactElement {
  return (
    <div className="min-h-screen bg-[#f5ebe2] text-[#1f1a16]">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.65)_0,rgba(255,255,255,0)_45%),radial-gradient(circle_at_82%_15%,rgba(190,137,93,0.18)_0,rgba(190,137,93,0)_36%)]" />

        <nav className="relative z-10 mx-auto flex h-20 w-full max-w-6xl items-center justify-between px-6 sm:px-8">
          <div className="flex items-center gap-8">
            <span className="font-(family-name:--font-manrope) text-2xl font-black tracking-tight text-[#2a221d]">
              Victoria&apos;s
            </span>
            <div className="hidden items-center gap-7 md:flex">
              <Link href="/" className="border-b-2 border-[#2a221d] pb-1 text-sm font-semibold text-[#2a221d]">
                Home
              </Link>
              <Link href="/tenant/browse" className="text-sm font-medium text-[#5f554d] transition-colors hover:text-[#2a221d]">
                Properties
              </Link>
              <Link href="/tenant" className="text-sm font-medium text-[#5f554d] transition-colors hover:text-[#2a221d]">
                Concierge
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-full border border-[#cdb8a5] px-5 py-2 text-sm font-semibold text-[#43372e] transition-colors hover:bg-[#efe0d2]"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-[#d78f45] px-5 py-2 text-sm font-bold text-white shadow-[0_10px_25px_rgba(215,143,69,0.35)] transition-colors hover:bg-[#ca7f35]"
            >
              Get Started
            </Link>
          </div>
        </nav>

        <section className="relative z-10 mx-auto grid w-full max-w-6xl gap-10 px-6 pb-16 pt-6 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:pb-20 lg:pt-10">
          <div>
            <p className="mb-5 text-xs font-bold uppercase tracking-[0.24em] text-[#8c6e56]">
              Trusted In Lagos, Abuja & Port Harcourt
            </p>
            <h1 className="font-(family-name:--font-manrope) text-5xl font-extrabold leading-[1.02] text-[#2a221d] sm:text-6xl lg:text-7xl">
              Find a house
              <br />
              that suits you.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-[#6a5e54] sm:text-lg">
              Browse verified homes, compare true annual move-in costs, and let Victoria match you with properties aligned to your budget and lifestyle.
            </p>

            <div className="mt-9 grid max-w-xl grid-cols-3 gap-3 rounded-3xl border border-[#decdbd] bg-white/75 p-4 shadow-[0_20px_45px_rgba(53,37,22,0.08)] backdrop-blur-sm">
              <div className="rounded-2xl bg-[#f7eee6] p-3 text-center">
                <p className="text-2xl font-black text-[#2a221d]">2.5k+</p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8d7a6c]">Listings</p>
              </div>
              <div className="rounded-2xl bg-[#f7eee6] p-3 text-center">
                <p className="text-2xl font-black text-[#2a221d]">96%</p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8d7a6c]">Match Rate</p>
              </div>
              <div className="rounded-2xl bg-[#f7eee6] p-3 text-center">
                <p className="text-2xl font-black text-[#2a221d]">24h</p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8d7a6c]">Avg Reply</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -right-3 -top-3 h-24 w-24 rounded-full bg-[#e6c9ad] blur-2xl" />
            <div className="overflow-hidden rounded-[2rem] border border-[#d3bfad] bg-white shadow-[0_24px_60px_rgba(45,27,12,0.15)]">
              <img
                src="https://images.unsplash.com/photo-1600585152915-d208bec867a1?auto=format&fit=crop&w=1600&q=80"
                alt="Elegant modern home exterior"
                className="h-[420px] w-full object-cover"
              />
            </div>
            <div className="absolute -bottom-6 -left-6 rounded-2xl border border-[#d3bfad] bg-white px-5 py-4 shadow-[0_20px_40px_rgba(45,27,12,0.18)]">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8b7767]">Featured Area</p>
              <p className="mt-1 font-(family-name:--font-manrope) text-lg font-extrabold text-[#2a221d]">Lekki Phase 1</p>
              <p className="text-sm text-[#6a5e54]">From N1.8M / year</p>
            </div>
          </div>
        </section>

        <section className="relative z-10 mx-auto -mt-2 w-full max-w-6xl px-6 pb-16 sm:px-8">
          <div className="grid gap-3 rounded-[1.75rem] border border-[#decdbd] bg-white/90 p-4 shadow-[0_25px_55px_rgba(53,37,22,0.12)] backdrop-blur-sm md:grid-cols-[1fr_1fr_1fr_auto] md:items-center">
            <div className="rounded-2xl border border-[#e4d7cb] bg-[#fcfaf8] px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9a8778]">Location</p>
              <p className="text-sm font-semibold text-[#3c3128]">Lagos, Abuja, Port Harcourt</p>
            </div>
            <div className="rounded-2xl border border-[#e4d7cb] bg-[#fcfaf8] px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9a8778]">Property Type</p>
              <p className="text-sm font-semibold text-[#3c3128]">Apartments, Duplex, Mini-flat</p>
            </div>
            <div className="rounded-2xl border border-[#e4d7cb] bg-[#fcfaf8] px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9a8778]">Budget</p>
              <p className="text-sm font-semibold text-[#3c3128]">N500,000 - N15,000,000</p>
            </div>
            <Link
              href="/tenant/browse"
              className="inline-flex h-12 items-center justify-center rounded-full bg-[#d78f45] px-7 text-sm font-bold text-white shadow-[0_14px_28px_rgba(215,143,69,0.35)] transition-colors hover:bg-[#ca7f35]"
            >
              Search Homes
            </Link>
          </div>
        </section>
      </div>

      <section className="mx-auto w-full max-w-6xl px-6 pb-20 sm:px-8">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#8c6e56]">Featured Properties</p>
            <h2 className="mt-2 font-(family-name:--font-manrope) text-3xl font-extrabold text-[#2a221d] sm:text-4xl">
              Handpicked for your lifestyle
            </h2>
          </div>
          <Link href="/tenant/browse" className="text-sm font-bold text-[#7b5d43] hover:text-[#614832]">
            View all →
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {featuredListings.map((listing) => (
            <article
              key={listing.title}
              className="overflow-hidden rounded-[1.6rem] border border-[#ddcab8] bg-white shadow-[0_18px_38px_rgba(53,37,22,0.1)] transition-transform hover:-translate-y-1"
            >
              <img src={listing.image} alt={listing.title} className="h-52 w-full object-cover" />
              <div className="p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9a8676]">{listing.city}</p>
                <h3 className="mt-2 font-(family-name:--font-manrope) text-xl font-extrabold text-[#2a221d]">
                  {listing.title}
                </h3>
                <p className="mt-2 text-sm font-semibold text-[#7c5d43]">{listing.price} / year</p>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-[#f7eee6] px-2 py-2 text-[11px] font-semibold text-[#5d4b3f]">
                    {listing.beds} Beds
                  </div>
                  <div className="rounded-xl bg-[#f7eee6] px-2 py-2 text-[11px] font-semibold text-[#5d4b3f]">
                    {listing.baths} Baths
                  </div>
                  <div className="rounded-xl bg-[#f7eee6] px-2 py-2 text-[11px] font-semibold text-[#5d4b3f]">
                    {listing.area}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="pb-24">
        <div className="mx-auto w-full max-w-6xl px-6 sm:px-8">
          <div className="rounded-[2rem] border border-[#d8c6b7] bg-[#2f2620] px-8 py-12 sm:px-12 sm:py-14">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#c9ac93]">For Landlords</p>
                <h3 className="mt-2 font-(family-name:--font-manrope) text-3xl font-extrabold text-white sm:text-4xl">
                  List your property and reach verified tenants faster.
                </h3>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#d8c8bc] sm:text-base">
                  Use Victoria&apos;s AI-assisted listing tools, neighborhood positioning, and fair-pricing insights to reduce vacancy and close faster.
                </p>
              </div>
              <Link
                href="/register"
                className="inline-flex h-12 items-center justify-center rounded-full bg-[#d78f45] px-8 text-sm font-bold text-white transition-colors hover:bg-[#ca7f35]"
              >
                List Property
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#dcc9b8] bg-[#f8efe7] py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-5 px-6 text-center sm:px-8 md:flex-row md:text-left">
          <div>
            <span className="font-(family-name:--font-manrope) text-2xl font-black tracking-tight text-[#2a221d]">
              Victoria&apos;s
            </span>
            <p className="text-sm text-[#7f7065]">© {new Date().getFullYear()} Victoria&apos;s Shell. All rights reserved.</p>
          </div>
          <div className="flex gap-7 text-sm font-semibold text-[#6d5f54]">
            <Link href="#" className="hover:text-[#2a221d]">Privacy</Link>
            <Link href="#" className="hover:text-[#2a221d]">Terms</Link>
            <Link href="#" className="hover:text-[#2a221d]">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
