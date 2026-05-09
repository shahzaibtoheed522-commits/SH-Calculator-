import React, { useState, useEffect } from 'react';
import { auth, db, loginWithGoogle, logout } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Shield, Hash, Smartphone, User as UserIcon, LogIn, ShieldAlert, Key } from 'lucide-react';
import Calculator from './components/Calculator';
import Vault from './components/Vault';
import { hashPasscode } from './lib/crypto';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [vaultUnlocked, setVaultUnlocked] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [isSetupNeeded, setIsSetupNeeded] = useState(false);
  const [setupStep, setSetupStep] = useState(1);
  const [tempPasscode, setTempPasscode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Check if user has setup a passcode
        const userDoc = await getDoc(doc(db, 'users', u.uid));
        if (!userDoc.exists()) {
          setIsSetupNeeded(true);
        } else {
          setIsSetupNeeded(false);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleUnlock = async (enteredPasscode: string) => {
    if (!user) return;
    
    setLoading(true);
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const storedHash = userDoc.data().passcode;
        const enteredHash = hashPasscode(enteredPasscode);
        
        if (storedHash === enteredHash) {
          setPasscode(enteredPasscode);
          setVaultUnlocked(true);
          setErrorMessage('');
        } else {
          // If it doesn't match, we just let it be a normal calculation
          // but we can log failed attempts locally if needed.
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSetupPasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !tempPasscode) return;
    
    if (setupStep === 1) {
      if (tempPasscode.length < 4) {
        setErrorMessage("Passcode too short (min 4)");
        return;
      }
      setSetupStep(2);
      setErrorMessage('');
      const firstEntry = tempPasscode;
      setTempPasscode('');
      // Store temporarily to confirm
      (window as any)._firstPass = firstEntry;
    } else {
      if (tempPasscode !== (window as any)._firstPass) {
        setErrorMessage("Passcodes do not match");
        setSetupStep(1);
        setTempPasscode('');
        return;
      }
      
      // Save to Firebase
      try {
        setLoading(true);
        const hashed = hashPasscode(tempPasscode);
        await setDoc(doc(db, 'users', user.uid), {
          id: user.uid,
          passcode: hashed,
          isSetup: true,
          updatedAt: serverTimestamp()
        });
        setIsSetupNeeded(false);
        setErrorMessage('');
      } catch (err) {
        setErrorMessage("Failed to save. Check connection.");
      } finally {
        setLoading(false);
      }
    }
  };

  if (loading && !user) {
    return (
      <div className="min-h-screen bg-[#0E1012] flex items-center justify-center">
        <motion.div 
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-16 h-16 bg-[#8AB4F8] rounded-2xl flex items-center justify-center text-[#1A1C1E] font-bold text-3xl"
        >
          H
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0E1012] flex flex-col items-center justify-center p-6 bg-radial-[at_50%_0%] from-[#1A1C1E] to-[#0E1012]">
        <div className="mb-12 text-center text-white">
           <motion.div 
              initial={{ rotate: -10, scale: 0.8 }}
              animate={{ rotate: 0, scale: 1 }}
              className="w-24 h-24 bg-[#8AB4F8] rounded-[32px] flex items-center justify-center text-[#1A1C1E] font-bold text-5xl mx-auto mb-6 shadow-[0_0_50px_rgba(138,180,248,0.3)]"
            >
              H
            </motion.div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">SH Calculator</h1>
            <p className="text-gray-400 max-w-xs mx-auto">The world's most secure hidden vault disguised as a simple calculator.</p>
        </div>

        <button 
          onClick={loginWithGoogle}
          className="flex items-center gap-3 bg-white text-black px-8 py-4 rounded-2xl font-bold hover:scale-105 active:scale-95 transition-all shadow-xl"
        >
          <LogIn size={20} /> Continue with Google
        </button>

        <div className="mt-12 grid grid-cols-3 gap-8 text-center text-[10px] text-gray-500 uppercase tracking-widest font-bold">
           <div><Shield className="mx-auto mb-2 text-[#8AB4F8]" size={16}/> Encrypted</div>
           <div><Hash className="mx-auto mb-2 text-[#8AB4F8]" size={16}/> Zero Knowledge</div>
           <div><Key className="mx-auto mb-2 text-[#8AB4F8]" size={16}/> Hidden Vault</div>
        </div>
      </div>
    );
  }

  if (isSetupNeeded) {
    return (
      <div className="min-h-screen bg-[#0E1012] flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm bg-[#1A1C1E] rounded-[40px] p-10 border border-white/5"
        >
          <h2 className="text-2xl font-bold text-white mb-2">{setupStep === 1 ? 'Shield Your Data' : 'Confirm Passcode'}</h2>
          <p className="text-gray-500 text-sm mb-8">
            {setupStep === 1 
              ? 'Choose a secret passcode to unlock your vault via the calculator.' 
              : 'Enter the passcode again to verify your setup.'}
          </p>

          <form onSubmit={handleSetupPasscode}>
            <input 
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              autoFocus
              required
              value={tempPasscode}
              onChange={e => setTempPasscode(e.target.value.replace(/[^0-9]/g, ''))}
              className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-center text-4xl text-[#8AB4F8] tracking-[0.5em] focus:outline-none focus:border-[#8AB4F8] transition-colors mb-6"
            />
            {errorMessage && <p className="text-red-400 text-xs text-center mb-4">{errorMessage}</p>}
            <button 
              type="submit"
              className="w-full bg-[#8AB4F8] text-[#1A1C1E] py-5 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[#99C2FF] transition-colors"
            >
              {setupStep === 1 ? 'Next' : 'Secure my Vault'}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0E1012]">
      <AnimatePresence mode="wait">
        {vaultUnlocked ? (
          <motion.div 
            key="vault"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Vault passcode={passcode} onLock={() => setVaultUnlocked(false)} />
          </motion.div>
        ) : (
          <motion.div 
            key="calculator"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center min-h-screen p-6"
          >
            <Calculator onUnlock={handleUnlock} />
            <button 
              onClick={() => logout()}
              className="mt-8 text-gray-600 hover:text-white transition-colors text-xs uppercase tracking-widest font-bold"
            >
              Switch Account
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating status for dev/secure feel */}
      <div className="fixed bottom-4 left-4 flex items-center gap-2 px-3 py-1 bg-black/50 border border-white/5 rounded-full backdrop-blur-sm">
        <div className={`w-1.5 h-1.5 rounded-full ${user ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
        <span className="text-[10px] text-gray-500 uppercase tracking-tighter font-mono">Secured Layer v1.0.4 - SH_PROTO</span>
      </div>
    </div>
  );
}
