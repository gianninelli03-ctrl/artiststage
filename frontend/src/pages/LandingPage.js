import { useState, useEffect } from 'react';
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
import { supabase } from '../supabaseClient';

const HERO_BG = "https://images.unsplash.com/photo-1580529352963-57ac28432755?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMjh8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMGRhcmslMjBuZW9uJTIwbGlnaHRzJTIwc3RhZ2V8ZW58MHx8fHwxNzc1Mzc4OTQ5fDA&ixlib=rb-4.1.0&q=85";

const CATEGORY_ICONS = {
  cantante: '🎤', dj: '🎧', musicista: '🎵', band: '🎸',
  ballerino: '💃', cabarettista: '😄', presentatore: '📢',
  attore: '🎭', intrattenitore: '✨', altro: '⭐'
};

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

export default function LandingPage() {
  const [featuredArtists, setFeaturedArtists] = useState([]);
  const [artistsLoading, setArtistsLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('artist_profiles')
      .select('id, stage_name, category, profile_image_url, is_live')
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data }) => {
        setFeaturedArtists(data || []);
        setArtistsLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-[#09090B]">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${HERO_BG})` }}
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090B] via-[#09090B]/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#09090B]/60 to-transparent" />
        
        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20">
          <div className="text-center md:text-left max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FF007A]/10 border border-[#FF007A]/30 mb-6">
              <Lightning size={16} weight="fill" className="text-[#FF007A]" />
              <span className="text-sm font-medium text-[#FF007A]">Piattaforma per Artisti Emergenti</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black tracking-tighter mb-6 font-['Unbounded']">
              <span className="text-white">Il tuo </span>
              <span className="gradient-text">Palcoscenico</span>
              <span className="text-white"> Digitale</span>
            </h1>
            
            <p className="text-lg sm:text-xl text-zinc-400 mb-8 max-w-2xl">
              Metti in mostra il tuo talento, connettiti con chi cerca artisti per eventi, progetti e collaborazioni. 
              Cantanti, attori, ballerini, presentatori: è il momento di brillare.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <Link 
                to="/register" 
                className="btn-primary text-lg flex items-center justify-center gap-2"
                data-testid="hero-cta-register"
              >
                <MicrophoneStage size={24} weight="duotone" />
                Inizia Ora
              </Link>
              <Link 
                to="/discover" 
                className="btn-outline text-lg flex items-center justify-center gap-2"
                data-testid="hero-cta-discover"
              >
                <MagnifyingGlass size={24} />
                Esplora Artisti
              </Link>
            </div>
            
            {/* Stats */}
            <div className="flex flex-wrap gap-8 mt-12 justify-center md:justify-start">
              <div className="text-center md:text-left">
                <p className="text-3xl font-bold text-white">500+</p>
                <p className="text-sm text-zinc-500">Artisti Registrati</p>
              </div>
              <div className="text-center md:text-left">
                <p className="text-3xl font-bold text-white">1.2K</p>
                <p className="text-sm text-zinc-500">Progetti Completati</p>
              </div>
              <div className="text-center md:text-left">
                <p className="text-3xl font-bold text-white">50+</p>
                <p className="text-sm text-zinc-500">Live Settimanali</p>
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

      {/* Features Section */}
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
              <div 
                key={index}
                className="card p-6 md:p-8 group"
                style={{ animationDelay: `${index * 100}ms` }}
              >
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

      {/* Featured Artists Section */}
      <section className="py-24 md:py-32 px-4 sm:px-6 lg:px-8 bg-zinc-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 font-['Unbounded']">
                Artisti in Evidenza
              </h2>
              <p className="text-zinc-400">Scopri i talenti più seguiti</p>
            </div>
            <Link 
              to="/discover" 
              className="hidden sm:flex items-center gap-2 text-[#FF007A] hover:text-[#E6006E] transition-colors"
              data-testid="view-all-artists"
            >
              Vedi tutti
              <ArrowRight size={20} />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {artistsLoading ? (
              // Skeleton
              [...Array(3)].map((_, i) => (
                <div key={i} className="card overflow-hidden animate-pulse">
                  <div className="aspect-[4/5] bg-zinc-800" />
                </div>
              ))
            ) : featuredArtists.length === 0 ? (
              // Stato vuoto
              <div className="col-span-3 text-center py-16 text-zinc-500">
                <MicrophoneStage size={48} className="mx-auto mb-4 opacity-30" weight="duotone" />
                <p>Nessun artista ancora registrato.</p>
                <Link to="/register" className="text-[#FF007A] text-sm mt-2 inline-block">
                  Sii il primo!
                </Link>
              </div>
            ) : (
              featuredArtists.map((artist) => (
                <Link
                  key={artist.id}
                  to={`/artist/${artist.id}`}
                  className="card group overflow-hidden"
                  data-testid={`featured-artist-${artist.id}`}
                >
                  <div className="relative aspect-[4/5] overflow-hidden">
                    {artist.profile_image_url ? (
                      <img
                        src={artist.profile_image_url}
                        alt={artist.stage_name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
                        <span className="text-6xl">
                          {CATEGORY_ICONS[artist.category?.toLowerCase()] || '🎨'}
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                    {artist.is_live && (
                      <div className="absolute top-4 left-4 live-indicator">
                        <Broadcast size={14} weight="bold" />
                        LIVE
                      </div>
                    )}

                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      {artist.category && (
                        <span className="category-badge mb-2 inline-block">{artist.category}</span>
                      )}
                      <h3 className="text-xl font-bold text-white">{artist.stage_name}</h3>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
          
          <div className="mt-8 text-center sm:hidden">
            <Link 
              to="/discover" 
              className="btn-outline inline-flex items-center gap-2"
            >
              Vedi tutti gli artisti
              <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 md:py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="card p-8 md:p-12 relative overflow-hidden">
            {/* Decorative elements */}
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
              <Link 
                to="/register" 
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

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <MicrophoneStage size={28} weight="duotone" className="text-[#FF007A]" />
              <span className="font-['Unbounded'] font-bold text-lg">ArtistStage</span>
            </div>
            
            <div className="flex items-center gap-6 text-sm text-zinc-500">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Termini</a>
              <a href="#" className="hover:text-white transition-colors">Contatti</a>
            </div>
            
            <p className="text-sm text-zinc-500">
              © 2024 ArtistStage. Tutti i diritti riservati.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
