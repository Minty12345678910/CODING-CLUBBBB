/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Users, MapPin, PlusCircle, Volleyball, Star, Sparkles, ChevronRight } from 'lucide-react';
import { auth, db } from './lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  setDoc, 
  doc, 
  getDoc,
  onSnapshot,
  query,
  orderBy,
  limit
} from 'firebase/firestore';

// Error handling according to integration guidelines
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Types
type Tab = 'competitions' | 'players' | 'host' | 'login' | 'signup';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('competitions');
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'info'} | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  const notify = (message: string, type: 'success' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div className="min-h-screen font-sans flex flex-col selection:bg-volleyball-red selection:text-white">
      {/* Notifications */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -100 }}
            animate={{ opacity: 1, y: 20 }}
            exit={{ opacity: 0, y: -100 }}
            className="fixed top-0 left-1/2 -translate-x-1/2 z-[200] w-full max-w-sm px-4"
          >
            <div className={`p-4 rounded-2xl shadow-2xl border flex items-center gap-3 ${
              notification.type === 'success' ? 'bg-white border-green-100 text-green-900' : 'bg-volleyball-blue border-blue-400 text-white'
            }`}>
              {notification.type === 'success' ? <Sparkles className="text-green-500" /> : <Star className="text-white animate-spin" />}
              <span className="font-black text-[12px] uppercase tracking-widest">{notification.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Bar */}
      <nav className="bg-volleyball-red h-[60px] flex items-center px-4 md:px-10 justify-between shadow-[0_2px_15px_rgba(0,0,0,0.15)] z-50 sticky top-0 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div 
            className="text-white font-black text-2xl tracking-tighter uppercase cursor-pointer flex items-center gap-1"
            onClick={() => setActiveTab('competitions')}
          >
            <Volleyball className="w-6 h-6 rotate-12" />
            Volley<span className="opacity-70">Hub</span>
          </div>
        </div>
        
        <div className="hidden md:flex gap-8 items-center h-full">
          {[
            { id: 'competitions', label: 'Competitions' },
            { id: 'players', label: 'Local Stars' },
            { id: 'host', label: 'Host Events' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`text-white text-[13px] font-bold uppercase tracking-widest h-full flex items-center border-b-2 transition-all duration-300 ${
                activeTab === tab.id 
                  ? 'border-white opacity-100' 
                  : 'border-transparent opacity-70 hover:opacity-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2 mr-4 bg-black/10 px-3 py-1 rounded-full border border-white/10">
            <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            <span className="text-white text-[9px] font-black uppercase tracking-widest">Circuit Online</span>
          </div>
          {user ? (
            <div className="flex items-center gap-4">
              <span className="text-white text-[11px] font-black uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full border border-white/20">
                {user.email?.split('@')[0]}
              </span>
              <button 
                onClick={() => {
                  signOut(auth);
                  notify('Signed out successfully', 'info');
                }}
                className="text-white text-[12px] font-bold uppercase tracking-wide hover:opacity-100 transition-opacity opacity-70"
              >
                Logout
              </button>
            </div>
          ) : (
            <>
              <button 
                onClick={() => setActiveTab('login')}
                className={`text-white text-[12px] font-bold uppercase tracking-wide hover:opacity-100 transition-opacity ${activeTab === 'login' ? 'opacity-100 underline decoration-2 underline-offset-4' : 'opacity-70'}`}
              >
                Login
              </button>
              <button 
                onClick={() => setActiveTab('signup')}
                className="bg-white text-volleyball-red px-5 py-2 rounded-full text-[11px] font-black uppercase tracking-wider hover:shadow-xl hover:scale-105 active:scale-95 transition-all shadow-md"
              >
                Sign Up
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Mobile Nav */}
      <div className="md:hidden flex bg-volleyball-red border-t border-white/10 overflow-x-auto no-scrollbar">
        <MobileNavButton active={activeTab === 'competitions'} onClick={() => setActiveTab('competitions')} label="COMPS" />
        <MobileNavButton active={activeTab === 'players'} onClick={() => setActiveTab('players')} label="STARS" />
        <MobileNavButton active={activeTab === 'host'} onClick={() => setActiveTab('host')} label="HOST" />
        <MobileNavButton active={activeTab === 'login'} onClick={() => setActiveTab('login')} label="JOIN" />
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 lg:p-12 relative overflow-hidden">
        {/* Background stars/decorative elements */}
        <div className="absolute top-20 right-10 text-volleyball-red/5 -z-10 animate-pulse">
          <Star size={120} fill="currentColor" />
        </div>
        <div className="absolute top-[40%] left-[-50px] text-volleyball-blue/5 -z-10 animate-spin-slow">
          <Star size={200} fill="currentColor" />
        </div>
        <div className="absolute bottom-40 left-0 text-volleyball-blue/5 -z-10 animate-bounce duration-[5000ms]">
          <Star size={80} fill="currentColor" />
        </div>
        <div className="absolute bottom-10 right-20 text-volleyball-red/5 -z-10 animate-pulse">
          <Sparkles size={150} />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {activeTab === 'competitions' && <CompetitionsList onHostClick={() => setActiveTab('host')} notify={notify} />}
            {activeTab === 'players' && <PlayersList />}
            {activeTab === 'host' && <HostSection notify={notify} onSubmitted={() => { setActiveTab('competitions'); notify('Tournament Application Submitted!'); }} />}
            {(activeTab === 'login' || activeTab === 'signup') && (
              <AuthSection mode={activeTab} setActiveTab={setActiveTab} notify={notify} onAuthSuccess={() => { setActiveTab('competitions'); notify('Welcome to the VolleyHub Circuit!'); }} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

function MobileNavButton({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-4 text-[10px] font-black uppercase tracking-tighter text-white transition-colors border-r border-white/5 last:border-0 ${
        active ? 'bg-volleyball-blue' : ''
      }`}
    >
      {label}
    </button>
  );
}

