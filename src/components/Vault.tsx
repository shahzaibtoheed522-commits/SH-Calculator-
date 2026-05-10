import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { Plus, Trash2, Lock, Unlock, Eye, EyeOff, Hash, ShieldCheck, LogOut, FileText, Key, Check, Cloud, Download, Shield, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { decryptData, encryptData, generateRecoveryKey, hashPasscode } from '../lib/crypto';
import { updateDoc } from 'firebase/firestore';

interface VaultItem {
  id: string;
  title: string;
  content: string;
  type: 'text' | 'note' | 'credential';
  createdAt: any;
  ownerId: string;
}

interface VaultProps {
  passcode: string;
  onLock: () => void;
}

export default function Vault({ passcode, onLock }: VaultProps) {
  const [items, setItems] = useState<VaultItem[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [showBackup, setShowBackup] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState<'text' | 'note' | 'credential'>('text');
  const [decryptedContents, setDecryptedContents] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'vaultItems'),
      where('ownerId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as VaultItem));
      setItems(docs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !newTitle || !newContent) return;

    try {
      const encryptedTitle = encryptData(newTitle, passcode, auth.currentUser.uid);
      const encryptedContent = encryptData(newContent, passcode, auth.currentUser.uid);

      await addDoc(collection(db, 'vaultItems'), {
        ownerId: auth.currentUser.uid,
        title: encryptedTitle,
        content: encryptedContent,
        type: newType,
        createdAt: serverTimestamp()
      });

      setNewTitle('');
      setNewContent('');
      setIsAdding(false);
    } catch (error) {
      console.error("Error adding item:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this secret permanently?")) {
      await deleteDoc(doc(db, 'vaultItems', id));
    }
  };

  const toggleDecrypt = (id: string, encryptedContent: string, encryptedTitle: string) => {
    if (decryptedContents[id]) {
      const newMap = { ...decryptedContents };
      delete newMap[id];
      setDecryptedContents(newMap);
    } else {
      try {
        const uid = auth.currentUser?.uid || '';
        const title = decryptData(encryptedTitle, passcode, uid);
        const content = decryptData(encryptedContent, passcode, uid);
        setDecryptedContents({ ...decryptedContents, [id]: content, [`${id}_title`]: title });
      } catch (err) {
          alert("Decryption failed. Memory might be corrupted or passcode changed.");
      }
    }
  };

  const handleGenerateRecoveryKey = async () => {
    if (!auth.currentUser) return;
    const key = generateRecoveryKey();
    const hash = hashPasscode(key);
    
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        recoveryKeyHash: hash,
        updatedAt: serverTimestamp()
      });
      setRecoveryKey(key);
    } catch (err) {
      console.error("Failed to generate recovery key:", err);
    }
  };

  const handleExportBackup = () => {
    const backupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      items: items.map(({ id, ...rest }) => rest)
    };
    
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sh_vault_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.items && Array.isArray(data.items)) {
          const confirmation = confirm(`Import ${data.items.length} items from backup? Existing items will remain.`);
          if (!confirmation) return;

          for (const item of data.items) {
             await addDoc(collection(db, 'vaultItems'), {
               ...item,
               ownerId: auth.currentUser?.uid,
               createdAt: serverTimestamp()
             });
          }
          alert("Import successful!");
        }
      } catch (err) {
        alert("Failed to parse backup file.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-[#0E1012] text-white p-6 pb-24">
      <header className="flex items-center justify-between mb-8 sm:mb-12">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#8AB4F8] rounded-xl flex items-center justify-center text-[#0E1012] font-bold text-xl sm:text-2xl">
            H
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">SH Vault</h1>
            <p className="text-gray-500 text-[10px] sm:text-xs uppercase tracking-widest flex items-center gap-1">
              <ShieldCheck size={12} className="text-green-500" /> Secure
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button 
            onClick={() => setShowBackup(true)}
            className="p-2.5 sm:p-3 bg-[#1A1C1E] border border-white/10 rounded-full text-gray-400 hover:text-[#8AB4F8] transition-colors"
            title="Backup & Restore"
          >
            <Cloud size={18} />
          </button>
          <button 
            onClick={onLock}
            className="p-2.5 sm:p-3 bg-[#1A1C1E] border border-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <h2 className="text-sm sm:text-lg font-medium text-gray-400">Secrets ({items.length})</h2>
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-[#8AB4F8] text-[#0E1012] px-3 py-2 sm:px-4 sm:py-2 rounded-full font-bold text-xs sm:text-sm hover:scale-105 transition-transform"
          >
            <Plus size={14} /> <span className="hidden sm:inline">New Entry</span><span className="sm:hidden">New</span>
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8AB4F8]"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
            {items.map(item => {
              const isDecrypted = !!decryptedContents[item.id];
              const displayTitle = isDecrypted ? decryptedContents[`${item.id}_title`] : "••••••••";
              const displayContent = isDecrypted ? decryptedContents[item.id] : "Encrypted content hidden";

              return (
                <motion.div 
                  layout
                  key={item.id}
                  className="bg-[#1A1C1E] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all flex flex-col"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${item.type === 'credential' ? 'bg-orange-500/10 text-orange-500' : 'bg-blue-500/10 text-blue-500'}`}>
                        {item.type === 'credential' ? <Key size={18} /> : <FileText size={18} />}
                      </div>
                      <h3 className="font-medium">{displayTitle}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                       <button 
                        onClick={() => toggleDecrypt(item.id, item.content, item.title)}
                        className="p-2 text-gray-500 hover:text-white transition-colors"
                      >
                        {isDecrypted ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="bg-black/20 rounded-xl p-4 font-mono text-sm break-all text-gray-400">
                    {displayContent}
                  </div>
                  
                  <div className="mt-4 text-[10px] text-gray-600 flex justify-between uppercase tracking-widest">
                    <span>{item.type}</span>
                    <span>{item.createdAt?.toDate().toLocaleDateString()}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {items.length === 0 && !loading && (
          <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-[40px]">
             <Lock size={48} className="mx-auto mb-4 text-gray-700" />
             <p className="text-gray-500">Your lockbox is empty.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#1A1C1E] w-full max-w-md rounded-[32px] p-8 border border-white/10"
            >
              <h3 className="text-xl font-bold mb-6">New Secure Entry</h3>
              <form onSubmit={handleAddItem} className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-2 uppercase tracking-widest">Title</label>
                  <input 
                    autoFocus
                    required
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-[#8AB4F8] transition-colors"
                    placeholder="e.g. Bank PIN"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-2 uppercase tracking-widest">Content</label>
                  <textarea 
                    required
                    value={newContent}
                    onChange={e => setNewContent(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-[#8AB4F8] transition-colors h-32 resize-none"
                    placeholder="Enter your secret here..."
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-2 uppercase tracking-widest">Type</label>
                  <div className="flex gap-2">
                    {['text', 'note', 'credential'].map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setNewType(t as any)}
                        className={`px-4 py-2 rounded-lg text-xs uppercase font-bold transition-all ${newType === t ? 'bg-[#8AB4F8] text-[#0E1012]' : 'bg-black/40 text-gray-500'}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-4 mt-8">
                  <button 
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="flex-1 py-4 text-gray-500 font-bold hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-[#8AB4F8] text-[#0E1012] py-4 rounded-2xl font-bold hover:scale-[1.02] active:scale-95 transition-all flex justify-center items-center gap-2"
                  >
                    <Check size={18} /> Store Securely
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}

        {showBackup && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 text-center"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#1A1C1E] w-full max-w-md rounded-[32px] p-8 border border-white/10"
            >
              <div className="w-16 h-16 bg-blue-500/20 text-[#8AB4F8] rounded-full flex items-center justify-center mx-auto mb-6">
                <Cloud size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2">Cloud Backup Status</h3>
              <p className="text-gray-400 text-sm mb-8">Your data is automatically encrypted and synced to our secure servers.</p>
              
              <div className="space-y-4">
                <div className="p-4 bg-black/40 rounded-2xl border border-white/5 flex items-center justify-between text-left">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Encrypted Items</p>
                    <p className="text-lg font-mono">{items.length}</p>
                  </div>
                  <div className="flex items-center gap-2 text-green-500 text-xs font-bold uppercase">
                    <ShieldCheck size={16} /> Synchronized
                  </div>
                </div>

                <div className="p-4 bg-black/40 rounded-2xl border border-white/5 text-left">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Recovery Key</p>
                    <Shield size={14} className="text-[#8AB4F8]" />
                  </div>
                  
                  {recoveryKey ? (
                    <div className="bg-black p-4 rounded-xl font-mono text-[#8AB4F8] text-center border border-[#8AB4F8]/20 break-all select-all">
                      {recoveryKey}
                      <p className="mt-2 text-[10px] text-gray-500 normal-case font-sans">Save this key in a physical location. It is your only way back in if you forget your passcode.</p>
                    </div>
                  ) : (
                    <button 
                      onClick={handleGenerateRecoveryKey}
                      className="w-full py-3 bg-[#1A1C1E] border border-white/10 rounded-xl text-xs font-bold uppercase tracking-widest hover:border-white/30 transition-colors flex items-center justify-center gap-2"
                    >
                      <Key size={14} /> Generate Recovery Key
                    </button>
                  )}
                </div>

                <button 
                  onClick={handleExportBackup}
                  className="w-full flex items-center justify-between p-4 hover:bg-white/5 rounded-2xl transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Download className="text-gray-500" size={20} />
                    <span className="text-sm font-medium">Export Backup File</span>
                  </div>
                  <RefreshCw size={14} className="text-gray-700" />
                </button>

                <div className="relative">
                  <input 
                    type="file" 
                    accept=".json"
                    onChange={handleImportBackup}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div className="w-full flex items-center justify-between p-4 hover:bg-white/5 rounded-2xl transition-all">
                    <div className="flex items-center gap-3">
                      <Plus className="text-gray-500" size={20} />
                      <span className="text-sm font-medium">Import from Backup File</span>
                    </div>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => { setShowBackup(false); setRecoveryKey(null); }}
                className="mt-8 w-full py-4 rounded-2xl bg-white/5 hover:bg-white/10 font-bold transition-all"
              >
                Done
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
