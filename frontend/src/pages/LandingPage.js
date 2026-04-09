import { Link } from 'react-router-dom';
import {
  MicrophoneStage,
  MagnifyingGlass,
  ChatCircleDots,
  Broadcast,
  Star,
  Lightning,
  Users,
  ArrowRight
} from '@phosphor-icons/react';
import Navbar from '../components/Navbar';
import IOSInstallHint from '../components/IOSInstallHint';

const HERO_BG = "https://images.unsplash.com/photo-1580529352963-57ac28432755?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMjh8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMGRhcmslMjBuZW9uJTIwbGlnaHRzJTIwc3RhZ2V8ZW58MHx8fHwxNzc1Mzc4OTQ5fDA&ixlib=rb-4.1.0&q=85";

const FEATURES = [
  {
    icon: MagnifyingGlass,
    title: "Scopri Talenti",
    description: "Trova artisti emergenti per categoria, location e disponibilità"
  },
  {
    icon: Broadcast,
    title: "Live Streaming",
    description: "Guarda performance in diretta e interagisci con gli artisti"
  },
  {
    icon: ChatCircleDots,
    title: "Messaggistica",
    description: "Contatta direttamente gli artisti per progetti e collaborazioni"
  },
  {
    icon: Star,
    title: "Portfolio",
    description: "Visualizza video, foto e esperienze di ogni artista"
  }
];

// Artist types — static, evocative, no real user data
const ARTIST_TYPES = [
  { emoji: '🎤', name: 'Cantante',      color: '#FF007A', glow: 'rgba(255,0,122,0.25)',  rotate: '-2deg' },
  { emoji: '💃', name: 'Ballerino/a',   color: '#A855F7', glow: 'rgba(168,85,247,0.25)', rotate: '1.5deg' },
  { emoji: '🎸', name: 'Musicista',     color: '#00F0FF', glow: 'rgba(0,240,255,0.20)',  rotate: '-1deg' },
  { emoji: '🎭', name: 'Attore',        color: '#FF007A', glow: 'rgba(255,0,122,0.25)',  rotate: '2deg' },
  { emoji: '📢', name: 'Presentatore',  color: '#A855F7', glow: 'rgba(168,85,247,0.25)', rotate: '-1.5deg' },
];

