/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, 
  Video, 
  Instagram, 
  Mail, 
  MapPin, 
  ChevronRight, 
  Menu, 
  X,
  MessageCircle,
  ArrowUpRight,
  Monitor,
  Lock,
  Facebook,
  Twitter,
  Youtube,
  Linkedin,
  Phone,
  Play,
  ChevronDown
} from 'lucide-react';
import { portfolioData, rateCardData } from './data';
import { PortfolioItem, RateItem } from './types';
import { db, handleFirestoreError } from './firebase';
import { sheetsService } from './sheetsService';
import { collection, onSnapshot, query, orderBy, getDoc, doc } from 'firebase/firestore';
import AdminDashboard from './AdminDashboard';

export default function App() {
  const [activeTab, setActiveTab] = useState<'all' | 'photography' | 'videography'>('all');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [livePortfolio, setLivePortfolio] = useState<PortfolioItem[]>(() => {
    try {
      const cached = localStorage.getItem('portfolio_cache');
      const parsed = cached ? JSON.parse(cached) : null;
      return Array.isArray(parsed) ? parsed : portfolioData;
    } catch {
      return portfolioData;
    }
  });
  const [liveRates, setLiveRates] = useState<RateItem[]>(() => {
    try {
      const cached = localStorage.getItem('rates_cache');
      const parsed = cached ? JSON.parse(cached) : null;
      return Array.isArray(parsed) ? parsed : rateCardData;
    } catch {
      return rateCardData;
    }
  });
  const [liveProfile, setLiveProfile] = useState(() => {
    try {
      const cached = localStorage.getItem('profile_cache');
      const parsed = cached ? JSON.parse(cached) : null;
      return (parsed && typeof parsed === 'object') ? parsed : {
        bio: 'Professional videography and commercial photography based in Jakarta. Specializing in high-end product visuals and wedding cinematography.',
        experienceYear: 2020,
        cameraBody: 'Sony A7 mark III',
        lenses: ['Samyang 50mm f1.4', 'Sony 28mm f2.8'],
        heroBgUrl: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&q=80&w=2070',
        heroBgType: 'image',
        heroTitle: 'Behind Every Great Film is a Cinematography.',
        aboutImageUrl: 'https://images.unsplash.com/photo-1552168324-d612d77725e3?auto=format&fit=crop&q=80&w=1200'
      };
    } catch {
      return {
        bio: 'Professional videography and commercial photography based in Jakarta. Specializing in high-end product visuals and wedding cinematography.',
        experienceYear: 2020,
        cameraBody: 'Sony A7 mark III',
        lenses: ['Samyang 50mm f1.4', 'Sony 28mm f2.8'],
        heroBgUrl: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&q=80&w=2070',
        heroBgType: 'image',
        heroTitle: 'Behind Every Great Film is a Cinematography.',
        aboutImageUrl: 'https://images.unsplash.com/photo-1552168324-d612d77725e3?auto=format&fit=crop&q=80&w=1200'
      };
    }
  });
  const [loading, setLoading] = useState(false); // Default to false for instant load
  const [pin, setPin] = useState('');
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [storedPin, setStoredPin] = useState('1234');
  const [showPinInput, setShowPinInput] = useState(false);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [playingItemId, setPlayingItemId] = useState<string | null>(null);

  const getYoutubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|\/shorts\/)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && (match[2].length === 11 || match[2].length === 12)) ? match[2] : null;
  };

  const heroYoutubeId = getYoutubeId(liveProfile.heroBgUrl);

  // Mengambil data dari Google Sheets (Background Sync)
  const fetchData = async () => {
    try {
      const allData = await sheetsService.getAll();
      
      if (allData) {
        if (Array.isArray(allData.portfolio)) {
          const normalizedPortfolio = allData.portfolio.map((item: any, idx: number) => ({
            ...item,
            id: item.id ? String(item.id).trim() : `pld-${idx}-${Math.random().toString(36).substr(2, 4)}`
          }));
          setLivePortfolio(normalizedPortfolio);
          localStorage.setItem('portfolio_cache', JSON.stringify(normalizedPortfolio));
        }
        if (Array.isArray(allData.rates)) {
          const normalizedRates = allData.rates.map((rate: any, idx: number) => ({
            ...rate,
            id: rate.id ? String(rate.id).trim() : `rld-${idx}-${Math.random().toString(36).substr(2, 4)}`,
            features: Array.isArray(rate.features) 
              ? rate.features 
              : (typeof rate.features === 'string' && rate.features 
                  ? rate.features.split(',').map((f: string) => f.trim()).filter(Boolean) 
                  : [])
          }));
          setLiveRates(normalizedRates);
          localStorage.setItem('rates_cache', JSON.stringify(normalizedRates));
        }
        if (allData.profile && Array.isArray(allData.profile) && allData.profile.length > 0) {
          const rawProfile = allData.profile[0];
          
          setLiveProfile(prev => {
            const normalized = {
              ...prev,
              ...rawProfile,
              lenses: Array.isArray(rawProfile.lenses) 
                ? rawProfile.lenses 
                : (typeof rawProfile.lenses === 'string' && rawProfile.lenses 
                    ? rawProfile.lenses.split(',').map((l: string) => l.trim()).filter(Boolean) 
                    : (prev.lenses || []))
            };
            localStorage.setItem('profile_cache', JSON.stringify(normalized));
            return normalized;
          });
        }
      }
    } catch (error) {
      console.error("Error fetching sheets data:", error);
    }
  };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    
    // Sync stored PIN tetap di Firestore untuk keamanan
    const unsubscribePin = onSnapshot(doc(db, 'settings', 'admin'), (doc) => {
      if (doc.exists()) {
        setStoredPin(doc.data().adminPin);
      }
    }, (e) => {
      console.warn("Using default PIN 1234");
    });

    fetchData();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      unsubscribePin();
    };
  }, []);

  const portfolioList = Array.isArray(livePortfolio) ? livePortfolio : [];

  const filteredPortfolio = activeTab === 'all' 
    ? portfolioList
    : portfolioList.filter(item => item.category === activeTab);

  const handleAdminClick = () => {
    if (isPinVerified) {
      setShowAdmin(true);
    } else {
      setShowPinInput(true);
    }
  };

  const verifyPin = () => {
    if (pin === storedPin) {
      setIsPinVerified(true);
      setShowAdmin(true);
      setShowPinInput(false);
      setPin('');
    } else {
      alert("Incorrect PIN");
      setPin('');
    }
  };

  if (showPinInput) {
    return (
      <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full p-12 bg-white/5 border border-white/10 rounded-2xl text-center space-y-8"
        >
          <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto text-black shadow-[0_0_20px_rgba(245,158,11,0.2)]">
            <Lock size={24} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-serif italic text-white">Enter Admin PIN</h2>
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Authorized Personnel Only</p>
          </div>
          <input 
            type="password"
            maxLength={4}
            autoFocus
            className="w-32 bg-transparent border-b-2 border-accent/20 text-center text-4xl tracking-[0.5em] font-mono focus:border-accent outline-none py-2 transition-colors"
            value={pin}
            onChange={e => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 4);
              setPin(val);
              if (val.length === 4 && val === storedPin) {
                // Auto verify if correct
                setTimeout(() => {
                  setIsPinVerified(true);
                  setShowAdmin(true);
                  setShowPinInput(false);
                  setPin('');
                }, 100);
              }
            }}
          />
          <div className="flex gap-4">
            <button 
              onClick={() => { setShowPinInput(false); setPin(''); }}
              className="flex-1 py-4 border border-white/10 text-[10px] uppercase tracking-widest font-bold hover:bg-white/5 transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={verifyPin}
              className="flex-1 py-4 bg-accent text-black text-[10px] uppercase tracking-widest font-bold hover:brightness-110 transition-all"
            >
              Verify
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  if (showAdmin && isPinVerified) {
    return <AdminDashboard onBack={() => setShowAdmin(false)} onRefresh={fetchData} />;
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-accent selection:text-white">
      {/* Top Header Bar */}
      <div className="hidden lg:flex fixed top-0 w-full z-[60] bg-black/40 backdrop-blur-md border-b border-white/5 px-8 xl:px-24 h-24 items-center justify-between">
        <div className="flex gap-6 w-1/3">
          <a href="https://instagram.com/cinenyo" target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors" title="Instagram"><Instagram size={16} /></a>
        </div>
        
        <div className="flex flex-col items-center gap-1 w-1/3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-accent flex items-center justify-center transform rotate-45">
              <div className="w-4 h-4 bg-black -rotate-45 flex items-center justify-center">
                <div className="w-2 h-2 bg-accent rotate-45"></div>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-3xl xl:text-5xl font-display font-bold tracking-tighter text-white leading-[0.8]">CINENYO</span>
              <span className="text-[10px] xl:text-[12px] font-bold uppercase tracking-[0.5em] text-accent mt-2 ml-1">Visual Production</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 w-1/3 text-[11px] font-bold uppercase tracking-widest text-white/90">
          <a href="https://wa.me/6285718597608?text=Halo%20Cinenyo%2C%20saya%20ingin%20bertanya%20seputar%20layanan%20produksi%20visual." target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-accent transition-colors">
            <Phone size={14} className="text-accent" />
            <span>+62 857 1859 7608</span>
          </a>
          <div className="flex items-center gap-2">
            <Mail size={14} className="text-accent" />
            <span className="lowercase font-medium">cinenyomedia@gmail.com</span>
          </div>
        </div>
      </div>

      {/* Main Navigation Row */}
      <nav className={`fixed left-0 right-0 z-50 transition-all duration-500 flex items-center justify-center px-6 md:px-12 ${scrolled ? 'top-0 bg-black/95 h-20 shadow-2xl' : 'top-0 lg:top-24 h-16 bg-transparent'}`}>
        <div className="hidden lg:flex gap-8 xl:gap-12 text-[11px] xl:text-[12px] font-bold uppercase tracking-[0.3em]">
          <a href="#" className="text-accent relative after:absolute after:-bottom-2 after:left-0 after:w-full after:h-0.5 after:bg-accent nav-link">Home</a>
          <a href="#about" className="nav-link">About</a>
          <a href="#work" className="nav-link">Our Portfolio</a>
          <a href="#rates" className="nav-link">Pricing</a>
          <a href="#blog" className="nav-link">Blog</a>
          <a href="#contact" className="nav-link">Contact</a>
        </div>

        {/* Mobile Header (Visible on small screens) */}
        <div className="lg:hidden w-full flex justify-between items-center h-full">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-accent flex items-center justify-center rotate-45">
               <div className="w-4 h-4 bg-black -rotate-45 flex items-center justify-center">
                 <div className="w-2 h-2 bg-accent rotate-45"></div>
               </div>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-display font-bold leading-tight">CINENYO</span>
              <span className="text-[8px] font-bold uppercase tracking-[0.3em] text-accent">Visual Production</span>
            </div>
          </div>
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 -mr-2 text-white">
            {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 bg-black flex flex-col items-center justify-center gap-12 text-sm font-bold uppercase tracking-[0.3em]"
          >
            <a href="#" onClick={() => setIsMenuOpen(false)} className="text-accent">Home</a>
            <a href="#about" onClick={() => setIsMenuOpen(false)}>About</a>
            <a href="#work" onClick={() => setIsMenuOpen(false)}>Our Portfolio</a>
            <a href="#rates" onClick={() => setIsMenuOpen(false)}>Pricing</a>
            <a href="#contact" onClick={() => setIsMenuOpen(false)}>Contact</a>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <header className="relative h-screen w-full flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0 bg-black">
          {liveProfile.heroBgType === 'video' && liveProfile.heroBgUrl ? (
            <div className="w-full h-full relative">
              {heroYoutubeId ? (
                <iframe
                  className="w-[100vw] h-[56.25vw] min-h-[100vh] min-w-[177.77vh] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-40 scale-110"
                  src={`https://www.youtube.com/embed/${heroYoutubeId}?autoplay=1&mute=1&loop=1&playlist=${heroYoutubeId}&controls=0&showinfo=0&rel=0&modestbranding=1&enablejsapi=1`}
                  allow="autoplay; encrypted-media"
                  frameBorder="0"
                ></iframe>
              ) : (
                <video 
                  autoPlay 
                  muted 
                  loop 
                  playsInline
                  className="w-full h-full object-cover opacity-60"
                  key={liveProfile.heroBgUrl}
                >
                  <source src={liveProfile.heroBgUrl} type="video/mp4" />
                </video>
              )}
            </div>
          ) : (
            <img 
              src={liveProfile.heroBgUrl || "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&q=80&w=2070"} 
              className="w-full h-full object-cover object-center opacity-60" 
              referrerPolicy="no-referrer"
              alt="Hero Background"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40" />
        </div>

        <div className="relative z-10 px-6 sm:px-12 md:px-24 w-full">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl space-y-4 md:space-y-6"
          >
            <div className="flex items-center gap-2 md:gap-4">
              <div className="w-8 md:w-12 h-[2px] bg-accent"></div>
              <span className="text-accent text-[9px] md:text-sm font-bold uppercase tracking-[0.3em] md:tracking-[0.4em]">One Scene At A Time - The Movie Maker Director.</span>
            </div>
            <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-display font-bold leading-[0.95] md:leading-[0.9] text-white tracking-tight whitespace-pre-line">
              {liveProfile.heroTitle || 'Behind Every Great \n Film is a Cinematography.'}
            </h1>
            <p className="text-white/60 text-sm md:text-base lg:text-lg max-w-xl leading-relaxed font-medium">
              {liveProfile.bio || 'Crafting unforgettable stories bringing their creative vision to life on the big screen - the movie maker director.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 md:gap-6 pt-4 md:pt-6">
              <a href="#contact" className="px-8 md:px-10 py-4 md:py-5 bg-accent text-white font-bold uppercase tracking-[0.2em] text-[10px] md:text-[11px] hover:brightness-110 transition-all text-center">
                Get Started
              </a>
              <a 
                href="https://order-form-gamma-fawn.vercel.app/#" 
                target="_blank" 
                rel="noopener noreferrer"
                className="px-8 md:px-10 py-4 md:py-5 bg-white/5 backdrop-blur-md border border-white/10 text-white font-bold uppercase tracking-[0.2em] text-[10px] md:text-[11px] hover:bg-white/10 transition-all text-center flex items-center justify-center gap-2"
              >
                Order Sekarang <ArrowUpRight size={14} />
              </a>
              <button 
                onClick={() => {
                  if (heroYoutubeId) setActiveVideo(heroYoutubeId);
                }}
                className="flex items-center justify-center gap-3 group text-white hover:text-accent transition-colors"
              >
                <div className="w-10 h-10 md:w-12 md:h-12 border-2 border-white/20 rounded-full flex items-center justify-center group-hover:border-accent transition-all">
                  <Play size={14} md:size={16} fill="currentColor" className="ml-0.5 md:ml-1" />
                </div>
                <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.2em]">Watch Showreel</span>
              </button>
            </div>
          </motion.div>
        </div>
        
        {/* Bottom Scroll Indicator */}
        <div className="absolute bottom-10 left-24 hidden md:flex items-center gap-4 text-[10px] font-bold uppercase tracking-[0.3em] text-white/40">
          <div className="flex flex-col gap-2">
            <div className="w-[1px] h-12 bg-white/20 relative">
              <div className="absolute top-0 left-0 w-full h-1/2 bg-accent animate-bounce"></div>
            </div>
          </div>
          <span>Scroll To Explore</span>
        </div>
      </header>

      {/* Main Content Sections */}
      <main className="bg-black">
        <section id="about" className="py-24 md:py-40 px-6 sm:px-12 md:px-24 bg-zinc-900/20">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-16 md:gap-24 items-center">
            <div className="w-full lg:w-1/2 relative">
               <div className="aspect-[4/5] bg-zinc-800 rounded-2xl overflow-hidden relative z-10">
                  <img 
                    src={liveProfile.aboutImageUrl || "https://images.unsplash.com/photo-1552168324-d612d77725e3?auto=format&fit=crop&q=80&w=1200"} 
                    className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700" 
                    alt="Cinematographer"
                    referrerPolicy="no-referrer"
                  />
               </div>
               <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-accent/10 rounded-full blur-3xl -z-0"></div>
               <div className="absolute -top-10 -left-10 w-40 h-40 border border-accent/20 rounded-2xl -z-0"></div>
            </div>

            <div className="w-full lg:w-1/2 space-y-10 md:space-y-12">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-[1px] bg-accent"></span>
                  <span className="text-accent text-[10px] md:text-[12px] font-bold uppercase tracking-[0.4em]">The Director</span>
                </div>
                <h2 className="text-4xl md:text-6xl font-display font-medium text-white italic leading-tight">Mastering The Art Of <br /> Cinematic Storytelling</h2>
                <p className="text-zinc-400 text-sm md:text-base leading-relaxed max-w-xl">
                  {liveProfile.bio}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 md:gap-12">
                <div className="space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-accent/60">Experience</p>
                  <p className="text-2xl font-display font-bold text-white">{new Date().getFullYear() - (liveProfile.experienceYear || 2020)} Years Active</p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest leading-none">Crafting narratives since {liveProfile.experienceYear}</p>
                </div>
                <div className="space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-accent/60">Primary Gear</p>
                  <p className="text-2xl font-display font-bold text-white">{liveProfile.cameraBody}</p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {(Array.isArray(liveProfile.lenses) ? liveProfile.lenses : []).map((lens: string) => (
                      <span key={lens} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[9px] uppercase tracking-wider font-bold text-zinc-400">{lens}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <a href="#work" className="group inline-flex items-center gap-4 text-[10px] font-bold uppercase tracking-[0.4em] text-white hover:text-accent transition-colors">
                  Explore Filmography <ArrowUpRight size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Portfolio Section */}
        <section id="work" className="py-20 md:py-32 px-6 md:px-12 lg:px-24 space-y-12 md:space-y-20">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-8 md:gap-10">
            <div className="space-y-3 md:space-y-4">
              <div className="flex items-center gap-2 md:gap-3">
                <span className="w-6 md:w-8 h-[1px] bg-accent"></span>
                <span className="text-accent text-[9px] md:text-[11px] font-bold uppercase tracking-[0.3em] md:tracking-[0.4em]">Our Portfolio</span>
              </div>
              <h2 className="text-3xl md:text-5xl lg:text-6xl font-display font-medium text-white italic"></h2>
            </div>
            
            <div className="flex flex-wrap gap-2 p-1 bg-white/5 rounded-2xl md:rounded-full border border-white/10 backdrop-blur-sm">
              {(['all', 'photography', 'videography'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 md:px-8 py-2 md:py-3 rounded-xl md:rounded-full text-[9px] md:text-[10px] uppercase tracking-[0.2em] font-bold transition-all ${
                    activeTab === tab ? 'bg-accent text-white shadow-lg' : 'text-zinc-500 hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
            <AnimatePresence mode="popLayout">
              {filteredPortfolio.map((item, index) => (
                <motion.div
                  layout
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className={`group relative h-[400px] md:h-[500px] bg-zinc-900 overflow-hidden ${item.videoUrl ? 'cursor-pointer' : ''}`}
                  onClick={() => {
                    if (item.videoUrl && playingItemId !== item.id) {
                      const ytId = getYoutubeId(item.videoUrl);
                      if (ytId) setPlayingItemId(item.id);
                    }
                  }}
                >
                  <img 
                    src={item.imageUrl} 
                    alt={item.title} 
                    className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80" />
                  <div className="absolute inset-0 bg-accent/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  {item.videoUrl && playingItemId !== item.id && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-accent text-black rounded-full flex items-center justify-center shadow-2xl scale-90 group-hover:scale-100 transition-all duration-500 z-40">
                      <Play size={24} fill="currentColor" className="ml-1" />
                    </div>
                  )}

                  {playingItemId === item.id && item.videoUrl ? (
                    <div className="absolute inset-0 z-50 bg-black">
                      <iframe
                        className="w-full h-full"
                        src={`https://www.youtube.com/embed/${getYoutubeId(item.videoUrl)}?autoplay=1&rel=0&modestbranding=1`}
                        title={item.title}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      ></iframe>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setPlayingItemId(null);
                        }}
                        className="absolute top-4 right-4 bg-black/60 text-white p-2 rounded-full hover:bg-accent hover:text-black transition-colors z-[60]"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="absolute bottom-6 md:bottom-10 left-6 md:left-10 right-6 md:right-10 space-y-2 md:space-y-3 transform translate-y-2 md:translate-y-4 group-hover:translate-y-0 transition-transform duration-500 z-30 pointer-events-none">
                        <div className="flex items-center gap-2">
                          <span className="w-3 md:w-4 h-[1px] bg-accent"></span>
                          <p className="text-[9px] md:text-[10px] uppercase tracking-widest font-bold text-accent">{item.type || item.category}</p>
                        </div>
                        <h3 className="text-xl md:text-2xl lg:text-3xl font-display font-bold text-white uppercase leading-tight">{item.title}</h3>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-700 flex items-center gap-2 md:gap-3 text-[9px] md:text-[10px] font-bold uppercase tracking-widest pt-1 md:pt-2">
                           {item.videoUrl ? 'Watch Highlight' : 'View Project'} <ArrowUpRight size={12} md:size={14} />
                        </div>
                      </div>
                    </>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </section>

        {/* Rates Section */}
        <section id="rates" className="py-20 md:py-32 px-6 md:px-12 lg:px-24 bg-zinc-900/40">
          <div className="max-w-7xl mx-auto space-y-12 md:space-y-20">
            <div className="text-center space-y-4 md:space-y-6">
              <div className="flex items-center justify-center gap-2 md:gap-3">
                <span className="w-6 md:w-8 h-[1px] bg-accent"></span>
                <span className="text-accent text-[9px] md:text-[11px] font-bold uppercase tracking-[0.3em] md:tracking-[0.4em]">Pricing Plan</span>
                <span className="w-6 md:w-8 h-[1px] bg-accent"></span>
              </div>
              <h2 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-bold text-white uppercase tracking-tighter">Budget-Friendly Quotes</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border border-white/10 rounded-xl overflow-hidden">
              {liveRates.map((rate, index) => (
                <div key={rate.id} className={`p-8 sm:p-12 lg:p-16 space-y-8 md:space-y-12 transition-all duration-500 hover:bg-zinc-800/50 ${index !== liveRates.length - 1 ? 'border-b lg:border-b-0 lg:border-r border-white/10' : ''} ${index === 1 ? 'bg-zinc-900 shadow-2xl z-10' : ''}`}>
                  <div className="space-y-3 md:space-y-4">
                    <p className="text-accent text-[9px] md:text-[10px] font-bold uppercase tracking-[0.3em]">{rate.category}</p>
                    <h3 className="text-2xl md:text-3xl font-display font-bold text-white uppercase tracking-tight">{rate.title}</h3>
                  </div>
                  
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl md:text-4xl font-display font-bold text-white">{rate.price}</span>
                    <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">/ Session</span>
                  </div>

                  <ul className="space-y-4 md:space-y-5 text-zinc-400 text-[10px] md:text-[11px] font-medium uppercase tracking-widest leading-none">
                    {(Array.isArray(rate.features) ? rate.features : []).map((f, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <ArrowUpRight size={14} className="text-accent shrink-0 mt-[-2px]" />
                        <span className="flex-1">{f}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="pt-2 md:pt-4">
                    <a 
                      href="https://order-form-gamma-fawn.vercel.app/#" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-full py-4 bg-accent/10 border border-accent/20 text-accent text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] rounded flex items-center justify-center gap-2 hover:bg-accent hover:text-black transition-all duration-300"
                    >
                      Pesan Sekarang <ArrowUpRight size={14} />
                    </a>
                  </div>

                  <a 
                    href={`https://wa.me/6285718597608?text=Halo%20Cinenyo%2C%20saya%20tertarik%20dengan%20paket%20${encodeURIComponent(rate.title)}.`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-4 text-[10px] md:text-[11px] font-bold uppercase tracking-[0.3em] text-white hover:text-accent transition-colors pt-4 md:pt-8"
                  >
                    Choose Plan <X size={12} className="rotate-45 group-hover:rotate-90 transition-transform" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact Mini */}
        <section id="contact" className="py-24 md:py-40 px-6 sm:px-12 md:px-24">
          <div className="max-w-5xl mx-auto text-center space-y-8 md:space-y-12">
            <h2 className="text-4xl sm:text-6xl md:text-8xl lg:text-9xl font-display font-bold text-white uppercase leading-[0.9] md:leading-[0.85] tracking-tighter">
              Let's Create <br /> Something <span className="text-accent">Epic.</span>
            </h2>
            <div className="flex flex-col md:flex-row justify-center items-center gap-6 md:gap-12 pt-6 md:pt-10">
              <a href="https://wa.me/6285718597608?text=Halo%20Cinenyo%2C%20saya%20ingin%20bertanya%20seputar%20layanan%20produksi%20visual." target="_blank" rel="noopener noreferrer" className="group flex flex-col items-center gap-2 md:gap-4">
                <span className="text-[8px] md:text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500 group-hover:text-accent transition-colors">Whatsapp Us</span>
                <span className="text-lg md:text-2xl font-display font-bold">+62 857 1859 7608</span>
              </a>
              <div className="w-[1px] h-8 md:h-12 bg-white/10 hidden md:block"></div>
              <a href="mailto:cinenyomedia@gmail.com" className="group flex flex-col items-center gap-2 md:gap-4">
                <span className="text-[8px] md:text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500 group-hover:text-accent transition-colors">Email Support</span>
                <span className="text-lg md:text-2xl font-display font-bold lowercase">cinenyomedia@gmail.com</span>
              </a>
              <div className="w-[1px] h-8 md:h-12 bg-white/10 hidden md:block"></div>
              <a href="https://instagram.com/cinenyo" target="_blank" rel="noopener noreferrer" className="group flex flex-col items-center gap-2 md:gap-4">
                <span className="text-[8px] md:text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500 group-hover:text-accent transition-colors">Follow Us</span>
                <span className="text-lg md:text-2xl font-display font-bold">@cinenyo</span>
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-black py-12 md:py-20 px-6 md:px-12 border-t border-white/5">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-zinc-900 border border-white/10 flex items-center justify-center rotate-45">
              <div className="w-3 h-3 md:w-4 md:h-4 bg-accent -rotate-45"></div>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl md:text-4xl font-display font-bold text-white leading-none tracking-tight">CINENYO</span>
              <span className="text-[9px] md:text-[11px] font-bold uppercase tracking-[0.4em] text-accent mt-2 ml-0.5">Visual Production</span>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-6 md:gap-12 text-[8px] md:text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">
            <a href="#" className="hover:text-white transition-colors">Home</a>
            <a href="#about" className="hover:text-white transition-colors">About</a>
            <a href="#work" className="hover:text-white transition-colors">Portfolio</a>
            <a href="#rates" className="hover:text-white transition-colors">Pricing</a>
            <a href="#blog" className="hover:text-white transition-colors">Blog</a>
            <a href="#contact" className="hover:text-white transition-colors">Contact</a>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
            <button onClick={handleAdminClick} className="text-[8px] md:text-[10px] text-zinc-700 hover:text-accent transition-colors flex items-center gap-2 font-bold uppercase tracking-widest">
              <Lock size={12} /> Systems
            </button>
            <span className="text-[8px] md:text-[10px] text-zinc-700 font-bold uppercase tracking-widest">© 2026 CINENYO Visual Production</span>
          </div>
        </div>
      </footer>

      {/* Video Modal */}
      <AnimatePresence>
        {activeVideo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-12"
          >
            <button 
              onClick={() => setActiveVideo(null)}
              className="absolute top-8 right-8 text-white hover:text-accent p-2 transition-colors"
            >
              <X size={32} />
            </button>
            <div className="w-full max-w-6xl aspect-video bg-black shadow-2xl rounded-2xl overflow-hidden border border-white/10">
              <iframe
                className="w-full h-full"
                src={`https://www.youtube.com/embed/${activeVideo}?autoplay=1`}
                title="Video Showcase"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              ></iframe>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 z-[60] flex flex-col items-end gap-3 pointer-events-none">
        <motion.a
          href="https://order-form-gamma-fawn.vercel.app/#"
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="pointer-events-auto flex items-center gap-3 px-4 py-3 bg-accent text-black rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all group font-bold"
        >
          <span className="text-[10px] font-bold uppercase tracking-widest overflow-hidden block max-w-0 group-hover:max-w-xs transition-all duration-500 whitespace-nowrap">Isi Form Order</span>
          <Monitor size={20} />
        </motion.a>

        <motion.a
          href="https://wa.me/6285718597608?text=Halo%20Cinenyo%2C%20saya%20ingin%20bertanya%20seputar%20layanan%20produksi%20visual."
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="pointer-events-auto flex items-center gap-3 px-4 py-3 bg-[#25D366] text-white rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all group"
        >
          <span className="text-[10px] font-bold uppercase tracking-widest overflow-hidden block max-w-0 group-hover:max-w-xs transition-all duration-500 whitespace-nowrap">WhatsApp</span>
          <MessageCircle size={20} fill="currentColor" />
        </motion.a>

        <motion.a
          href="https://instagram.com/cinenyo"
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
          className="pointer-events-auto flex items-center gap-3 px-4 py-3 bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all group"
        >
          <span className="text-[10px] font-bold uppercase tracking-widest overflow-hidden block max-w-0 group-hover:max-w-xs transition-all duration-500 whitespace-nowrap">Instagram</span>
          <Instagram size={20} />
        </motion.a>
      </div>
    </div>
  );
}

