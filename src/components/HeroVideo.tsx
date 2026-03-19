'use client';

import { useEffect, useState } from 'react';

export default function HeroVideo() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Only mount the video on the client to avoid blocking the initial SSR payload 
    // and to defer the heavy download by a split second.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return a placeholder or just null so the background stays dark initially
    return null;
  }

  return (
    <video
      autoPlay
      loop
      muted
      playsInline
      preload="none" // Hint browser not to aggressively block loading
      className="absolute top-0 left-0 w-full h-full object-cover z-0 opacity-80"
    >
      <source src="/backvide.mp4" type="video/mp4" />
    </video>
  );
}