// All categories for the grid
const ALL_CATEGORIES = [
  { id: 'cantante',    emoji: '🎤', name: 'Cantante',       desc: 'Voce e performance dal vivo' },
  { id: 'musicista',   emoji: '🎸', name: 'Musicista',      desc: 'Strumenti, composizione, band' },
  { id: 'ballerino',   emoji: '💃', name: 'Ballerino/a',    desc: 'Danza classica, moderna, urban' },
  { id: 'attore',      emoji: '🎭', name: 'Attore/Attrice', desc: 'Teatro, cinema, doppiaggio' },
  { id: 'presentatore',emoji: '📢', name: 'Presentatore',   desc: 'Conduzione, eventi, cerimonie' },
  { id: 'dj',          emoji: '🎧', name: 'DJ',             desc: 'Serate, festival, musica elettronica' },
  { id: 'cabarettista',emoji: '😄', name: 'Cabarettista',   desc: 'Comicità, stand-up, intrattenimento' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#09090B]">
      <Navbar />
      <IOSInstallHint />

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">

        {/* Background */}
        <div className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${HERO_BG})` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090B] via-[#09090B]/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#09090B]/70 via-[#09090B]/30 to-transparent" />

        {/* Floating artist silhouettes — desktop right side */}
        <div className="hidden lg:flex flex-col gap-4 absolute right-12 xl:right-24 top-1/2 -translate-y-1/2 z-10">
          {ARTIST_TYPES.map((a, i) => (
            <div
              key={i}
              style={{
                transform: `rotate(${a.rotate})`,
                animationDelay: `${i * 120}ms`,
                boxShadow: `0 0 32px ${a.glow}, 0 4px 24px rgba(0,0,0,0.4)`,
                border: `1px solid ${a.color}30`,
              }}
              className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-[#09090B]/70 backdrop-blur-xl"
            >
              <span style={{ fontSize: '1.75rem', filter: 'drop-shadow(0 0 8px ' + a.glow + ')' }}>
                {a.emoji}
              </span>
              <span className="font-semibold text-white text-sm tracking-wide">{a.name}</span>
              <span
                className="w-2 h-2 rounded-full ml-1 animate-pulse"
                style={{ background: a.color }}
              />
            </div>
          ))}
        </div>

        {/* Hero content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 w-full">
          <div className="text-center md:text-left max-w-2xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FF007A]/10 border border-[#FF007A]/30 mb-6">
              <Lightning size={16} weight="fill" className="text-[#FF007A]" />
              <span className="text-sm font-medium text-[#FF007A]">Piattaforma per Artisti Emergenti</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black tracking-tighter mb-6 font-['Unbounded']">
              <span className="text-white">Il tuo </span>
              <span className="gradient-text">Palcoscenico</span>
              <span className="text-white"> Digitale</span>
            </h1>

            <p className="text-lg sm:text-xl text-zinc-400 mb-8 max-w-xl">
              Metti in mostra il tuo talento, connettiti con chi cerca artisti per eventi e collaborazioni.
              Cantanti, attori, ballerini, presentatori: è il momento di brillare.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <Link to="/register"
                className="btn-primary text-lg flex items-center justify-center gap-2"
                data-testid="hero-cta-register"
              >
                <MicrophoneStage size={24} weight="duotone" />
                Inizia Ora
              </Link>
              <Link to="/discover"
                className="btn-outline text-lg flex items-center justify-center gap-2"
                data-testid="hero-cta-discover"
              >
                <MagnifyingGlass size={24} />
                Esplora Artisti
              </Link>
            </div>

            {/* Mobile: artist type pills */}
            <div className="flex lg:hidden flex-wrap gap-2 mt-8 justify-center md:justify-start">
              {ARTIST_TYPES.map((a, i) => (
                <span key={i}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-white"
                  style={{
                    background: `${a.color}18`,
                    border: `1px solid ${a.color}35`,
                  }}>
                  {a.emoji} {a.name}
                </span>
              ))}
            </div>

            {/* CTA block */}
            <div className="hidden sm:flex flex-wrap gap-8 mt-12 justify-center md:justify-start">
              <div className="text-center md:text-left">
                <p className="text-3xl font-bold text-white">Crea</p>
                <p className="text-sm text-zinc-500">il tuo profilo artista</p>
              </div>
              <div className="text-center md:text-left">
                <p className="text-3xl font-bold text-white">Connettiti</p>
                <p className="text-sm text-zinc-500">con artisti e venue</p>
              </div>
              <div className="text-center md:text-left">
                <p className="text-3xl font-bold text-white">Vai Live</p>
                <p className="text-sm text-zinc-500">e monetizza la tua musica</p>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-zinc-600 flex items-start justify-center p-2">
            <div className="w-1.5 h-3 bg-zinc-600 rounded-full animate-pulse" />
          </div>
        </div>
      </section>

      {/* ── ARTIST TYPES SECTION ─────────────────────────────── */}
      <section className="py-24 md:py-32 px-4 sm:px-6 lg:px-8 bg-zinc-900/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 font-['Unbounded']">
              Ogni tipo di artista,<br className="hidden sm:block" />
              <span className="gradient-text"> un solo palcoscenico</span>
            </h2>
            <p className="text-zinc-400 max-w-xl mx-auto">
              Che tu canti, danzi, reciti o intrattenga — ArtistStage è la tua vetrina.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
            {ALL_CATEGORIES.map((cat, i) => (
              <Link
                key={i}
                to={`/discover?category=${cat.id}`}
                className="group flex flex-col items-center text-center p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-[#FF007A]/40 transition-all duration-300 hover:bg-[#FF007A]/5"
              >
                <span
                  className="text-4xl mb-3 transition-transform duration-300 group-hover:scale-110"
                  style={{ filter: 'drop-shadow(0 0 12px rgba(255,0,122,0.3))' }}
                >
                  {cat.emoji}
                </span>
                <p className="font-bold text-white text-sm mb-1">{cat.name}</p>
                <p className="text-xs text-zinc-500 leading-tight hidden sm:block">{cat.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────── */}
      <section className="py-24 md:py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 font-['Unbounded']">
              Tutto ciò che ti serve
            </h2>
            <p className="text-zinc-400 max-w-2xl mx-auto">
              Una piattaforma completa per artisti emergenti e chi cerca talenti
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((feature, index) => (
              <div key={index} className="card p-6 md:p-8 group">
                <div className="w-12 h-12 rounded-xl bg-[#FF007A]/10 flex items-center justify-center mb-4 group-hover:bg-[#FF007A]/20 transition-colors">
                  <feature.icon size={24} className="text-[#FF007A]" weight="duotone" />
                </div>
                <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                <p className="text-sm text-zinc-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="py-24 md:py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="card p-8 md:p-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF007A]/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#00F0FF]/10 rounded-full blur-3xl" />
            <div className="relative z-10">
              <Users size={48} className="text-[#FF007A] mx-auto mb-6" weight="duotone" />
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 font-['Unbounded']">
                Pronto a mostrare il tuo talento?
              </h2>
              <p className="text-zinc-400 mb-8 max-w-xl mx-auto">
                Unisciti alla community di artisti emergenti e inizia a costruire la tua carriera oggi stesso.
              </p>
              <Link to="/register"
                className="btn-primary text-lg inline-flex items-center gap-2"
                data-testid="cta-register"
              >
                Crea il tuo Profilo
                <ArrowRight size={20} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer className="border-t border-zinc-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <MicrophoneStage size={28} weight="duotone" className="text-[#FF007A]" />
              <span className="font-['Unbounded'] font-bold text-lg">ArtistStage</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-zinc-500">
              <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <Link to="/terms" className="hover:text-white transition-colors">Termini</Link>
              <a href="mailto:support@artiststage.it" className="hover:text-white transition-colors">Contatti</a>
            </div>
            <p className="text-sm text-zinc-500">
              © 2025 ArtistStage. Tutti i diritti riservati.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
