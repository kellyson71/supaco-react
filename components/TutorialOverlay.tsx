
import React, { useState, useEffect, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check, X, Sparkles, Navigation, MousePointerClick, Zap } from 'lucide-react';

export interface TutorialStep {
  targetId: string;
  mobileTargetId?: string; // Fallback for mobile if ID differs
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  icon?: any;
}

interface TutorialOverlayProps {
  steps: TutorialStep[];
  onComplete: () => void;
  isDarkMode: boolean;
  primaryColor: string;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ steps, onComplete, isDarkMode, primaryColor }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [windowSize, setWindowSize] = useState({ w: window.innerWidth, h: window.innerHeight });

  const currentStep = steps[currentStepIndex];

  // Update rect on resize or step change
  const updateRect = () => {
    // Try primary ID first, then mobile fallback
    let el = document.getElementById(currentStep.targetId);
    if (!el && currentStep.mobileTargetId) {
      el = document.getElementById(currentStep.mobileTargetId);
    }

    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
      // Scroll element into view if needed
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    } else {
      // Element not found (maybe hidden on this screen size), skip or center?
      // For now, let's just center a generic box if target is missing to avoid crash
      setTargetRect(null); 
    }
  };

  useLayoutEffect(() => {
    updateRect();
    // Small delay to ensure DOM is ready/animations finished
    const t = setTimeout(updateRect, 300);
    return () => clearTimeout(t);
  }, [currentStepIndex, windowSize]);

  useEffect(() => {
    const handleResize = () => setWindowSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const isLastStep = currentStepIndex === steps.length - 1;

  // Calculate Tooltip Position
  const getTooltipStyle = () => {
    if (!targetRect) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

    const gap = 20;
    const tooltipWidth = Math.min(300, window.innerWidth - 40);
    
    // Default preferred position
    let top, left, xTransform = '-50%', yTransform = '0';
    const pos = currentStep.position || 'bottom';

    if (pos === 'bottom') {
        top = targetRect.bottom + gap;
        left = targetRect.left + targetRect.width / 2;
    } else if (pos === 'top') {
        top = targetRect.top - gap;
        left = targetRect.left + targetRect.width / 2;
        yTransform = '-100%';
    } else if (pos === 'right') {
        top = targetRect.top + targetRect.height / 2;
        left = targetRect.right + gap;
        xTransform = '0';
        yTransform = '-50%';
    } else { // left
        top = targetRect.top + targetRect.height / 2;
        left = targetRect.left - gap;
        xTransform = '-100%';
        yTransform = '-50%';
    }

    // Boundary checks (very basic)
    if (top < 0) top = 20;
    if (left < 0) left = 20;
    if (left + tooltipWidth > window.innerWidth) left = window.innerWidth - tooltipWidth - 20;
    // Mobile override: if width is small, force center horizontal
    if (window.innerWidth < 600) {
        left = window.innerWidth / 2;
        xTransform = '-50%';
        // Force bottom or top if side positioning fails on mobile
        if (pos === 'left' || pos === 'right') {
             top = targetRect.bottom + gap;
             yTransform = '0';
        }
    }

    return { top, left, transform: `translate(${xTransform}, ${yTransform})` };
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] overflow-hidden"
    >
      {/* 
         THE SPOTLIGHT:
         Instead of a mask, we render a div exactly where the target is,
         and give it a MASSIVE box-shadow to darken everything else.
      */}
      {targetRect && (
        <motion.div
            layoutId="spotlight"
            className="absolute rounded-2xl pointer-events-none"
            initial={false}
            animate={{
                top: targetRect.top - 4,
                left: targetRect.left - 4,
                width: targetRect.width + 8,
                height: targetRect.height + 8,
            }}
            transition={{ type: "spring", stiffness: 200, damping: 30 }}
            style={{
                boxShadow: `0 0 0 9999px ${isDarkMode ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.8)'}`,
                border: `2px solid ${primaryColor === 'black' ? 'white' : 'var(--color-primary-500, #ec4899)'}` // Fallback pink
            }}
        >
             {/* Pulse Effect around target */}
             <span className="absolute -inset-1 rounded-2xl animate-ping opacity-75 border-2 border-white/50"></span>
        </motion.div>
      )}

      {/* If no target (fallback centered modal basically) */}
      {!targetRect && (
         <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      )}

      {/* The Tooltip Card */}
      <AnimatePresence mode="wait">
        <motion.div
            key={currentStepIndex}
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className={`absolute w-[300px] p-6 rounded-[1.5rem] shadow-2xl backdrop-blur-xl border flex flex-col gap-4
                ${isDarkMode ? 'bg-slate-900/90 border-white/20 text-white' : 'bg-white/90 border-gray-200 text-gray-900'}
            `}
            style={{
                ...getTooltipStyle(),
                maxWidth: '90vw'
            }}
        >
             {/* Step Indicator */}
             <div className="flex items-center justify-between mb-1">
                 <div className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${isDarkMode ? 'bg-white/10' : 'bg-black/5'}`}>
                    Passo {currentStepIndex + 1} de {steps.length}
                 </div>
                 <button 
                    onClick={onComplete}
                    className="p-1 hover:opacity-70 transition-opacity"
                 >
                     <X size={16} className="opacity-50" />
                 </button>
             </div>

             {/* Content */}
             <div>
                <div className="flex items-center gap-3 mb-2">
                    {currentStep.icon && (
                        <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-white/10' : 'bg-gray-100'}`}>
                            {React.cloneElement(currentStep.icon, { size: 20, className: isDarkMode ? 'text-white' : 'text-black' })}
                        </div>
                    )}
                    <h3 className="text-xl font-black leading-none">{currentStep.title}</h3>
                </div>
                <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    {currentStep.description}
                </p>
             </div>

             {/* Footer Controls */}
             <div className="flex items-center justify-between mt-2 pt-4 border-t border-dashed border-gray-500/20">
                 <div className="flex gap-1">
                    {steps.map((_, i) => (
                        <div 
                            key={i} 
                            className={`h-1.5 rounded-full transition-all duration-300 ${i === currentStepIndex ? `w-6 ${isDarkMode ? 'bg-white' : 'bg-black'}` : `w-1.5 ${isDarkMode ? 'bg-white/20' : 'bg-black/10'}`}`} 
                        />
                    ))}
                 </div>
                 <button 
                    onClick={handleNext}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wide transition-transform active:scale-95 shadow-lg
                        ${isDarkMode ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800'}
                    `}
                 >
                    {isLastStep ? 'Começar' : 'Próximo'}
                    {isLastStep ? <Check size={14} /> : <ArrowRight size={14} />}
                 </button>
             </div>

        </motion.div>
      </AnimatePresence>

    </motion.div>
  );
};
