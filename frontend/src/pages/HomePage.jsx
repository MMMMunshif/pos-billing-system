import { Link } from 'react-router-dom';

const features = [
  {
    icon: '📦',
    title: 'Product Management',
    text: 'Add, edit and manage products, categories and pricing.',
  },
  {
    icon: '📥',
    title: 'Stock Tracking',
    text: 'Track stock in and stock out. Never run out of stock.',
  },
  {
    icon: '🛒',
    title: 'Sales Billing',
    text: 'Create invoices quickly with discounts and payment options.',
  },
  {
    icon: '👥',
    title: 'Customer Management',
    text: 'Manage customers and track purchase history.',
  },
  {
    icon: '💸',
    title: 'Expense Management',
    text: 'Record all shop expenses and manage categories.',
  },
  {
    icon: '📈',
    title: 'Profit Reports',
    text: 'View detailed reports on sales, expenses and profit.',
  },
  {
    icon: '🧾',
    title: 'Invoice Printing',
    text: 'Print professional invoices and save them as PDF.',
  },
  {
    icon: '🛡️',
    title: 'Admin & Staff Access',
    text: 'Secure login for admin and staff with role access.',
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#050816] text-white">
      {/* Landing Image Section */}
      <section className="relative min-h-screen overflow-hidden">
        {/* Background image with slow animation */}
        <img
          src="/home-landing.jpeg"
          alt="Multy Corner Kattankudy landing page"
          className="hero-image absolute inset-0 h-full w-full object-cover object-top"
        />

        {/* Dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#050816]/10 via-transparent to-[#050816]/10" />

        {/* Animated glow lights */}
        <div className="glow-one absolute left-[8%] top-[20%] h-72 w-72 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="glow-two absolute right-[10%] top-[18%] h-80 w-80 rounded-full bg-purple-600/20 blur-3xl" />
        <div className="glow-three absolute bottom-[18%] left-[35%] h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />

        {/* Floating light particles */}
        <span className="particle particle-one" />
        <span className="particle particle-two" />
        <span className="particle particle-three" />
        <span className="particle particle-four" />
        <span className="particle particle-five" />

        {/* Invisible clickable area for TOP-RIGHT Login button in image */}
        <Link
          to="/login"
          aria-label="Login to System"
          title="Login to System"
          className="absolute right-[6%] top-[3.5%] z-30 h-[64px] w-[270px] rounded-2xl"
        />

        {/* Invisible clickable area for LEFT Login button in image */}
        <Link
          to="/login"
          aria-label="Login to System"
          title="Login to System"
          className="absolute left-[5.3%] top-[62.5%] z-30 h-[66px] w-[250px] rounded-2xl"
        />

        {/* Invisible clickable area for Explore Features button in image */}
        <a
          href="#features"
          aria-label="Explore Features"
          title="Explore Features"
          className="absolute left-[20%] top-[62.5%] z-30 h-[66px] w-[265px] rounded-2xl"
        />

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#050816] via-[#050816]/85 to-transparent" />
      </section>

      {/* Clear Animated Features Section */}
      <section
        id="features"
        className="relative bg-[#050816] px-5 pb-20 pt-12 lg:px-14"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(37,99,235,0.22),transparent_35%)]" />

        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="text-center">
            <p className="animate-fadeIn text-sm font-bold uppercase tracking-[0.3em] text-blue-400">
              Features
            </p>

            <h2 className="mt-3 text-3xl font-black md:text-4xl">
              Everything You Need to Run Your Shop
            </h2>

            <div className="mx-auto mt-4 h-1 w-24 rounded-full bg-gradient-to-r from-blue-500 to-purple-500" />

            <p className="mx-auto mt-5 max-w-3xl text-slate-300">
              Manage products, stock, sales billing, customers, expenses,
              reports, invoice printing, and admin or staff access from one
              simple system.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="feature-card group rounded-3xl border border-white/10 bg-white/[0.05] p-6 text-center shadow-xl shadow-blue-950/30 backdrop-blur transition duration-300 hover:-translate-y-3 hover:border-blue-400/40 hover:bg-white/[0.08]"
                style={{
                  animationDelay: `${index * 0.12}s`,
                }}
              >
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/25 to-purple-600/25 text-4xl shadow-lg shadow-blue-500/10 transition duration-300 group-hover:scale-110 group-hover:rotate-6">
                  {feature.icon}
                </div>

                <h3 className="text-lg font-black text-white">
                  {feature.title}
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-300">
                  {feature.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <style>{`
        .hero-image {
          animation: heroZoom 12s ease-in-out infinite alternate;
        }

        @keyframes heroZoom {
          from {
            transform: scale(1);
          }
          to {
            transform: scale(1.035);
          }
        }

        .glow-one {
          animation: glowMoveOne 7s ease-in-out infinite alternate;
        }

        .glow-two {
          animation: glowMoveTwo 8s ease-in-out infinite alternate;
        }

        .glow-three {
          animation: glowMoveThree 9s ease-in-out infinite alternate;
        }

        @keyframes glowMoveOne {
          from {
            transform: translate(0, 0);
            opacity: 0.45;
          }
          to {
            transform: translate(40px, 30px);
            opacity: 0.8;
          }
        }

        @keyframes glowMoveTwo {
          from {
            transform: translate(0, 0);
            opacity: 0.45;
          }
          to {
            transform: translate(-45px, 35px);
            opacity: 0.75;
          }
        }

        @keyframes glowMoveThree {
          from {
            transform: translate(0, 0);
            opacity: 0.35;
          }
          to {
            transform: translate(30px, -35px);
            opacity: 0.65;
          }
        }

        .particle {
          position: absolute;
          z-index: 20;
          width: 10px;
          height: 10px;
          border-radius: 9999px;
          background: linear-gradient(135deg, #38bdf8, #a855f7);
          box-shadow: 0 0 20px rgba(96, 165, 250, 0.8);
          opacity: 0.8;
          animation: particleFloat 6s ease-in-out infinite;
        }

        .particle-one {
          left: 33%;
          top: 17%;
          animation-delay: 0s;
        }

        .particle-two {
          left: 48%;
          top: 13%;
          animation-delay: 1s;
        }

        .particle-three {
          right: 18%;
          top: 10%;
          animation-delay: 1.8s;
        }

        .particle-four {
          right: 8%;
          top: 50%;
          animation-delay: 2.5s;
        }

        .particle-five {
          left: 18%;
          bottom: 18%;
          animation-delay: 3.2s;
        }

        @keyframes particleFloat {
          0%, 100% {
            transform: translateY(0) scale(1);
            opacity: 0.45;
          }
          50% {
            transform: translateY(-22px) scale(1.25);
            opacity: 1;
          }
        }

        .feature-card {
          opacity: 0;
          transform: translateY(30px);
          animation:
            cardFadeUp 0.8s ease forwards,
            floatCard 4s ease-in-out infinite;
        }

        @keyframes cardFadeUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes floatCard {
          0%, 100% {
            translate: 0 0;
          }
          50% {
            translate: 0 -8px;
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.8s ease forwards;
        }
      `}</style>
    </main>
  );
}