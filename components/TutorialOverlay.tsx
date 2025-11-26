
import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check, X } from 'lucide-react';

export interface TutorialStep {
  targetId: string;
  mobileTargetId?: string;
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
  
  // Tooltip sizing and positioning state
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({ opacity: 0 }); // Start hidden until calculated
  const [arrowStyle, setArrowStyle] = useState<React.CSSProperties>({});
  const [placement, setPlacement] = useState<'top' | 'bottom' | 'left' | 'right'>('bottom');

  const currentStep = steps[currentStepIndex];

  // 1. Find Target & Handle Window Resize
  const updateTarget = () => {
    let el = document.getElementById(currentStep.targetId);
    if (!el && currentStep.mobileTargetId) {
      el = document.getElementById(currentStep.mobileTargetId);
    }

    if (el) {
      // Ensure element is visible
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      setTargetRect(null); 
    }
  };

  useEffect(() => {
    const handleResize = () => setWindowSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', updateTarget, true); // Update on scroll too
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', updateTarget, true);
    };
  }, []);

  // Update target when step changes
  useLayoutEffect(() => {
    updateTarget();
    // Safety timeout for animations/layout shifts
    const t = setTimeout(updateTarget, 400);
    return () => clearTimeout(t);
  }, [currentStepIndex]);


  // 2. Calculate Smart Position (Run whenever target, window, or step changes)
  useLayoutEffect(() => {
    if (!targetRect || !tooltipRef.current) return;

    const tooltip = tooltipRef.current;
    const tw = tooltip.offsetWidth || 300; // Fallback width
    const th = tooltip.offsetHeight || 200; // Fallback height
    
    const padding = 20; // Safe distance from screen edge
    const gap = 16;     // Distance from target
    
    let pos = currentStep.position || 'bottom';

    // --- A. Mobile Logic Override ---
    // On mobile, force vertical stacking (top/bottom) as side-by-side rarely fits
    if (windowSize.w < 768 && (pos === 'left' || pos === 'right')) {
        pos = 'bottom'; 
    }

    // --- B. Auto-Flip Logic ---
    // Check if preferred position causes overflow
    const spaceTop = targetRect.top;
    const spaceBottom = windowSize.h - targetRect.bottom;
    const spaceLeft = targetRect.left;
    const spaceRight = windowSize.w - targetRect.right;

    if (pos === 'bottom' && spaceBottom < (th + gap + padding)) {
        // Not enough space below, flip to top if space allows
        if (spaceTop > (th + gap + padding)) pos = 'top';
    } else if (pos === 'top' && spaceTop < (th + gap + padding)) {
        // Not enough space above, flip to bottom if space allows
        if (spaceBottom > (th + gap + padding)) pos = 'bottom';
    }

    // --- C. Coordinate Calculation ---
    let top = 0;
    let left = 0;
    
    // Center point of target
    const targetCenterX = targetRect.left + (targetRect.width / 2);
    const targetCenterY = targetRect.top + (targetRect.height / 2);

    switch (pos) {
        case 'top':
            top = targetRect.top - gap - th;
            left = targetCenterX - (tw / 2);
            break;
        case 'bottom':
            top = targetRect.bottom + gap;
            left = targetCenterX - (tw / 2);
            break;
        case 'left':
            top = targetCenterY - (th / 2);
            left = targetRect.left - gap - tw;
            break;
        case 'right':
            top = targetCenterY - (th / 2);
            left = targetRect.right + gap;
            break;
    }

    // --- D. Viewport Clamping (Keep inside screen) ---
    const originalLeft = left;
    const originalTop = top;

    // Clamp Left/Right
    left = Math.max(padding, Math.min(left, windowSize.w - tw - padding));
    
    // Clamp Top/Bottom
    top = Math.max(padding, Math.min(top, windowSize.h - th - padding));

    setTooltipStyle({ top, left, opacity: 1 });
    setPlacement(pos);

    // --- E. Arrow Positioning ---
    // The arrow needs to point to the target center, even if the card was shifted (clamped)
    const arrowSize = 12; // Half size for offset calc
    let aTop: any = 'auto', aBottom: any = 'auto', aLeft: any = 'auto', aRight: any = 'auto';
    let aRot = '0deg';

    if (pos === 'top') {
        aBottom = '-6px'; 
        aLeft = (targetCenterX - left) - arrowSize + 'px'; // Relative to card left
        aRot = '45deg';
    } else if (pos === 'bottom') {
        aTop = '-6px'; 
        aLeft = (targetCenterX - left) - arrowSize + 'px';
        aRot = '225deg';
    } else if (pos === 'left') {
        aRight = '-6px';
        aTop = (targetCenterY - top) - arrowSize + 'px';
        aRot = '-45deg';
    } else if (pos === 'right') {
        aLeft = '-6px';
        aTop = (targetCenterY - top) - arrowSize + 'px';
        aRot = '135deg';
    }

    // Clamp arrow so it doesn't detach from card corners
    // (Optional refinement, usually clamping ensures card covers target center axis)
    
    setArrowStyle({
        top: aTop, bottom: aBottom, left: aLeft, right: aRight,
        transform: `rotate(${aRot})`,
        width: '12px', height: '12px',
        position: 'absolute',
        background: isDarkMode ? '#1e293b' : 'white', // match card bg
        borderRight: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
        borderBottom: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
        zIndex: 0
    });

  }, [targetRect, windowSize, currentStepIndex]);

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const isLastStep = currentStepIndex === steps.length - 1;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] overflow-hidden"
    >
      {/* 
         THE SPOTLIGHT:
         High contrast focus ring with massive shadow to dim background.
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
                border: `2px solid ${primaryColor === 'black' ? 'white' : `var(--color-${primaryColor}-500, #ec4899)`}`
            }}
        >
             <span className={`absolute -inset-1 rounded-2xl animate-pulse opacity-50 border border-${primaryColor}-500`}></span>
        </motion.div>
      )}

      {/* Fallback overlay if no target found */}
      {!targetRect && (
         <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      )}

      {/* Tooltip Card */}
      <AnimatePresence mode="wait">
        <motion.div
            ref={tooltipRef}
            key={currentStepIndex}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={`absolute w-[320px] max-w-[90vw] p-0 rounded-[1.5rem] shadow-2xl backdrop-blur-xl border flex flex-col z-50
                ${isDarkMode ? 'bg-slate-800/90 border-white/20 text-white' : 'bg-white/90 border-gray-200 text-gray-900'}
            `}
            style={{ ...tooltipStyle }}
        >
             {/* Dynamic Arrow */}
             <div style={arrowStyle} className="pointer-events-none shadow-sm" />

             <div className="relative z-10 p-6 flex flex-col gap-4">
                 {/* Header */}
                 <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2">
                        {currentStep.icon && (
                            <div className={`p-1.5 rounded-lg ${isDarkMode ? `bg-${primaryColor}-500/20 text-${primaryColor}-400` : `bg-${primaryColor}-50 text-${primaryColor}-600`}`}>
                                {React.cloneElement(currentStep.icon, { size: 16 })}
                            </div>
                        )}
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {currentStepIndex + 1} / {steps.length}
                        </span>
                     </div>
                     <button onClick={onComplete} className="p-1 hover:opacity-70 transition-opacity">
                         <X size={16} className="opacity-50" />
                     </button>
                 </div>

                 {/* Body */}
                 <div>
                    <h3 className="text-lg font-black leading-tight mb-2">{currentStep.title}</h3>
                    <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {currentStep.description}
                    </p>
                 </div>

                 {/* Controls */}
                 <div className="flex justify-between items-center pt-2 mt-2">
                     <div className="flex gap-1.5">
                        {steps.map((_, i) => (
                            <div 
                                key={i} 
                                className={`h-1.5 rounded-full transition-all duration-300 ${i === currentStepIndex ? `w-6 bg-${primaryColor}-500` : `w-1.5 ${isDarkMode ? 'bg-white/10' : 'bg-black/10'}`}`} 
                            />
                        ))}
                     </div>
                     <button 
                        onClick={handleNext}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wide transition-transform active:scale-95 shadow-lg
                            ${isDarkMode ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800'}
                        `}
                     >
                        {isLastStep ? 'Concluir' : 'Próximo'}
                        {isLastStep ? <Check size={14} /> : <ArrowRight size={14} />}
                     </button>
                 </div>
             </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
};
