import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError } from './firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { sheetsService } from './sheetsService';
import { PortfolioItem } from './types';
import { Trash2, Edit3, Plus, LogOut, ArrowLeft, Image as ImageIcon, Video, Save, X, Settings as SettingsIcon, Key, DollarSign, ListPlus, User as UserIcon, Camera, Play } from 'lucide-react';
import { motion } from 'motion/react';

export default function AdminDashboard({ onBack, onRefresh }: { onBack: () => void, onRefresh?: () => void }) {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'portfolio' | 'profile'>('portfolio');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Portfolio Form State
  const [isEditingPortfolio, setIsEditingPortfolio] = useState<string | null>(null);
  const [showPortfolioForm, setShowPortfolioForm] = useState(false);
  const [portfolioFormData, setPortfolioFormData] = useState({
    title: '',
    category: 'photography' as 'photography' | 'videography',
    type: '',
    imageUrl: '',
    videoUrl: '',
    description: ''
  });

  // Profile Form State
  const [profileFormData, setProfileFormData] = useState({
    bio: 'Professional videography and commercial photography based in Jakarta. Specializing in high-end product visuals and wedding cinematography.',
    experienceYear: 2020,
    cameraBody: 'Sony A7 mark III',
    lenses: ['Samyang 50mm f1.4', 'Sony 28mm f2.8'],
    heroBgUrl: '',
    heroBgType: 'image' as 'image' | 'video',
    heroTitle: 'Behind Every Great Film is a Cinematography.',
    aboutImageUrl: 'https://images.unsplash.com/photo-1552168324-d612d77725e3?auto=format&fit=crop&q=80&w=1200'
  });

  const [showSettings, setShowSettings] = useState(false);
  const [newPin, setNewPin] = useState('');
  
  const getYoutubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|\/shorts\/)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && (match[2].length === 11 || match[2].length === 12)) ? match[2] : null;
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const allData = await sheetsService.getAll();

      if (allData) {
        if (Array.isArray(allData.portfolio)) {
          // Normalisasi portfolio: Gunakan ID yang ada, atau buat cadangan jika benar-benar kosong
          const normalizedPortfolio = allData.portfolio.map((item: any, idx: number) => ({
            ...item,
            id: item.id ? String(item.id).trim() : `pld-${idx}-${Math.random().toString(36).substr(2, 4)}`
          }));
          setItems(normalizedPortfolio);
          localStorage.setItem('portfolio_cache', JSON.stringify(normalizedPortfolio));
        }
        
        // Handle Profile Data
        if (allData.profile && Array.isArray(allData.profile) && allData.profile.length > 0) {
          const rawProfile = allData.profile[0];
          
          // Merge with current state or defaults to prevent losing data
          const mergedProfile = {
            ...profileFormData,
            ...rawProfile,
            // Deeply ensure lenses is an array
            lenses: Array.isArray(rawProfile.lenses) 
              ? rawProfile.lenses 
              : (typeof rawProfile.lenses === 'string' && rawProfile.lenses 
                  ? rawProfile.lenses.split(',').map((l: string) => l.trim()).filter(Boolean) 
                  : (profileFormData.lenses || []))
          };
          
          setProfileFormData(mergedProfile);
          localStorage.setItem('profile_cache', JSON.stringify(mergedProfile));
        }
      } else {
        setErrorMsg("Gagal mengambil data kilat. Pastikan Deployment Apps Script sudah diatur ke 'Anyone'.");
      }

      setLoading(false);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Error fetching sheets data:", error);
      setErrorMsg("Koneksi gagal. Cek koneksi internet atau URL Script.");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // PIN tetap di Firestore
    const unsubscribePin = onSnapshot(doc(db, 'settings', 'admin'), (doc) => {
      // PIN logic handled differently if needed, but here it's just for settings
    });

    return () => {
      unsubscribePin();
    };
  }, []);

  // Handlers
  const handlePortfolioSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    try {
      setIsSaving(true);
      if (isEditingPortfolio) {
        await sheetsService.update('portfolio', isEditingPortfolio, portfolioFormData);
        setIsEditingPortfolio(null);
      } else {
        const id = Date.now().toString(); // Simple ID for Sheets
        await sheetsService.create('portfolio', { ...portfolioFormData, id, createdAt: new Date().toISOString() });
      }
      resetPortfolioForm();
      alert("Karya berhasil disimpan! (Mungkin perlu beberapa detik untuk sinkronisasi)");
      fetchData(); // Refresh data
    } catch (error) { 
      handleFirestoreError(error); 
    } finally {
      setIsSaving(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    
    try {
      setIsSaving(true);
      
      const payload = {
        ...profileFormData,
        id: 'main', 
        lenses: Array.isArray(profileFormData.lenses) ? profileFormData.lenses.join(', ') : profileFormData.lenses,
        updatedAt: new Date().toISOString()
      };

      console.log("[Profile] Saving background:", payload.heroBgUrl, payload.heroBgType);
      
      // Kirim update ke Google Sheets
      await sheetsService.update('profile', 'main', payload);
      
      // Kirim juga sebagai 'create' ke ID 'main' sebagai backup jika 'update' tidak menemukan baris
      try {
        await sheetsService.create('profile', { 
            ...payload, 
            id: 'main', // Pastikan ID konsisten
            action: 'create' 
        });
      } catch (e) {
        console.warn("Backup creation skipped");
      }

      // Berikan feedback instan dan perbarui cache lokal (gunakan array untuk konsistensi fetch)
      localStorage.setItem('profile_cache', JSON.stringify(profileFormData));
      alert("Halaman berhasil diperbarui! (Background & Profil)");
      
      // Sinkronisasi ulang data setelah beberapa detik
      setTimeout(() => {
        fetchData();
        if (onRefresh) onRefresh();
      }, 2000);
    } catch (error) { 
      console.error("Save error:", error);
      alert("Gagal menyimpan profil. Periksa koneksi internet.");
    } finally {
      setIsSaving(false);
    }
  };

  const resetPortfolioForm = () => {
    setPortfolioFormData({ title: '', category: 'photography', type: '', imageUrl: '', videoUrl: '', description: '' });
    setShowPortfolioForm(false);
    setIsEditingPortfolio(null);
  };

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length < 4) { alert("PIN minimal 4 angka"); return; }
    try {
      await setDoc(doc(db, 'settings', 'admin'), { adminPin: newPin }, { merge: true });
      alert("PIN berhasil diperbarui");
      setNewPin('');
      setShowSettings(false);
    } catch (error) { handleFirestoreError(error); }
  };

  const handleDelete = async (collectionName: 'portfolio', id: string) => {
    if (!id) {
      alert("ID item tidak valid. Tidak bisa menghapus.");
      return;
    }
    const msg = 'karya';
    if (window.confirm(`Hapus ${msg} ini secara permanen?`)) {
      try { 
        setIsSaving(true);
        console.log(`[Admin] Menghapus ${collectionName} ID:`, id);
        
        // Kirim request hapus
        await sheetsService.delete(collectionName, id); 
        
        // Optimistic UI Update: Langsung hapus dari state
        setItems(prev => prev.filter(item => item.id !== id));
        
        alert(`${msg} berhasil dihapus! (Perubahan akan sinkron penuh dalam beberapa detik)`);
        
        // Sedikit delay sebelum fetch ulang agar Google Script sempat memproses
        setTimeout(() => {
          fetchData(); 
        }, 1500);
      } catch (error) { 
        console.error("Delete error:", error);
        alert("Gagal menghapus item. Silakan coba lagi atau cek koneksi.");
      } finally {
        setIsSaving(false);
      }
    }
  };

  if (loading) return <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center text-accent">Memuat...</div>;

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-slate-200">
      <nav className="h-auto md:h-20 border-b border-white/5 flex flex-col md:flex-row items-center justify-between px-6 md:px-12 py-4 md:py-0 bg-black/50 backdrop-blur-md sticky top-0 z-50 gap-4">
        <div className="flex items-center justify-between w-full md:w-auto gap-4 md:gap-6">
          <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors shrink-0">
            <ArrowLeft size={20} />
          </button>
          <div className="flex bg-zinc-900 rounded-lg p-1 border border-white/5 overflow-x-auto no-scrollbar">
            {[
              { id: 'portfolio', label: 'Karya' },
              { id: 'profile', label: 'Profil' }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveView(tab.id as any)}
                className={`px-3 md:px-4 py-1.5 rounded text-[9px] md:text-[10px] uppercase font-bold tracking-widest transition-all whitespace-nowrap ${activeView === tab.id ? 'bg-accent text-white' : 'text-slate-500 hover:text-white'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between w-full md:w-auto gap-4">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-full transition-colors ${showSettings ? 'bg-accent text-white' : 'hover:bg-white/10 text-slate-400'}`}
          >
            <SettingsIcon size={20} />
          </button>
          <button onClick={onBack} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-red-900/40 transition-colors rounded text-[10px] uppercase font-bold tracking-widest">
            <LogOut size={14} /> <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 md:p-12">
        {errorMsg && (
          <div className="mb-8 p-4 bg-red-600/20 border border-red-600/50 rounded-lg text-red-200 text-sm flex justify-between items-center">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="opacity-50 hover:opacity-100">X</button>
          </div>
        )}
        
        {showSettings && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mb-12 p-8 bg-accent/5 border border-accent/20 rounded-xl">
            <h3 className="text-lg uppercase tracking-widest font-bold text-accent mb-6 flex items-center gap-2"><Key size={18} /> Ganti PIN Admin</h3>
            <form onSubmit={handleUpdatePin} className="flex flex-col md:flex-row gap-4">
              <input type="password" placeholder="PIN Baru (4 angka)" className="bg-black/30 border border-white/10 p-3 rounded focus:border-accent outline-none font-mono" value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))} />
              <button type="submit" className="px-8 py-3 bg-accent text-black text-[10px] uppercase tracking-widest font-bold hover:brightness-110 transition-all text-white">Update PIN</button>
            </form>
          </motion.div>
        )}

        {activeView === 'portfolio' && (
          <>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <h2 className="text-2xl md:text-3xl font-display font-medium text-white italic underline decoration-accent underline-offset-8">Kelola Portfolio</h2>
              {!showPortfolioForm && (
                <button onClick={() => setShowPortfolioForm(true)} className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-accent text-white text-[10px] uppercase font-bold tracking-widest hover:brightness-110 transition-all rounded">
                  <Plus size={16} /> Tambah Karya
                </button>
              )}
            </div>

            {showPortfolioForm && (
              <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-12 p-6 md:p-8 bg-zinc-900/50 border border-white/10 rounded-xl shadow-2xl">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-lg uppercase tracking-widest font-bold text-accent">{isEditingPortfolio ? 'Edit Karya' : 'Tambah Karya Baru'}</h3>
                  <button onClick={resetPortfolioForm} className="text-slate-500 hover:text-white"><X size={20} /></button>
                </div>
                <form onSubmit={handlePortfolioSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-slate-500">Judul Karya</label>
                      <input required placeholder="Contoh: Wedding Jakarta" className="w-full bg-black/30 border border-white/10 p-3 rounded outline-none focus:border-accent" value={portfolioFormData.title} onChange={e => setPortfolioFormData({...portfolioFormData, title: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-slate-500">Kategori</label>
                        <select className="w-full bg-black/30 border border-white/10 p-3 rounded outline-none focus:border-accent" value={portfolioFormData.category} onChange={e => setPortfolioFormData({...portfolioFormData, category: e.target.value as any})}>
                        <option value="photography">Photography</option>
                        <option value="videography">Videography</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-slate-500">Tipe / Layanan</label>
                        <input required placeholder="Contoh: Pre-wedding" className="w-full bg-black/30 border border-white/10 p-3 rounded outline-none focus:border-accent" value={portfolioFormData.type} onChange={e => setPortfolioFormData({...portfolioFormData, type: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-slate-500">Deskripsi Singkat</label>
                        <textarea placeholder="Ceritakan tentang karya ini..." rows={2} className="w-full bg-black/30 border border-white/10 p-3 rounded outline-none focus:border-accent text-sm" value={portfolioFormData.description} onChange={e => setPortfolioFormData({...portfolioFormData, description: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-slate-500">Link Gambar / Thumbnail (URL)</label>
                        <input required placeholder="https://..." className="w-full bg-black/30 border border-white/10 p-3 rounded outline-none focus:border-accent" value={portfolioFormData.imageUrl} onChange={e => setPortfolioFormData({...portfolioFormData, imageUrl: e.target.value})} />
                        {portfolioFormData.imageUrl && (
                            <div className="mt-2 text-[9px] uppercase text-zinc-500 flex flex-col gap-2">
                                <span>Preview Thumbnail:</span>
                                <img src={portfolioFormData.imageUrl} className="w-full h-32 object-cover rounded border border-white/10" alt="Preview" referrerPolicy="no-referrer" />
                            </div>
                        )}
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-slate-500">Link Video YouTube (Opsional)</label>
                        <input 
                          placeholder="https://www.youtube.com/watch?v=... atau https://youtu.be/..." 
                          className="w-full bg-black/30 border border-white/10 p-3 rounded outline-none focus:border-accent" 
                          value={portfolioFormData.videoUrl} 
                          onChange={e => setPortfolioFormData({...portfolioFormData, videoUrl: e.target.value})} 
                        />
                        <p className="text-[8px] text-slate-600 uppercase tracking-widest mt-1">Tempel link video YouTube untuk menampilkan tombol play di portfolio.</p>
                        
                        {portfolioFormData.videoUrl && (portfolioFormData.videoUrl.includes('youtube.com') || portfolioFormData.videoUrl.includes('youtu.be')) && (
                          <div className="mt-4 p-4 bg-black/40 border border-white/5 rounded-xl">
                            <div className="flex items-center gap-3 text-accent mb-3">
                              <Video size={16} />
                              <span className="text-[10px] font-bold uppercase tracking-widest">YouTube Detected</span>
                            </div>
                            <div className="aspect-video bg-black rounded-lg overflow-hidden border border-white/10">
                              <iframe
                                className="w-full h-full"
                                src={`https://www.youtube.com/embed/${getYoutubeId(portfolioFormData.videoUrl)}`}
                                title="YouTube Preview"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              ></iframe>
                            </div>
                          </div>
                        )}
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={resetPortfolioForm} className="px-6 py-3 border border-white/10 text-[10px] uppercase tracking-widest font-bold">Batal</button>
                        <button type="submit" disabled={isSaving} className={`px-12 py-3 bg-accent text-black font-bold text-[10px] uppercase tracking-widest ${isSaving ? 'opacity-50 cursor-not-allowed' : 'hover:brightness-110 transition-all'}`}>
                          {isSaving ? 'Memproses...' : (isEditingPortfolio ? 'Simpan Perubahan' : 'Tambah Karya')}
                        </button>
                    </div>
                  </div>
                </form>
              </motion.div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {(Array.isArray(items) ? items : []).map(item => (
                <div key={item.id} className="bg-zinc-900 border border-white/5 rounded-xl overflow-hidden group shadow-lg">
                  <div className="relative">
                    <img src={item.imageUrl} className="w-full h-48 object-cover opacity-60 group-hover:opacity-100 transition-all" referrerPolicy="no-referrer" />
                    {item.videoUrl && (
                      <div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-none">
                        <div className="w-8 h-8 bg-accent/80 backdrop-blur-md rounded-full flex items-center justify-center text-black shadow-lg">
                          <Play size={16} fill="currentColor" />
                        </div>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-3">
                      <button 
                        onClick={() => { setIsEditingPortfolio(item.id); setPortfolioFormData({ ...item, videoUrl: item.videoUrl || '', description: item.description || '' }); setShowPortfolioForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
                        className="p-3 bg-accent text-black rounded-full hover:scale-110 transition-transform shadow-xl"
                        title="Edit Karya"
                      >
                        <Edit3 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete('portfolio', item.id)} 
                        disabled={isSaving}
                        className={`p-3 bg-red-600 text-white rounded-full hover:scale-110 transition-transform shadow-xl ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title="Hapus Karya"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded text-[8px] uppercase tracking-widest text-accent font-bold">
                        {item.category}
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-[9px] uppercase text-zinc-500 font-bold mb-1">{item.type}</p>
                    <h4 className="font-bold text-white text-sm truncate">{item.title}</h4>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {activeView === 'profile' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-4xl mx-auto space-y-12">
            <div className="flex items-center justify-between border-b border-white/10 pb-6">
              <div>
                <h2 className="text-3xl font-display font-medium text-white italic">Pengaturan Profil</h2>
                <p className="text-[10px] uppercase tracking-widest text-slate-500 mt-2">Kelola identitas visual dan detail teknis Anda</p>
              </div>
              <Save size={24} className="text-accent/20" />
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-12 pb-24">
              {/* Section: Hero Background */}
              <div className="bg-zinc-900/40 p-8 rounded-2xl border border-white/5 space-y-8">
                <div className="flex items-center gap-3">
                  <ImageIcon size={18} className="text-accent" />
                  <h3 className="text-xs uppercase font-bold tracking-[0.2em] text-white">Visual Utama (Hero)</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-slate-500">Tipe Konten</label>
                      <div className="flex p-1 bg-black/40 rounded-lg border border-white/5">
                        {['image', 'video'].map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setProfileFormData({...profileFormData, heroBgType: type as any})}
                            className={`flex-1 py-2 rounded text-[10px] font-bold uppercase tracking-widest transition-all ${profileFormData.heroBgType === type ? 'bg-accent text-black' : 'text-slate-500 hover:text-white'}`}
                          >
                            {type === 'image' ? 'Foto' : 'Video'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] uppercase font-bold text-slate-500">URL Background</label>
                       <input 
                        placeholder="Tempel link foto/video di sini..."
                        className="w-full bg-black/40 border border-white/10 p-4 rounded-xl outline-none focus:border-accent text-sm font-mono" 
                        value={profileFormData.heroBgUrl} 
                        onChange={e => setProfileFormData({...profileFormData, heroBgUrl: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                     <label className="text-[10px] uppercase font-bold text-slate-500">Live Preview</label>
                     <div className="aspect-video bg-black/60 rounded-xl overflow-hidden border border-white/10 relative group">
                        {profileFormData.heroBgUrl ? (
                          profileFormData.heroBgType === 'video' ? (
                            <video key={profileFormData.heroBgUrl} autoPlay muted loop className="w-full h-full object-cover opacity-60">
                              <source src={profileFormData.heroBgUrl} type="video/mp4" />
                            </video>
                          ) : (
                            <img src={profileFormData.heroBgUrl} className="w-full h-full object-cover opacity-60" referrerPolicy="no-referrer" alt="Hero Preview" />
                          )
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-zinc-700">
                             <ImageIcon size={32} strokeWidth={1} />
                             <span className="text-[9px] uppercase tracking-widest mt-2">No URL Provided</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-4">
                           <span className="text-[9px] uppercase font-bold text-white/40">Viewport Preview</span>
                        </div>
                     </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Headline Halaman Utama</label>
                  <textarea 
                    rows={3}
                    placeholder="Gunakan \n untuk baris baru..."
                    className="w-full bg-black/40 border border-white/10 p-4 rounded-xl outline-none focus:border-accent text-lg font-display font-medium text-white placeholder:text-white/10" 
                    value={profileFormData.heroTitle} 
                    onChange={e => setProfileFormData({...profileFormData, heroTitle: e.target.value})}
                  />
                  <p className="text-[8px] text-slate-600 uppercase tracking-widest leading-relaxed">Teks yang akan muncul di atas background utama. Gunakan kalimat yang dramatis.</p>
                </div>
              </div>

              {/* Section: Professional Bio */}
              <div className="bg-zinc-900/40 p-8 rounded-2xl border border-white/5 space-y-8">
                <div className="flex items-center gap-3">
                  <UserIcon size={18} className="text-accent" />
                  <h3 className="text-xs uppercase font-bold tracking-[0.2em] text-white">Narasi & Biografi</h3>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-slate-500">Tentang Saya (Bio)</label>
                    <textarea 
                      rows={5}
                      className="w-full bg-black/40 border border-white/10 p-4 rounded-xl outline-none focus:border-accent text-sm leading-relaxed" 
                      value={profileFormData.bio} 
                      onChange={e => setProfileFormData({...profileFormData, bio: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-slate-500">Tahun Mulai Karir</label>
                      <input 
                        type="number"
                        className="w-full bg-black/40 border border-white/10 p-4 rounded-xl outline-none focus:border-accent text-xl font-bold font-display" 
                        value={profileFormData.experienceYear} 
                        onChange={e => setProfileFormData({...profileFormData, experienceYear: parseInt(e.target.value)})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-slate-500">URL Foto Profil (About Section)</label>
                      <input 
                        className="w-full bg-black/40 border border-white/10 p-4 rounded-xl outline-none focus:border-accent text-sm font-mono" 
                        value={profileFormData.aboutImageUrl} 
                        onChange={e => setProfileFormData({...profileFormData, aboutImageUrl: e.target.value})}
                        placeholder="Link foto portrait kamu..."
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section: Gear & Lenses */}
              <div className="bg-zinc-900/40 p-8 rounded-2xl border border-white/5 space-y-8">
                <div className="flex items-center gap-3">
                  <Camera size={18} className="text-accent" />
                  <h3 className="text-xs uppercase font-bold tracking-[0.2em] text-white">Spesifikasi Peralatan (Gear)</h3>
                </div>

                <div className="space-y-8">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-slate-500">Kamera Utama</label>
                    <input 
                      className="w-full bg-black/40 border border-white/10 p-4 rounded-xl outline-none focus:border-accent text-sm font-bold tracking-tight" 
                      value={profileFormData.cameraBody} 
                      onChange={e => setProfileFormData({...profileFormData, cameraBody: e.target.value})}
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center justify-between">
                      Daftar Lensa
                      <button type="button" onClick={() => setProfileFormData({...profileFormData, lenses: [...profileFormData.lenses, '']})} className="text-[9px] text-accent hover:underline">+ Tambah</button>
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {profileFormData.lenses.map((lens, idx) => (
                        <div key={idx} className="flex gap-2 group">
                          <input 
                            className="flex-1 bg-black/40 border border-white/10 p-3 rounded-lg outline-none focus:border-accent text-[11px] font-medium" 
                            value={lens} 
                            placeholder={`Lensa ${idx + 1}`}
                            onChange={e => {
                              const newLenses = [...profileFormData.lenses];
                              newLenses[idx] = e.target.value;
                              setProfileFormData({...profileFormData, lenses: newLenses});
                            }}
                          />
                          <button type="button" onClick={() => setProfileFormData({...profileFormData, lenses: profileFormData.lenses.filter((_, i) => i !== idx)})} className="p-2 opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-500 transition-all"><X size={16} /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="fixed bottom-0 left-0 right-0 p-6 bg-black/80 backdrop-blur-xl border-t border-white/10 flex justify-center z-[70]">
                <button 
                  type="submit" 
                  disabled={isSaving} 
                  className={`w-full max-w-md py-5 bg-accent text-black font-bold uppercase tracking-[0.3em] rounded-xl shadow-2xl shadow-accent/20 flex items-center justify-center gap-4 ${isSaving ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.98] transition-all'}`}
                >
                  {isSaving ? <span className="animate-pulse">Menyimpan...</span> : 'Simpan Seluruh Profil'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </main>
    </div>
  );
}
