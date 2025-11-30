
import React from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowRight, Crown, Check, Monitor, Zap, ImageIcon, Link2, 
  HardDrive, Download, Trash2, Fingerprint, Star 
} from 'lucide-react';
import { PerformanceSettings } from '../../types';
import { SecureStorage } from '../../services/SecureStorage';

const ToggleSwitch = ({ checked, onChange, color }: { checked: boolean, onChange: () => void, color: string }) => (
    <button 
        onClick={onChange}
        className={`w-12 h-7 rounded-full transition-colors relative ${checked ? `bg-${color}-500` : 'bg-gray-300 dark:bg-white/10'}`}
    >
        <motion.div 
            layout 
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-sm`} 
            style={{ x: checked ? 20 : 0 }}
        />
    </button>
);

const SectionHeader = ({ icon: Icon, title, color }: any) => (
    <div className="flex items-center gap-2 mb-4 opacity-70">
        <Icon size={16} className={`text-${color}-500`} />
        <h3 className="text-xs font-black uppercase tracking-widest">{title}</h3>
    </div>
);

const PROFILE_PRESETS = [
    "https://i.pinimg.com/736x/d9/31/6b/d9316bb79323a47e5916d25fdc75b66d.jpg",
    "https://i.pinimg.com/1200x/d8/c7/49/d8c7496b4e8595e5483df105b075bfae.jpg",
    "https://i.pinimg.com/736x/72/e2/67/72e26742dea1322472577603d66439db.jpg",
    "https://i.pinimg.com/736x/fb/86/70/fb8670f005fdd6c56ec6346f1bd86b2d.jpg",
    "https://i.pinimg.com/736x/1a/63/13/1a6313cde710d43b3a2c30866c50b0c2.jpg"
];

const CURRENT_VERSION = "2.6.0";

export const SettingsTabContent = ({ isDark, accentColor, performanceSettings, onUpdatePerformance, customPhotoUrl, onUpdateCustomPhoto, useCustomPhoto, onToggleCustomPhoto, onInstallPwa, canInstall, isPremium, onOpenPremiumModal, userData, onLinkClassroom, isClassroomLinked, classroomStatus, googleUser }: any) => {
    return (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-3xl mx-auto space-y-8 pb-10">
            
            {/* REDESIGNED PREMIUM BANNER */}
            {!isPremium ? (
                <div onClick={onOpenPremiumModal} className="group relative w-full overflow-hidden rounded-[24px] bg-[#0A0A0B] border border-white/5 cursor-pointer shadow-xl transition-all hover:scale-[1.01] hover:shadow-violet-500/10">
                    {/* Abstract Shapes */}
                    <div className="absolute top-[-50%] right-[-10%] w-[300px] h-[300px] rounded-full bg-violet-600/20 blur-[80px] pointer-events-none group-hover:bg-violet-600/30 transition-colors" />
                    <div className="absolute bottom-[-50%] left-[-10%] w-[200px] h-[200px] rounded-full bg-indigo-600/10 blur-[60px] pointer-events-none" />
                    
                    <div className="relative z-10 p-6 sm:p-8 flex items-center justify-between">
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="px-2.5 py-1 rounded-md bg-white/10 border border-white/5 text-[10px] font-bold text-white uppercase tracking-wider backdrop-blur-md">
                                    Upgrade
                                </div>
                                <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider flex items-center gap-1">
                                    <Star size={10} fill="currentColor" /> Recomendado
                                </span>
                            </div>
                            
                            <div>
                                <h3 className="text-3xl font-bold text-white tracking-tight">Supaco <span className="text-violet-400">Pro</span></h3>
                                <p className="text-gray-400 text-sm font-medium mt-1 max-w-sm leading-relaxed">
                                    Desbloqueie o potencial máximo da IA, temas exclusivos e suporte o projeto.
                                </p>
                            </div>
                        </div>

                        <div className="hidden sm:flex items-center justify-center w-14 h-14 rounded-full bg-white/5 border border-white/10 text-white group-hover:bg-violet-600 group-hover:border-violet-500 transition-all duration-300">
                            <ArrowRight size={24} className="group-hover:translate-x-0.5 transition-transform" />
                        </div>
                    </div>
                </div>
            ) : (
                <div className="relative w-full overflow-hidden rounded-[24px] bg-gradient-to-br from-violet-900 to-[#0A0A0B] border border-white/10 shadow-xl">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/20 blur-[80px]" />
                    <div className="relative z-10 p-8 flex items-center justify-between">
                        <div>
                             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/30 border border-white/10 text-violet-200 text-[10px] font-bold uppercase tracking-wider mb-3">
                                 <Check size={10} strokeWidth={4} /> Assinatura Ativa
                             </div>
                            <h3 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">Membro Pro <Crown size={20} fill="currentColor" className="text-violet-400" /></h3>
                            <p className="text-white/60 text-xs font-medium max-w-sm">Obrigado por apoiar o desenvolvimento do Supaco.</p>
                        </div>
                    </div>
                </div>
            )}
            
            {/* GOOGLE CLASSROOM SETTINGS */}
            <div>
                <SectionHeader icon={Monitor} title="Integrações" color={accentColor} />
                <div className={`rounded-[2rem] border overflow-hidden ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
                    
                    {/* SUAP Integration Info */}
                    <div className={`p-5 flex items-center justify-between border-b ${isDark ? 'border-white/5' : 'border-gray-50'}`}>
                        <div className="flex items-center gap-4">
                            <div className={`p-2.5 rounded-xl ${isDark ? `bg-${accentColor}-500/20 text-${accentColor}-500` : `bg-${accentColor}-100 text-${accentColor}-600`}`}>
                                <Fingerprint size={18} />
                            </div>
                            <div>
                                <div className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Conta SUAP</div>
                                <div className="text-[10px] font-medium opacity-60">
                                    {userData?.email_academico || userData?.email_secundario || "Email não disponível"}
                                </div>
                            </div>
                        </div>
                        <div className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase ${isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600'}`}>
                            Conectado
                        </div>
                    </div>

                    <div className={`p-5 flex items-center justify-between`}>
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                {googleUser?.picture ? (
                                    <div className="w-10 h-10 rounded-xl overflow-hidden shadow-sm border border-white/10">
                                        <img src={googleUser.picture} alt="Google Profile" className="w-full h-full object-cover" />
                                    </div>
                                ) : (
                                    <div className={`p-2.5 rounded-xl ${classroomStatus === 'connected' ? 'bg-green-500/20 text-green-500' : (classroomStatus === 'expired' ? 'bg-red-500/20 text-red-500' : (isDark ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-gray-500'))}`}>
                                        <Monitor size={18} />
                                    </div>
                                )}
                                {classroomStatus === 'connected' && (
                                    <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-[#0A0A0B] rounded-full" />
                                )}
                            </div>
                            <div>
                                <div className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Google Classroom</div>
                                <div className="text-[10px] font-medium opacity-60 flex flex-col">
                                    {googleUser?.email ? (
                                        <span className="truncate max-w-[150px] md:max-w-xs">{googleUser.email}</span>
                                    ) : (
                                        <span>{classroomStatus === 'connected' ? 'Sincronizado' : (classroomStatus === 'expired' ? 'Sessão Expirada' : 'Não conectado')}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <button 
                            onClick={onLinkClassroom} 
                            className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-colors
                                ${classroomStatus === 'connected' 
                                    ? `bg-green-500/10 text-green-500` 
                                    : (classroomStatus === 'expired' 
                                        ? `bg-red-500 text-white animate-pulse` 
                                        : `bg-${accentColor}-500 text-white`)}
                            `}
                        >
                            {classroomStatus === 'connected' ? 'Reconectar' : (classroomStatus === 'expired' ? 'Reconectar Agora' : 'Conectar')}
                        </button>
                    </div>
                </div>
            </div>

            <div>
                <SectionHeader icon={Zap} title="Performance & Visual" color={accentColor} />
                <div className={`rounded-[2rem] border overflow-hidden ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
                    {[{ key: 'reduceMotion', label: 'Reduzir Movimento', desc: 'Remove animações para maior fluidez.' }, { key: 'disableBlur', label: 'Desativar Blur', desc: 'Remove transparências (Economia de Bateria).' }, { key: 'disableGlow', label: 'Modo Simples', desc: 'Remove sombras e brilhos excessivos.' }].map((setting: any) => (
                         <div key={setting.key} className={`p-5 flex items-center justify-between border-b last:border-0 ${isDark ? 'border-white/5 hover:bg-white/5' : 'border-gray-50 hover:bg-gray-50'} transition-colors`}>
                            <div><div className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{setting.label}</div><div className="text-[10px] font-medium opacity-60">{setting.desc}</div></div>
                            <ToggleSwitch checked={(performanceSettings as any)[setting.key]} onChange={() => onUpdatePerformance({...performanceSettings, [setting.key]: !(performanceSettings as any)[setting.key]})} color={accentColor} />
                        </div>
                    ))}
                </div>
            </div>
            <div>
                <SectionHeader icon={ImageIcon} title="Personalização" color={accentColor} />
                <div className={`rounded-[2rem] border overflow-hidden ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
                     <div className={`p-5 flex flex-col gap-4 border-b ${isDark ? 'border-white/5' : 'border-gray-50'}`}>
                        <div className="flex items-center justify-between">
                            <div><div className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Foto Personalizada</div><div className="text-[10px] font-medium opacity-60">Substitua a foto oficial do SUAP.</div></div>
                            <ToggleSwitch checked={useCustomPhoto} onChange={() => onToggleCustomPhoto(!useCustomPhoto)} color={accentColor} />
                        </div>
                        {useCustomPhoto && (
                            <div className="space-y-4 pt-2">
                                <div className={`flex items-center gap-2 p-3 rounded-xl border transition-colors focus-within:border-${accentColor}-500 ${isDark ? 'bg-black/20 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                                    <Link2 size={16} className="opacity-40" />
                                    <input type="text" value={customPhotoUrl} onChange={(e) => onUpdateCustomPhoto(e.target.value)} placeholder="https://imgur.com/..." className={`bg-transparent outline-none w-full text-xs font-bold ${isDark ? 'text-white' : 'text-gray-900'}`} />
                                </div>
                                <div className="grid grid-cols-5 gap-2">
                                    {PROFILE_PRESETS.map((url, i) => (
                                        <button key={i} onClick={() => onUpdateCustomPhoto(url)} className={`relative aspect-square rounded-xl bg-cover bg-center overflow-hidden transition-transform hover:scale-105 ${customPhotoUrl === url ? `ring-2 ring-${accentColor}-500 ring-offset-2 ${isDark ? 'ring-offset-black' : 'ring-offset-white'}` : ''}`} style={{ backgroundImage: `url(${url})` }} />
                                    ))}
                                </div>
                            </div>
                        )}
                     </div>
                </div>
            </div>
            <div>
                 <SectionHeader icon={HardDrive} title="Dados e Armazenamento" color={accentColor} />
                 <div className={`rounded-[2rem] border overflow-hidden ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
                      {canInstall && (
                        <div className={`p-5 flex items-center justify-between border-b ${isDark ? 'border-white/5 hover:bg-white/5' : 'border-gray-50 hover:bg-gray-50'} transition-colors`}>
                             <div className="flex items-center gap-4">
                                <div className={`p-2.5 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}><Download size={18} /></div>
                                <div><div className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Instalar Aplicativo</div><div className="text-[10px] font-medium opacity-60">Adicione à tela inicial.</div></div>
                             </div>
                             <button onClick={onInstallPwa} className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase bg-${accentColor}-500 text-white`}>Instalar</button>
                        </div>
                      )}
                      <div className={`p-5 flex items-center justify-between hover:bg-red-500/5 transition-colors cursor-pointer`} onClick={() => { if(window.confirm("Isso apagará todos os dados salvos localmente. Continuar?")) { if(userData?.matricula) SecureStorage.clearUserData(userData.matricula); localStorage.clear(); window.location.reload(); } }}>
                             <div className="flex items-center gap-4">
                                <div className={`p-2.5 rounded-xl bg-red-500/10 text-red-500`}><Trash2 size={18} /></div>
                                <div><div className="text-sm font-bold text-red-500">Limpar Cache</div><div className="text-[10px] font-medium opacity-60">Remove dados locais e sai da conta.</div></div>
                             </div>
                        </div>
                 </div>
            </div>
            <div className="text-center opacity-30 text-[10px] font-mono font-bold">SUPACO v{CURRENT_VERSION} • Developed by Electron</div>
        </motion.div>
    );
};
