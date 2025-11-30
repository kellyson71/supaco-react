
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SecureStorage } from '../../services/SecureStorage';
import { User, Shield, Clock, Search, MapPin, GraduationCap, Users, RefreshCw, Crown, Filter, CheckCircle2 } from 'lucide-react';

interface AdminModalProps {
  isDark: boolean;
  accentColor: string;
}

export const AdminModal: React.FC<AdminModalProps> = ({ isDark, accentColor }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'premium'>('all');

  const loadUsers = async () => {
    setLoading(true);
    try {
        const data = await SecureStorage.getAllUsers();
        
        // Enrich data with Premium Status
        // Note: In a real large-scale app, this should be a joined query on the backend
        const enrichedData = await Promise.all(data.map(async (u: any) => {
            const isPremium = await SecureStorage.checkSubscriptionStatus(u.id);
            return { ...u, isPremium };
        }));

        setUsers(enrichedData);
    } catch (e) {
        console.error("Failed to load users", e);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = users.filter(u => {
    const term = search.toLowerCase();
    const name = u.profile?.nome_usual?.toLowerCase() || '';
    const mat = u.id?.toLowerCase() || '';
    const course = u.profile?.vinculo?.curso?.toLowerCase() || '';
    
    const matchesSearch = name.includes(term) || mat.includes(term) || course.includes(term);
    const matchesFilter = filterType === 'all' ? true : u.isPremium;

    return matchesSearch && matchesFilter;
  });

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
                 <h2 className={`text-3xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>Gestão de Usuários</h2>
                 <p className="text-sm opacity-60 font-medium">Visualize e monitore a base de usuários do Supaco.</p>
             </div>

             <div className="flex items-center gap-4">
                 <div className="text-right hidden md:block">
                     <div className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-0.5">Total de Usuários</div>
                     <div className={`text-3xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{users.length}</div>
                 </div>
                 <div className="w-[1px] h-10 bg-gray-500/20 hidden md:block" />
                 <div className="text-right hidden md:block">
                     <div className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-0.5">Premium</div>
                     <div className={`text-3xl font-black text-amber-500`}>{premiumCount}</div>
                 </div>
                 <button 
                    onClick={loadUsers}
                    className={`p-3 rounded-xl transition-all ${isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'}`}
                 >
                    <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                 </button>
             </div>
         </div>
      </div>

      {/* CONTROLS */}
      <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className={`flex-1 flex items-center gap-3 p-4 rounded-2xl border ${isDark ? 'bg-black/20 border-white/10' : 'bg-white border-gray-200'}`}>
              <Search size={20} className="opacity-40" />
              <input 
                type="text" 
                placeholder="Buscar por nome, matrícula ou curso..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`flex-1 bg-transparent outline-none font-medium ${isDark ? 'text-white placeholder:text-gray-600' : 'text-gray-900 placeholder:text-gray-400'}`}
              />
          </div>

          {/* Filters */}
          <div className={`flex p-1 rounded-2xl border ${isDark ? 'bg-black/20 border-white/10' : 'bg-white border-gray-200'}`}>
              <button 
                onClick={() => setFilterType('all')}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all ${filterType === 'all' ? (isDark ? 'bg-white/10 text-white shadow-sm' : 'bg-gray-100 text-gray-900') : 'opacity-50 hover:opacity-100'}`}
              >
                  Todos
              </button>
              <button 
                onClick={() => setFilterType('premium')}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-2 ${filterType === 'premium' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'opacity-50 hover:opacity-100 text-amber-500'}`}
              >
                  Premium <Crown size={12} fill="currentColor" />
              </button>
          </div>
      </div>

      {/* USERS LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
             // Skeletons
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
                         {/* Premium Badge */}
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
  );
};
