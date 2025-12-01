
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SecureStorage } from '../../services/SecureStorage';
import { User, Shield, Clock, Search, MapPin, GraduationCap, Users, RefreshCw, Crown, MessageSquare, Lightbulb, Rocket, Mail, Filter } from 'lucide-react';
import { FeedbackItem } from '../../types';

interface AdminModalProps {
  isDark: boolean;
  accentColor: string;
}

export const AdminModal: React.FC<AdminModalProps> = ({ isDark, accentColor }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'feedback'>('users');
  
  // Users State
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchUser, setSearchUser] = useState('');
  const [filterUserType, setFilterUserType] = useState<'all' | 'premium'>('all');

  // Feedbacks State
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(false);
  const [filterFeedbackType, setFilterFeedbackType] = useState<'all' | 'suggestion' | 'feature'>('all');

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
        const data = await SecureStorage.getAllUsers();
        // Enrich data with Premium Status
        const enrichedData = await Promise.all(data.map(async (u: any) => {
            const isPremium = await SecureStorage.checkSubscriptionStatus(u.id);
            return { ...u, isPremium };
        }));
        setUsers(enrichedData);
    } catch (e) {
        console.error("Failed to load users", e);
    } finally {
        setLoadingUsers(false);
    }
  };

  const loadFeedbacks = async () => {
      setLoadingFeedbacks(true);
      try {
          const data = await SecureStorage.getFeedbacks();
          setFeedbacks(data);
      } catch (e) {
          console.error("Failed to load feedbacks", e);
      } finally {
          setLoadingFeedbacks(false);
      }
  };

  useEffect(() => {
    if (activeTab === 'users') loadUsers();
    else loadFeedbacks();
  }, [activeTab]);

  // Filter Logic
  const filteredUsers = users.filter(u => {
    const term = searchUser.toLowerCase();
    const name = u.profile?.nome_usual?.toLowerCase() || '';
    const mat = u.id?.toLowerCase() || '';
    const course = u.profile?.vinculo?.curso?.toLowerCase() || '';
    
    const matchesSearch = name.includes(term) || mat.includes(term) || course.includes(term);
    const matchesFilter = filterUserType === 'all' ? true : u.isPremium;

    return matchesSearch && matchesFilter;
  });

  const filteredFeedbacks = feedbacks.filter(f => filterFeedbackType === 'all' || f.type === filterFeedbackType);

  const premiumCount = users.filter(u => u.isPremium).length;

  return (
    <div className="space-y-8 pb-24">
      {/* HEADER */}
      <div className={`relative overflow-hidden rounded-[2.5rem] p-8 border shadow-lg ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-gray-100'}`}>
         <div className={`absolute top-0 right-0 p-8 opacity-5 text-${accentColor}-500`}>
             <Shield size={120} />
         </div>
         
         <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
             <div>
                 <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-2 ${isDark ? `bg-${accentColor}-500/20 text-${accentColor}-400` : `bg-${accentColor}-100 text-${accentColor}-600`}`}>
                    <Shield size={12} /> Painel Administrativo
                 </div>
                 <h2 className={`text-3xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>Gestão & Feedback</h2>
                 <p className="text-sm opacity-60 font-medium">Monitore a base de usuários e veja o que estão dizendo.</p>
             </div>

             <div className="flex items-center gap-2 bg-black/10 dark:bg-white/5 p-1 rounded-xl">
                 <button 
                    onClick={() => setActiveTab('users')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all ${activeTab === 'users' ? (isDark ? 'bg-white text-black' : 'bg-black text-white') : 'opacity-50 hover:opacity-100'}`}
                 >
                     Usuários
                 </button>
                 <button 
                    onClick={() => setActiveTab('feedback')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all ${activeTab === 'feedback' ? (isDark ? 'bg-white text-black' : 'bg-black text-white') : 'opacity-50 hover:opacity-100'}`}
                 >
                     Feedbacks
                 </button>
             </div>
         </div>
      </div>

      {/* CONTENT SWAPPER */}
      {activeTab === 'users' ? (
          <div className="space-y-6">
              {/* CONTROLS */}
              <div className="flex flex-col md:flex-row gap-4">
                  <div className={`flex-1 flex items-center gap-3 p-4 rounded-2xl border ${isDark ? 'bg-black/20 border-white/10' : 'bg-white border-gray-200'}`}>
                      <Search size={20} className="opacity-40" />
                      <input 
                        type="text" 
                        placeholder="Buscar por nome, matrícula ou curso..." 
                        value={searchUser}
                        onChange={(e) => setSearchUser(e.target.value)}
                        className={`flex-1 bg-transparent outline-none font-medium ${isDark ? 'text-white placeholder:text-gray-600' : 'text-gray-900 placeholder:text-gray-400'}`}
                      />
                  </div>

                  <div className={`flex p-1 rounded-2xl border ${isDark ? 'bg-black/20 border-white/10' : 'bg-white border-gray-200'}`}>
                      <button 
                        onClick={() => setFilterUserType('all')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all ${filterUserType === 'all' ? (isDark ? 'bg-white/10 text-white shadow-sm' : 'bg-gray-100 text-gray-900') : 'opacity-50 hover:opacity-100'}`}
                      >
                          Todos
                      </button>
                      <button 
                        onClick={() => setFilterUserType('premium')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-2 ${filterUserType === 'premium' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'opacity-50 hover:opacity-100 text-amber-500'}`}
                      >
                          Premium <Crown size={12} fill="currentColor" />
                      </button>
                  </div>
                  
                  <button onClick={loadUsers} className={`p-4 rounded-2xl border transition-colors ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                      <RefreshCw size={20} className={loadingUsers ? 'animate-spin' : ''} />
                  </button>
              </div>

              {/* STATS ROW */}
              <div className="flex gap-4 text-xs font-bold uppercase tracking-widest opacity-50 px-2">
                  <span>Total: {users.length}</span>
                  <span>Premium: {premiumCount}</span>
              </div>

              {/* USERS GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {loadingUsers ? (
                     Array.from({ length: 6 }).map((_, i) => (
                         <div key={i} className={`h-48 rounded-[2rem] animate-pulse ${isDark ? 'bg-white/5' : 'bg-gray-100'}`} />
                     ))
                  ) : filteredUsers.length > 0 ? (
                     filteredUsers.map((user, idx) => {
                         const profile = user.profile || {};
                         const academic = user.academic || {};
                         const isPrem = user.isPremium;
                         const img = profile.url_foto_150x200 
                            ? (profile.url_foto_150x200.startsWith('http') ? profile.url_foto_150x200 : `https://suap.ifrn.edu.br${profile.url_foto_150x200}`)
                            : "https://i.pinimg.com/736x/9c/63/e1/9c63e1cf0546ecd4f83b7df067f440d2.jpg";
                         const lastSync = user.updated_at ? new Date(user.updated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'N/A';

                         return (
                             <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                key={user.id} 
                                className={`p-5 rounded-[2rem] border relative overflow-hidden group flex flex-col transition-all hover:scale-[1.01]
                                    ${isPrem 
                                        ? (isDark ? 'bg-gradient-to-br from-amber-900/10 to-transparent border-amber-500/30' : 'bg-gradient-to-br from-amber-50 to-white border-amber-200 shadow-md shadow-amber-500/10') 
                                        : (isDark ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-white border-gray-100 shadow-sm hover:shadow-md')
                                    }
                                `}
                             >
                                 {isPrem && (
                                     <div className="absolute top-0 right-0 bg-amber-500 text-white px-3 py-1 rounded-bl-2xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                                         <Crown size={10} fill="currentColor" /> Premium
                                     </div>
                                 )}
                                 <div className="flex items-center gap-4 mb-4">
                                     <div className={`relative w-14 h-14 rounded-2xl overflow-hidden shrink-0 border-2 ${isPrem ? 'border-amber-500' : (isDark ? 'border-white/10 bg-black' : 'border-gray-100 bg-gray-50')}`}>
                                         <img src={img} alt="User" className="w-full h-full object-cover" />
                                     </div>
                                     <div className="min-w-0">
                                         <h3 className={`font-bold text-base truncate ${isDark ? 'text-white' : 'text-gray-900'} ${isPrem ? 'text-amber-500 dark:text-amber-400' : ''}`}>
                                             {profile.nome_usual || profile.nome_completo || 'Sem Nome'}
                                         </h3>
                                         <div className="flex items-center gap-1.5 opacity-60 text-xs font-mono mt-0.5">
                                             <User size={10} /> {user.id}
                                         </div>
                                     </div>
                                 </div>
                                 <div className="space-y-2 mb-4 flex-1">
                                     <div className="flex items-center gap-2 text-xs opacity-70">
                                         <GraduationCap size={14} className={isPrem ? 'text-amber-500' : `text-${accentColor}-500`} />
                                         <span className="truncate">{profile.vinculo?.curso || academic.curso || 'Curso N/A'}</span>
                                     </div>
                                     <div className="flex items-center gap-2 text-xs opacity-70">
                                         <MapPin size={14} className={isPrem ? 'text-amber-500' : `text-${accentColor}-500`} />
                                         <span className="truncate">{profile.campus || 'Campus N/A'}</span>
                                     </div>
                                 </div>
                                 <div className={`pt-3 mt-auto border-t border-dashed ${isPrem ? 'border-amber-500/20' : (isDark ? 'border-white/10' : 'border-gray-200')}`}>
                                     <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wide opacity-50">
                                         <span className="flex items-center gap-1"><Clock size={10} /> Sincronizado</span>
                                         <span>{lastSync}</span>
                                     </div>
                                 </div>
                             </motion.div>
                         )
                     })
                  ) : (
                     <div className="col-span-full py-12 flex flex-col items-center justify-center opacity-40">
                          <Users size={48} className="mb-2" />
                          <p className="text-sm font-bold">Nenhum usuário encontrado.</p>
                     </div>
                  )}
              </div>
          </div>
      ) : (
          /* FEEDBACK TAB */
          <div className="space-y-6">
              {/* FILTERS */}
              <div className="flex justify-between items-center">
                  <div className={`flex p-1 rounded-2xl border ${isDark ? 'bg-black/20 border-white/10' : 'bg-white border-gray-200'}`}>
                      {[{id: 'all', label: 'Tudo'}, {id: 'suggestion', label: 'Sugestões', icon: Lightbulb}, {id: 'feature', label: 'Features', icon: Rocket}].map((f) => (
                          <button 
                            key={f.id}
                            onClick={() => setFilterFeedbackType(f.id as any)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-2 ${filterFeedbackType === f.id ? (isDark ? 'bg-white/10 text-white shadow-sm' : 'bg-gray-100 text-gray-900') : 'opacity-50 hover:opacity-100'}`}
                          >
                              {f.icon && <f.icon size={12} />} {f.label}
                          </button>
                      ))}
                  </div>
                  <button onClick={loadFeedbacks} className={`p-3 rounded-xl transition-colors ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-gray-200 hover:bg-gray-50'} border`}>
                      <RefreshCw size={20} className={loadingFeedbacks ? 'animate-spin' : ''} />
                  </button>
              </div>

              {/* LIST */}
              <div className="space-y-3">
                  {loadingFeedbacks ? (
                      Array.from({ length: 4 }).map((_, i) => (
                          <div key={i} className={`h-32 rounded-2xl animate-pulse ${isDark ? 'bg-white/5' : 'bg-gray-100'}`} />
                      ))
                  ) : filteredFeedbacks.length > 0 ? (
                      filteredFeedbacks.map((item) => (
                          <motion.div 
                              key={item.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`p-6 rounded-3xl border flex gap-4 ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}
                          >
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${item.type === 'feature' ? 'bg-purple-500/20 text-purple-500' : 'bg-blue-500/20 text-blue-500'}`}>
                                  {item.type === 'feature' ? <Rocket size={24} /> : <Lightbulb size={24} />}
                              </div>
                              <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-start mb-2">
                                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${item.type === 'feature' ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                          {item.type === 'feature' ? 'Nova Feature' : 'Sugestão'}
                                      </span>
                                      <span className="text-[10px] font-mono opacity-40">{new Date(item.created_at).toLocaleDateString()}</span>
                                  </div>
                                  <p className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                                      "{item.message}"
                                  </p>
                                  <div className="flex items-center gap-4 text-xs opacity-60">
                                      <div className="flex items-center gap-1.5">
                                          <User size={12} /> {item.user_id}
                                      </div>
                                      {item.contact_email && (
                                          <div className="flex items-center gap-1.5">
                                              <Mail size={12} /> {item.contact_email}
                                          </div>
                                      )}
                                  </div>
                              </div>
                          </motion.div>
                      ))
                  ) : (
                      <div className="text-center py-12 opacity-40">
                          <MessageSquare size={48} className="mx-auto mb-2" />
                          <p className="text-sm font-bold">Nenhum feedback encontrado.</p>
                      </div>
                  )}
              </div>
          </div>
      )}
    </div>
  );
};
