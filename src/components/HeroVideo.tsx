'use client';
import Image from 'next/image';
import { useEffect, useState } from 'react';

export default function HeroVideo() {
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const init = () => {
      setMounted(true);
      setIsMobile(window.innerWidth < 768);
    };

    queueMicrotask(init);

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!mounted) {
    return <div className="absolute inset-0 bg-[#040D12] z-0" />;
  }

  // On mobile, just show the poster image or an optimized image instead of the video
  if (isMobile) {
    return (
      <div className="absolute inset-0 w-full h-full z-0 overflow-hidden">
        <Image 
          src="/stadium-931975_1920.jpg"
          alt="Stadium Background"
          fill
          priority
          quality={65}
          sizes="100vw"
          className="object-cover object-center opacity-80"
        />
      </div>
    );
  }

  return (
    <video
      autoPlay
      loop
      muted
      playsInline
      preload="metadata"
      poster="/stadium-931975_1920.jpg"
      className="absolute top-0 left-0 w-full h-full object-cover z-0 opacity-80"
    >
      <source src="/backvide.mp4" type="video/mp4" />
    </video>
  );
}
