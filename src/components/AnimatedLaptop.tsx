"use client";

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import Image from 'next/image';

export default function AnimatedLaptop() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    // Start animation when the container's top enters the viewport
    // End animation when the container's top reaches 40% of the viewport height
    offset: ["start end", "start 40%"]
  });

  // Rotate from almost closed (75deg backwards) to fully open (0deg)
  const rotateX = useTransform(scrollYProgress, [0, 1], [70, 0]);
  // Scale up slightly as it opens for dramatic effect
  const scale = useTransform(scrollYProgress, [0, 1], [0.85, 1]);
  // Fade in
  const opacity = useTransform(scrollYProgress, [0, 0.4, 1], [0, 1, 1]);
  // Light glare effect that moves as it opens
  const glareOpacity = useTransform(scrollYProgress, [0, 1], [0.6, 0]);

  return (
    <div 
      ref={containerRef} 
      className="relative z-10 w-full max-w-[1050px] mx-auto group px-4 sm:px-0 mt-10 md:mt-0"
      style={{ perspective: 2500 }}
    >
      <motion.div 
        style={{ 
          rotateX, 
          scale, 
          opacity,
          transformOrigin: 'bottom center',
          transformStyle: 'preserve-3d'
        }}
        className="relative"
      >
        {/* Screen Bezel */}
        <div className="relative rounded-t-[1.5rem] sm:rounded-t-[2.5rem] border-[6px] sm:border-[16px] border-b-0 border-[#121415] bg-[#121415] shadow-[0_-30px_100px_-20px_rgba(52,211,153,0.3)] overflow-hidden">
          
          {/* Camera / Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-4 sm:h-6 w-20 sm:w-32 bg-[#121415] rounded-b-xl sm:rounded-b-2xl z-20 flex items-center justify-center">
            <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-[#202425] border border-black/50 shadow-inner" />
          </div>
          
          {/* Screen Content */}
          <div className="relative rounded-t-xl sm:rounded-t-2xl overflow-hidden bg-[#fafafa] ring-1 ring-white/10">
            <Image
              src="/dashboard-preview.png"
              alt="Yabalitsa Dashboard Preview"
              width={1920}
              height={1080}
              quality={100}
              priority
              sizes="(max-width: 1200px) 100vw, 1200px"
              className="w-full h-auto object-contain block group-hover:scale-[1.03] transition-transform duration-[1500ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] origin-top"
            />
          </div>
          
          {/* Moving Screen Glare */}
          <motion.div 
            style={{ opacity: glareOpacity }}
            className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent pointer-events-none z-10 mix-blend-overlay" 
          />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/80 to-transparent pointer-events-none z-10" />
        </div>
      </motion.div>
      
      {/* Base Lip (Keyboard deck / hinge base) - stays fixed, screen rotates above it */}
      <div className="relative z-20 h-2.5 sm:h-4 w-[104%] -ml-[2%] bg-gradient-to-b from-[#3a3d3e] via-[#1a1d1e] to-black rounded-t-sm sm:rounded-t-md shadow-[0_5px_20px_rgba(0,0,0,0.6)] border-t border-white/10" />
      <div className="relative z-20 h-1 sm:h-2 w-[104%] -ml-[2%] bg-[#0a0c0c] rounded-b-xl sm:rounded-b-2xl" />
      
      {/* Thumb groove */}
      <div className="absolute top-[100%] left-1/2 -translate-x-1/2 w-20 h-2 sm:h-3 bg-[#0a0c0c] rounded-b-full shadow-inner z-20 -mt-[4px] sm:-mt-[8px]" />
    </div>
  );
}