function AuthSection({ mode, setActiveTab, onAuthSuccess, notify }: { mode: 'login' | 'signup', setActiveTab: (t: Tab) => void, onAuthSuccess: () => void, notify: (m: string, t?: 'success' | 'info') => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<'player' | 'organizer'>('player');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'signup') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          username,
          email,
          role,
          createdAt: serverTimestamp()
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onAuthSuccess();
    } catch (error: any) {
      notify(error.message, 'info');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-8">
      <div className="bg-white rounded-3xl shadow-[0_25px_50px_-12px_rgba(30,64,175,0.25)] overflow-hidden border border-volleyball-border transform hover:translate-y-[-4px] transition-transform duration-500">
        <div className="h-2 bg-volleyball-red" />
        <div className="p-8 md:p-12">
          <div className="mb-10 text-center relative">
            <Sparkles className="absolute -top-6 -right-2 text-volleyball-red w-8 h-8 opacity-20" />
            <h2 className="section-title text-volleyball-blue">
              {mode === 'login' ? 'Welcome' : 'Join the'}<br />
              <span className="text-volleyball-red">{mode === 'login' ? 'Back' : 'Circuit'}</span>
            </h2>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <>
                <div className="space-y-1.5 group">
                  <label className="text-[11px] font-black text-volleyball-slate uppercase tracking-widest group-focus-within:text-volleyball-red transition-colors">Username</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="SpikeKing99"
                      className="w-full bg-slate-50 border border-volleyball-border rounded-xl p-4 text-[14px] focus:ring-2 focus:ring-volleyball-red/20 focus:border-volleyball-red outline-none transition-all" 
                    />
                    <Star className="absolute right-4 top-4 text-volleyball-slate/20 w-4 h-4" />
                  </div>
                </div>
                <div className="space-y-1.5 group">
                  <label className="text-[11px] font-black text-volleyball-slate uppercase tracking-widest group-focus-within:text-volleyball-red transition-colors">Your Primary Role</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setRole('player')}
                      className={`flex-1 py-3 px-4 rounded-xl text-[12px] font-black uppercase tracking-widest transition-all border-2 ${
                        role === 'player' 
                          ? 'bg-volleyball-red border-volleyball-red text-white shadow-lg' 
                          : 'bg-white border-slate-100 text-volleyball-slate hover:border-slate-200'
                      }`}
                    >
                      Player
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('organizer')}
                      className={`flex-1 py-3 px-4 rounded-xl text-[12px] font-black uppercase tracking-widest transition-all border-2 ${
                        role === 'organizer' 
                          ? 'bg-volleyball-blue border-volleyball-blue text-white shadow-lg' 
                          : 'bg-white border-slate-100 text-volleyball-slate hover:border-slate-200'
                      }`}
                    >
                      Organizer
                    </button>
                  </div>
                </div>
              </>
            )}
            <div className="space-y-1.5 group">
              <label className="text-[11px] font-black text-volleyball-slate uppercase tracking-widest group-focus-within:text-volleyball-red transition-colors">Email Address</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="player@volleyhub.app"
                className="w-full bg-slate-50 border border-volleyball-border rounded-xl p-4 text-[14px] focus:ring-2 focus:ring-volleyball-red/20 focus:border-volleyball-red outline-none transition-all" 
              />
            </div>
            <div className="space-y-1.5 group">
              <label className="text-[11px] font-black text-volleyball-slate uppercase tracking-widest group-focus-within:text-volleyball-red transition-colors">Password</label>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-volleyball-border rounded-xl p-4 text-[14px] focus:ring-2 focus:ring-volleyball-red/20 focus:border-volleyball-red outline-none transition-all" 
              />
            </div>

            <button 
              disabled={loading}
              className="w-full bg-volleyball-blue text-white py-5 rounded-2xl font-black text-[15px] uppercase tracking-widest mt-6 hover:bg-black hover:shadow-2xl hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? 'Processing...' : (mode === 'login' ? 'Authenticate' : 'Initialize Account')}
              <ChevronRight className="w-5 h-5" />
            </button>
          </form>

          <div className="mt-10 text-center border-t border-slate-100 pt-8">
            <p className="text-[12px] font-bold text-volleyball-slate uppercase tracking-tighter">
              {mode === 'login' ? "New to the hub?" : "Already ranked?"}
              <button 
                onClick={() => setActiveTab(mode === 'login' ? 'signup' : 'login')}
                className="ml-2 text-volleyball-red hover:underline decoration-2 underline-offset-4 transition-all"
              >
                {mode === 'login' ? "Elevate Your Game" : "Login to Profile"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CompetitionsList({ onHostClick, notify }: { onHostClick: () => void, notify: (msg: string, type?: 'success' | 'info') => void }) {
  const [comps, setComps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'competitions'), orderBy('createdAt', 'desc'), limit(10));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setComps(docs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'competitions');
    });
    return () => unsubscribe();
  }, []);

  const handleApply = async (compId: string) => {
    if (!auth.currentUser) {
      notify('Please login to apply!', 'info');
      return;
    }
    try {
      await addDoc(collection(db, `competitions/${compId}/applications`), {
        playerId: auth.currentUser.uid,
        username: auth.currentUser.email?.split('@')[0] || 'Player', // Storing public info for "seeing others"
        status: 'pending',
        appliedAt: serverTimestamp()
      });
      notify('Application Sent to Host!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `competitions/${compId}/applications`);
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <PlayerGallery />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
        <div className="lg:col-span-2 space-y-10">
          <div className="relative flex justify-between items-end">
            <div>
              <h2 className="section-title text-volleyball-blue relative z-10">
                Live <span className="text-volleyball-red">Smashes</span>
                <Star className="absolute -top-4 -left-6 text-volleyball-red/10 w-12 h-12 -z-10 rotate-12" fill="currentColor" />
              </h2>
              <div className="h-1 w-24 bg-volleyball-red mt-4 rounded-full" />
            </div>
            <div className="hidden md:flex flex-col items-end">
               <div className="flex items-center gap-2 text-volleyball-slate font-black text-[10px] uppercase tracking-[0.2em] mb-1">
                 <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                 Global Activity
               </div>
               <div className="text-[12px] font-bold text-volleyball-blue opacity-60">Real-time updates enabled</div>
            </div>
          </div>
          
          {loading ? (
            <div className="flex flex-col gap-6 animate-pulse">
              {[1, 2, 3].map(i => <div key={i} className="h-40 bg-white rounded-2xl border border-slate-100" />)}
            </div>
          ) : comps.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl text-center border-2 border-dashed border-slate-100">
              <Volleyball className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <p className="text-volleyball-slate font-black uppercase tracking-widest">No active competitions. Be the first to host!</p>
              <button 
                onClick={onHostClick}
                className="mt-6 text-volleyball-red font-black uppercase text-[12px] hover:underline"
              >
                Host an Event +
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {comps.map((comp) => {
                const date = comp.createdAt?.toDate() || new Date();
                const day = date.getDate();
                const month = date.toLocaleString('default', { month: 'short' }).toUpperCase();
                
                return (
                  <CompetitionCard 
                    key={comp.id} 
                    comp={comp} 
                    day={day} 
                    month={month} 
                    onApply={() => handleApply(comp.id)} 
                  />
                );
              })}
            </div>
          )}
        </div>

        <aside className="space-y-10">
          <CommunityActivity />
          
          <div className="bg-volleyball-blue text-white p-1 rounded-2xl shadow-[0_20px_40px_-10px_rgba(30,64,175,0.4)] overflow-hidden relative group">
            <img 
              src="https://images.unsplash.com/photo-1592656094267-764a45060876?q=80&w=800" 
              className="absolute inset-0 w-full h-full object-cover opacity-20 filter grayscale scale-110 group-hover:scale-125 transition-transform duration-1000 md:block hidden"
              style={{ pointerEvents: 'none' }}
              referrerPolicy="no-referrer"
              alt="Background"
            />
            <div className="relative p-10 bg-gradient-to-br from-volleyball-blue/90 to-black/90">
              <h3 className="text-[28px] font-black leading-none mb-4 uppercase tracking-tighter">Start Your Own <br /> <span className="text-volleyball-red">Competition</span></h3>
              <p className="text-[15px] opacity-80 mb-8 leading-relaxed font-medium">Organize local matches and grow the community in your neighborhood with VolleyHub tools.</p>
              <button 
                onClick={onHostClick}
                className="w-full bg-white text-volleyball-blue py-4 rounded-xl font-black text-[14px] uppercase tracking-widest hover:bg-volleyball-red hover:text-white transition-all transform hover:-translate-y-1"
              >
                Host Now
              </button>
            </div>
          </div>
        
        <div className="bg-white rounded-3xl card-shadow border border-volleyball-border p-8 relative overflow-hidden">
          <Star className="absolute -bottom-8 -right-8 text-slate-50 w-32 h-32 -z-10" fill="currentColor" />
          <h4 className="text-[12px] font-black text-volleyball-slate uppercase tracking-[0.2em] mb-10 border-b pb-4 flex justify-between items-center">
            Top Local Stars
            <Sparkles className="w-4 h-4 text-volleyball-red" />
          </h4>
          <div className="space-y-6">
            {[
              { rank: '01', name: 'Marcus Kane', info: '98% Win Rate', tag: 'Elite', stars: 5 },
              { rank: '02', name: 'Sarah Lopez', info: '120 Games Played', tag: 'Vet', stars: 4 },
              { rank: '03', name: 'James Tan', info: '1.2k Kills Total', tag: '', stars: 4 },
              { rank: '04', name: 'Riley Evans', info: 'Rookie of Month', tag: 'Hot', stars: 3 }
            ].map((player, idx, arr) => (
              <div key={player.rank} className={`flex items-center gap-5 group cursor-pointer ${idx < arr.length - 1 ? 'border-b border-slate-50 pb-6' : ''}`}>
                <div className="font-black text-volleyball-red text-[24px] italic group-hover:scale-125 transition-transform">{player.rank}</div>
                <div className="w-12 h-12 rounded-full border-2 border-volleyball-border p-0.5 group-hover:border-volleyball-red transition-colors">
                  <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-400 text-[14px]">
                    {player.name.charAt(0)}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="font-black text-[15px] text-volleyball-text flex items-center gap-2 group-hover:text-volleyball-blue transition-colors">
                    {player.name}
                    {player.tag && <span className="bg-black text-white text-[8px] px-2 py-0.5 rounded-sm font-black uppercase tracking-tighter">{player.tag}</span>}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={10} fill={i < player.stars ? "#DC2626" : "transparent"} className={i < player.stars ? "text-volleyball-red" : "text-slate-200"} />
                    ))}
                    <span className="text-[11px] text-volleyball-slate font-bold ml-1">{player.info}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-10 p-4 rounded-xl text-[11px] font-black text-volleyball-slate uppercase tracking-widest border border-slate-100 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
            View All Players
            <ChevronRight size={14} />
          </button>
        </div>
      </aside>
    </div>
  </div>
);
}

