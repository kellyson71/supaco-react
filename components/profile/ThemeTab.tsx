import React from 'react';
import { motion } from 'framer-motion';
import { Eye, Sun, Moon, Palette, ImageIcon, Link2 } from 'lucide-react';

const WALLPAPERS = [
    "https://images2.alphacoders.com/134/thumb-1920-1345658.png",
    "https://images7.alphacoders.com/134/thumb-1920-1344447.png",
    "https://images7.alphacoders.com/140/thumb-1920-1402439.jpg",
    "https://images6.alphacoders.com/129/thumb-1920-1297223.jpg",
    "https://images.alphacoders.com/135/thumb-1920-1350151.png",
    "https://images8.alphacoders.com/134/thumb-1920-1345659.png",
    "https://images.alphacoders.com/644/thumb-1920-644146.jpg",
    "https://images8.alphacoders.com/135/thumb-1920-1351412.png",
    "https://images7.alphacoders.com/135/thumb-1920-1359055.png",
    "https://images6.alphacoders.com/135/thumb-1920-1351414.png",
    "https://images6.alphacoders.com/134/thumb-1920-1345656.png",
    "https://images7.alphacoders.com/966/thumb-1920-966372.jpg",
    "https://images4.alphacoders.com/138/thumb-1920-1383047.jpg",
    "https://images8.alphacoders.com/138/thumb-1920-1382989.png",
    "https://images6.alphacoders.com/132/thumb-1920-1323578.png"
];

const SectionHeader = ({ icon: Icon, title, color }: any) => (
    <div className="flex items-center gap-2 mb-4 opacity-70">
        <Icon size={16} className={`text-${color}-500`} />
        <h3 className="text-xs font-black uppercase tracking-widest">{title}</h3>
    </div>
);

export const ThemeTabContent = ({ isDark, accentColor, onToggleTheme, currentWallpaper, onWallpaperChange, themeVariant, onThemeVariantChange }: any) => {
    return (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-3xl mx-auto space-y-8 pb-10">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div>
                     <SectionHeader icon={Eye} title="Pré-visualização" color={accentColor} />
                     <div className={`w-full aspect-video rounded-xl relative overflow-hidden border-2 shadow-xl transition-all ${isDark ? 'bg-slate-900 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                         <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: `url(${currentWallpaper})`, filter: themeVariant === 'sepia' ? 'sepia(100%)' : themeVariant === 'monochrome' ? 'grayscale(100%)' : 'none' }} />
                         <div className="absolute inset-0 p-4 flex flex-col justify-between">
                              <div className={`h-2 w-1/3 rounded-full ${isDark ? 'bg-white/20' : 'bg-black/10'}`} />
                              <div className="flex gap-2">
                                   <div className={`h-16 w-1/2 rounded-xl ${isDark ? `bg-${accentColor}-500/20 border border-${accentColor}-500/30` : `bg-${accentColor}-100 border border-${accentColor}-200`}`} />
                                   <div className={`h-16 w-1/2 rounded-xl ${isDark ? 'bg-white/5 border border-white/5' : 'bg-white border border-gray-100'}`} />
                              </div>
                         </div>
                    </div>
                     <div className="mt-4 flex justify-center gap-4">
                        <button onClick={onToggleTheme} className={`flex-1 py-3 rounded-xl border text-xs font-bold uppercase transition-colors flex items-center justify-center gap-2 ${isDark ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800'}`}>
                            {isDark ? <Sun size={14} /> : <Moon size={14} />}
                            {isDark ? 'Modo Claro' : 'Modo Escuro'}
                        </button>
                     </div>
                 </div>
                 <div className="space-y-6">
                      <div>
                        <SectionHeader icon={Palette} title="Estilo de Cor" color={accentColor} />
                        <div className="grid grid-cols-2 gap-2">
                            {['dynamic', 'saturated', 'monochrome', 'sepia'].map((v) => (
                                <button key={v} onClick={() => onThemeVariantChange(v)} className={`p-3 rounded-xl border text-xs font-bold uppercase transition-all ${themeVariant === v ? `bg-${accentColor}-500 text-white border-${accentColor}-600` : (isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-gray-200 hover:bg-gray-50')}`}>{v}</button>
                            ))}
                        </div>
                      </div>
                      <div>
                          <SectionHeader icon={ImageIcon} title="Papel de Parede" color={accentColor} />
                          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-[200px] overflow-y-auto custom-scroll pr-1">
                                {WALLPAPERS.map((wp, i) => (
                                    <button key={i} onClick={() => onWallpaperChange(wp)} className={`relative aspect-square rounded-xl bg-cover bg-center overflow-hidden transition-transform hover:scale-105 ${currentWallpaper === wp ? `ring-2 ring-${accentColor}-500 ring-offset-2 ${isDark ? 'ring-offset-black' : 'ring-offset-white'}` : ''}`} style={{ backgroundImage: `url(${wp})` }} />
                                ))}
                          </div>
                          <div className={`flex items-center gap-2 p-3 mt-3 rounded-xl border transition-colors focus-within:border-${accentColor}-500 ${isDark ? 'bg-black/20 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                                <Link2 size={16} className="opacity-40" />
                                <input type="text" value={currentWallpaper} onChange={(e) => onWallpaperChange(e.target.value)} placeholder="URL da imagem..." className="bg-transparent outline-none w-full text-xs font-bold" />
                         </div>
                      </div>
                 </div>
             </div>
        </motion.div>
    );
};