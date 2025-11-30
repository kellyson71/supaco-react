import React from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';

export const HolographicCard = ({ children, primaryColor, isPremium }: { children?: React.ReactNode, primaryColor: string, isPremium?: boolean }) => {
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotateX = useTransform(y, [-100, 100], [10, -10]);
    const rotateY = useTransform(x, [-100, 100], [-10, 10]);
    const glareX = useTransform(x, [-100, 100], [0, 100]);
    const glareY = useTransform(y, [-100, 100], [0, 100]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        x.set(e.clientX - centerX);
        y.set(e.clientY - centerY);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    return (
        <div style={{ perspective: 1000 }} className="w-full h-full">
            <motion.div
                style={{ 
                    transformStyle: "preserve-3d",
                    rotateX,
                    rotateY
                }}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                className="relative w-full h-full rounded-[2rem] transition-all duration-200 ease-out"
            >
                <div 
                    className={`absolute inset-0 bg-white/10 backdrop-blur-md rounded-[2rem] shadow-xl overflow-hidden border-2 border-${primaryColor}-500/50`}
                >
                    {/* Glare Effect */}
                    <motion.div 
                        style={{
                            background: 'linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.2) 40%, rgba(255,255,255,0.4) 45%, rgba(255,255,255,0.2) 50%, transparent 54%)',
                            backgroundSize: '200% 200%',
                            backgroundPositionX: glareX + '%',
                            backgroundPositionY: glareY + '%',
                            opacity: 0.7,
                            pointerEvents: 'none'
                        }}
                        className="absolute inset-0 z-20 mix-blend-overlay"
                    />
                    {/* Content */}
                    <div className="relative z-10 p-5 md:p-6 h-full flex flex-col justify-between">
                        {children}
                    </div>
                </div>
            </motion.div>
        </div>
    );
};