function PlayersList() {
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(15));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPlayers(docs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-12 animate-in slide-in-from-bottom duration-700">
      <div className="relative inline-block">
        <h2 className="section-title text-volleyball-blue">
          Local <span className="text-volleyball-red">Stars</span>
        </h2>
        <div className="absolute -right-12 top-0 text-volleyball-red animate-pulse">
          <Star size={32} fill="currentColor" />
        </div>
      </div>
      
      <div className="bg-white rounded-3xl shadow-2xl border border-volleyball-border overflow-hidden">
        {loading ? (
          <div className="p-20 text-center text-slate-300 font-bold uppercase tracking-widest">Scouting talent...</div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-volleyball-bg border-b border-volleyball-border">
              <tr>
                <th className="px-10 py-6 text-[11px] font-black text-volleyball-slate uppercase tracking-[0.2em]">Rank</th>
                <th className="px-10 py-6 text-[11px] font-black text-volleyball-slate uppercase tracking-[0.2em]">Elite Player</th>
                <th className="px-10 py-6 text-[11px] font-black text-volleyball-slate uppercase tracking-[0.2em]">Performance Metric</th>
                <th className="px-10 py-6 text-[11px] font-black text-volleyball-slate uppercase tracking-[0.2em]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {players.map((player, idx) => (
                <tr key={player.id} className="group hover:bg-slate-50/80 transition-colors">
                  <td className="px-10 py-8">
                    <div className={`text-[36px] font-black italic tracking-tighter ${idx < 3 ? 'text-volleyball-red opacity-100' : 'text-slate-200'}`}>
                      {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                    </div>
                  </td>
                  <td className="px-10 py-8">
                    <div className="flex items-center gap-6">
                      <div className="relative">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-slate-100 to-slate-50 border border-slate-200 flex items-center justify-center font-black text-volleyball-blue text-[20px] transform group-hover:rotate-6 transition-transform">
                          {player.username?.charAt(0).toUpperCase()}
                        </div>
                        {idx < 3 && <Star className="absolute -top-2 -right-2 text-volleyball-red w-6 h-6 animate-bounce" fill="currentColor" />}
                      </div>
                      <div>
                        <div className="font-extrabold text-volleyball-blue text-[18px] group-hover:text-volleyball-red transition-colors uppercase tracking-tight">{player.username}</div>
                        <div className="text-[11px] text-volleyball-slate uppercase font-black tracking-widest flex items-center gap-2">
                          <MapPin size={10} />
                          {player.role || 'PLAYER'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-8">
                    <div className="flex gap-10">
                      <div className="text-center">
                        <div className="text-[22px] font-black text-volleyball-text">95%</div>
                        <div className="text-[10px] font-black text-volleyball-slate uppercase tracking-tighter">Win Rate</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[22px] font-black text-volleyball-text">142</div>
                        <div className="text-[10px] font-black text-volleyball-slate uppercase tracking-tighter">Spikes</div>
                      </div>
                      <div className="text-center hidden md:block">
                        <div className="flex gap-0.5 mb-1 pt-2">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} size={10} fill={i < (5 - Math.floor(idx/3)) ? "#DC2626" : "transparent"} className="text-volleyball-red" />
                          ))}
                        </div>
                        <div className="text-[10px] font-black text-volleyball-slate uppercase tracking-tighter">Rating</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-8 text-right">
                    <button className="bg-slate-100 hover:bg-volleyball-blue hover:text-white text-volleyball-blue font-black text-[11px] px-6 py-2 rounded-lg uppercase tracking-widest transition-all">
                      Profile
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function HostSection({ onSubmitted, notify }: { onSubmitted: () => void, notify: (m: string, t?: 'success' | 'info') => void }) {
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [tier, setTier] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) {
      notify('Must be logged in to host events!', 'info');
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, 'competitions'), {
        title,
        location,
        tier,
        hostId: auth.currentUser.uid,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      onSubmitted();
    } catch (error: any) {
      notify(error.message, 'info');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-16 max-w-6xl mx-auto items-center animate-in zoom-in duration-700">
      <div className="space-y-8">
        <div className="inline-flex items-center gap-2 bg-volleyball-red/10 text-volleyball-red px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-2">
          <Sparkles size={12} />
          Limited Slots Available
        </div>
        <h2 className="section-title text-volleyball-blue italic leading-none">
          Host Your <br /> <span className="text-volleyball-red">Own Series</span>
        </h2>
        <p className="text-volleyball-slate text-[18px] leading-relaxed font-bold opacity-80 decoration-volleyball-red/20 underline decoration-4 underline-offset-8">
          Empowering local organizers to build real communities. 
          RSVPs, scores, and global rankings in one place.
        </p>
        
        <div className="grid grid-cols-1 gap-6 pt-6">
          {[
            "Instant Notifications to Local Players",
            "Verified Ranking System Integration",
            "Automated Waitlists & Scheduling"
          ].map((text, i) => (
            <div key={i} className="flex items-center gap-5 p-4 bg-white rounded-2xl shadow-sm border border-slate-100 group hover:border-volleyball-red transition-colors">
               <div className="w-10 h-10 rounded-full bg-volleyball-blue flex items-center justify-center text-white font-black italic">!</div>
               <span className="font-black text-volleyball-blue uppercase text-[12px] tracking-wide">{text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="relative">
        <div className="absolute -top-10 -right-10 text-volleyball-red opacity-10 animate-spin-slow">
           <Star size={160} fill="currentColor" />
        </div>
        <div className="bg-white p-10 md:p-14 rounded-[40px] shadow-[0_50px_100px_-20px_rgba(30,64,175,0.2)] border border-volleyball-border relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-volleyball-red via-volleyball-blue to-volleyball-red" />
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2 group">
              <label className="text-[11px] font-black text-volleyball-slate uppercase tracking-widest group-focus-within:text-volleyball-red transition-all">Competition Title</label>
              <input 
                type="text" 
                required 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. MONSTER SPIKE '26" 
                className="w-full bg-slate-50 border border-volleyball-border rounded-xl p-4 text-[14px] font-bold focus:ring-2 focus:ring-volleyball-red/20 outline-none transition-all placeholder:text-slate-300" 
              />
            </div>
            <div className="space-y-2 group">
              <label className="text-[11px] font-black text-volleyball-slate uppercase tracking-widest group-focus-within:text-volleyball-red transition-all">Ground Location</label>
              <input 
                type="text" 
                required 
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. BRIGHTON BEACH" 
                className="w-full bg-slate-50 border border-volleyball-border rounded-xl p-4 text-[14px] font-bold focus:ring-2 focus:ring-volleyball-red/20 outline-none transition-all placeholder:text-slate-300" 
              />
            </div>
            <div className="space-y-2 group">
              <label className="text-[11px] font-black text-volleyball-slate uppercase tracking-widest group-focus-within:text-volleyball-red transition-all">Experience Tier</label>
              <select 
                required 
                value={tier}
                onChange={(e) => setTier(e.target.value)}
                className="w-full bg-slate-50 border border-volleyball-border rounded-xl p-4 text-[14px] font-black outline-none appearance-none cursor-pointer text-slate-900"
              >
                <option value="">SELECT TIER...</option>
                <option>AMATEUR (RECREATIONAL)</option>
                <option>COMPETITIVE (B/BB)</option>
                <option>ELITE (A/OPEN)</option>
              </select>
            </div>
            <button 
              disabled={loading}
              className="w-full bg-black text-white py-6 rounded-2xl font-black text-[15px] uppercase tracking-widest mt-6 hover:bg-volleyball-red shadow-2xl hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? 'Initializing...' : 'Initialize Showcase'}
              <Star size={18} fill="currentColor" fillOpacity={0.5} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function PlayerGallery() {
  const players = [
    { name: 'Karch Kiraly', img: 'https://images.unsplash.com/photo-1628779238951-be349557088b?q=80&w=1200&auto=format&fit=crop', note: 'GOAT of Volleyball' },
    { name: 'Kerri Walsh', img: 'https://images.unsplash.com/photo-1593787467001-e391ff12eeec?q=80&w=1200&auto=format&fit=crop', note: 'Beach Queen' },
    { name: 'Misty May', img: 'https://images.unsplash.com/photo-1609115714782-dc83116538c6?q=80&w=1200&auto=format&fit=crop', note: 'Triple Gold' },
    { name: 'Yuji Nishida', img: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=1200&auto=format&fit=crop', note: 'Vertical Beast' },
    { name: 'NCAA Super Touch', img: 'https://images.unsplash.com/photo-1612872086821-4d06978e7448?q=80&w=1200&auto=format&fit=crop', note: 'Official Match Ball' }
  ];

  const [idx, setIdx] = useState(0);

  React.useEffect(() => {
    const timer = setInterval(() => setIdx((p) => (p + 1) % players.length), 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative h-[450px] rounded-[40px] overflow-hidden border-8 border-white shadow-2xl group mb-12">
      <AnimatePresence mode="wait">
        <motion.div
           key={idx}
           initial={{ opacity: 0, scale: 1.1 }}
           animate={{ opacity: 1, scale: 1 }}
           exit={{ opacity: 0, scale: 0.95 }}
           transition={{ duration: 1.2, ease: "anticipate" }}
           className="absolute inset-0"
        >
          <img src={players[idx].img} className="w-full h-full object-cover grayscale-[20%] hover:grayscale-0 transition-all duration-1000" referrerPolicy="no-referrer" alt={players[idx].name} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
          
          {/* Animated Stars in Gallery */}
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute top-10 left-10 text-white/10"
          >
            <Star size={100} fill="currentColor" />
          </motion.div>

          <div className="absolute bottom-16 left-12 right-12">
            <motion.div 
               initial={{ y: 30, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               transition={{ delay: 0.4 }}
               className="flex items-end justify-between"
            >
              <div>
                <div className="flex gap-2 mb-4">
                  {[...Array(5)].map((_, i) => <Star key={i} size={20} fill="white" className="text-white drop-shadow-lg" />)}
                </div>
                <h4 className="text-white text-[56px] font-black italic uppercase leading-none tracking-tighter drop-shadow-2xl">{players[idx].name}</h4>
                <div className="flex items-center gap-3">
                  <Sparkles className="text-volleyball-red w-5 h-5" />
                  <p className="text-volleyball-red font-black uppercase text-[16px] tracking-[0.4em]">{players[idx].note}</p>
                </div>
              </div>
              <div className="flex gap-3 pb-4">
                {players.map((_, i) => (
                  <div key={i} className={`h-2.5 transition-all duration-700 rounded-full ${i === idx ? 'w-16 bg-volleyball-red' : 'w-3 bg-white/40'}`} />
                ))}
              </div>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>
      <div className="absolute top-8 right-8 bg-volleyball-red/20 backdrop-blur-xl px-6 py-3 rounded-2xl border border-white/20 text-white text-[12px] font-black uppercase tracking-[0.2em] shadow-lg">
        Legendary Gallery
      </div>
    </div>
  );
}

function CompetitionCard({ comp, day, month, onApply }: any) {
  const [applicants, setApplicants] = useState<any[]>([]);
  
  useEffect(() => {
    const q = query(collection(db, `competitions/${comp.id}/applications`), orderBy('appliedAt', 'desc'), limit(5));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setApplicants(snapshot.docs.map(d => d.data()));
    }, () => {
      // Silently handle errors for non-authenticated counts
    });
    return () => unsubscribe();
  }, [comp.id]);

  const hasJoined = auth.currentUser && applicants.some(a => a.playerId === auth.currentUser?.uid);

  return (
    <motion.div 
      whileHover={{ scale: 1.01 }}
      className="bg-white rounded-2xl card-shadow border border-volleyball-border border-l-[6px] border-l-volleyball-red p-4 md:p-6 flex flex-col md:flex-row items-stretch gap-6 overflow-hidden relative group"
    >
      <div className="w-full md:w-32 h-40 md:h-auto overflow-hidden rounded-xl bg-slate-100 flex-shrink-0 relative">
        <img 
          src={comp.img || "https://images.unsplash.com/photo-1592656094267-764a45060876?q=80&w=800"} 
          alt={comp.title} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-2 left-2 bg-volleyball-red text-white text-[10px] font-black px-2 py-1 rounded shadow-lg uppercase tracking-widest">
          {comp.tier?.split(' ')[0] || 'OPEN'}
        </div>
      </div>

      <div className="w-20 text-center border-r border-volleyball-border pr-6 hidden md:flex flex-col justify-center">
        <div className="text-[28px] font-black text-volleyball-red leading-none italic">{day}</div>
        <div className="text-[12px] font-bold text-volleyball-slate uppercase tracking-tighter">{month}</div>
      </div>

      <div className="flex-1 space-y-2 flex flex-col justify-center">
        <div className="flex gap-1 mb-1">
          {[...Array(5)].map((_, i) => (
             <Star key={i} size={12} fill={i < (comp.stars || 3) ? "#DC2626" : "transparent"} className={i < (comp.stars || 3) ? "text-volleyball-red" : "text-slate-200"} />
          ))}
        </div>
        <div className="font-extrabold text-[20px] md:text-[22px] text-volleyball-blue leading-tight uppercase tracking-tight group-hover:text-volleyball-red transition-colors">{comp.title}</div>
        <div className="flex items-center gap-2 text-[14px] text-volleyball-slate font-medium uppercase tracking-wider">
          <MapPin size={14} className="text-volleyball-red" />
          {comp.location}
        </div>

        {/* Real-time Applicant Facepile */}
        <div className="flex items-center gap-3 pt-2">
          <div className="flex -space-x-2">
            {[...Array(Math.min(3, applicants.length))].map((_, i) => (
              <div key={i} className="w-7 h-7 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-black text-slate-500 uppercase">
                {applicants[i].username?.charAt(0) || '?'}
              </div>
            ))}
            {applicants.length > 3 && (
              <div className="w-7 h-7 rounded-full bg-volleyball-blue border-2 border-white flex items-center justify-center text-[8px] font-black text-white">
                +{applicants.length - 3}
              </div>
            )}
          </div>
          <span className="text-[10px] font-black text-volleyball-slate uppercase tracking-widest">
            {applicants.length} {applicants.length === 1 ? 'Player' : 'Players'} Joined
          </span>
        </div>
      </div>

      <div className="flex items-center">
        <button 
          onClick={onApply}
          disabled={hasJoined}
          className={`w-full md:w-auto px-8 py-3 rounded-xl font-black text-[13px] uppercase tracking-widest transition-all shadow-md group-hover:shadow-xl active:scale-95 ${
            hasJoined 
              ? 'bg-green-500 text-white cursor-default' 
              : 'bg-volleyball-blue text-white hover:bg-black'
          }`}
        >
          {hasJoined ? 'Joined' : 'Apply Now'}
        </button>
      </div>
    </motion.div>
  );
}

function CommunityActivity() {
  const [recentPlayers, setRecentPlayers] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(3));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRecentPlayers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="bg-white rounded-3xl card-shadow border border-volleyball-border p-6 relative overflow-hidden">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-2 h-2 bg-volleyball-red rounded-full animate-ping" />
        <h4 className="text-[11px] font-black text-volleyball-blue uppercase tracking-[0.2em]">Global Pulse</h4>
      </div>

      <div className="space-y-4">
        {recentPlayers.length === 0 ? (
          <p className="text-[10px] text-volleyball-slate font-bold uppercase">Scouting for activity...</p>
        ) : (
          recentPlayers.map((p) => (
            <div key={p.id} className="flex items-center gap-3 animate-in fade-in slide-in-from-right duration-500">
              <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center font-black text-volleyball-blue text-[10px]">
                {p.username?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-[11px] font-black text-volleyball-text uppercase tracking-tight">{p.username}</p>
                <p className="text-[9px] font-bold text-volleyball-red uppercase tracking-widest">Just Joined the Hub</p>
              </div>
            </div>
          ))
        )}
      </div>
      
      <div className="mt-6 pt-4 border-t border-slate-50">
         <div className="flex justify-between items-center text-[9px] font-black text-volleyball-slate uppercase tracking-tighter">
            <span>Online Circuit</span>
            <span className="text-volleyball-blue">{Math.floor(Math.random() * 20) + 50} Players</span>
         </div>
      </div>
    </div>
  );
}

