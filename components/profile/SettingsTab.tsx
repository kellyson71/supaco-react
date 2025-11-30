import React from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowRight, Crown, Check, Monitor, Zap, ImageIcon, Link2, 
  HardDrive, Download, Trash2 
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

const CURRENT_VERSION = "2.0.0";

export const SettingsTabContent = ({ isDark, accentColor, performanceSettings, onUpdatePerformance, customPhotoUrl, onUpdateCustomPhoto, useCustomPhoto, onToggleCustomPhoto, onInstallPwa, canInstall, isPremium, onOpenPremiumModal, userData, onLinkClassroom, isClassroomLinked, classroomStatus }: any) => {
    return (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-3xl mx-auto space-y-8 pb-10">
            {!isPremium ? (
                <div onClick={onOpenPremiumModal} className="relative overflow-hidden rounded-[2rem] p-8 cursor-pointer group shadow-xl transition-transform hover:scale-[1.01]">
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-orange-600" />
                    <div className="relative z-10 flex items-center justify-between">
                        <div>
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/20 backdrop-blur-md border border-white/10 text-white text-[10px] font-bold uppercase tracking-wider mb-3">
                                <Crown size={12} fill="currentColor" /> Recomendado
                            </div>
                            <h3 className="text-3xl font-black text-white mb-2">Seja Premium</h3>
                            <p className="text-white/80 text-sm font-medium max-w-sm">Desbloqueie IA ilimitada, temas exclusivos e suporte o desenvolvimento.</p>
                        </div>
                        <div className="hidden md:flex h-16 w-16 rounded-full bg-white text-orange-500 items-center justify-center shadow-lg group-hover:scale-110 transition-transform"><ArrowRight size={28} /></div>
                    </div>
                </div>
            ) : (
                <div className="relative overflow-hidden rounded-[2rem] p-8 shadow-xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-300 via-orange-400 to-amber-500" />
                    <div className="relative z-10 flex items-center justify-between">
                        <div>
                             <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/20 backdrop-blur-md border border-white/30 text-white text-[10px] font-bold uppercase tracking-wider mb-3 shadow-sm"><Check size={12} strokeWidth={4} /> Assinatura Ativa</div>
                            <h3 className="text-3xl font-black text-white mb-2 flex items-center gap-2">Membro Premium <Crown size={28} fill="currentColor" className="text-white" /></h3>
                            <p className="text-white/90 text-sm font-medium max-w-sm leading-relaxed">Muito obrigado pelo seu apoio!</p>
                        </div>
                    </div>
                </div>
            )}
            
            {/* GOOGLE CLASSROOM SETTINGS */}
            <div>
                <SectionHeader icon={Monitor} title="Integrações" color={accentColor} />
                <div className={`rounded-[2rem] border overflow-hidden ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
                    <div className={`p-5 flex items-center justify-between`}>
                        <div className="flex items-center gap-4">
                            <div className={`p-2.5 rounded-xl ${classroomStatus === 'connected' ? 'bg-green-500/20 text-green-500' : (classroomStatus === 'expired' ? 'bg-red-500/20 text-red-500' : (isDark ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-gray-500'))}`}>
                                <Monitor size={18} />
                            </div>
                            <div>
                                <div className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Google Classroom</div>
                                <div className="text-[10px] font-medium opacity-60">
                                    {classroomStatus === 'connected' ? 'Sincronizado' : (classroomStatus === 'expired' ? 'Sessão Expirada' : 'Não conectado')}
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
                                        <button key={i} onClick={() => onUpdateCustomPhoto(url)} className={`relative aspect-square rounded-xl bg-cover bg-center overflow-hidden transition-transform hover:scale-105 active:scale-95 ${customPhotoUrl === url ? `ring-2 ring-${accentColor}-500 ring-offset-2 ${isDark ? 'ring-offset-black' : 'ring-offset-white'}` : ''}`} style={{ backgroundImage: `url(${url})` }} />
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