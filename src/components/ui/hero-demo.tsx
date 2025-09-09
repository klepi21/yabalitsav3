'use client';

import React from "react";
import { FullScreenScrollFX, FullScreenFXAPI } from "@/components/ui/full-screen-scroll-fx";
import { GetStartedButton } from "@/components/ui/get-started-button";
// Removed WaitlistComponent per request
import IPhoneMockup from "@/components/ui/iphone-mockup";
import Link from "next/link";
import { Instagram } from "lucide-react";

const sections = [
  {
    leftLabel: "Unity",
    title: (
      <div className="flex flex-col justify-center items-center h-full w-full">
        <div className="transform scale-[0.8] md:scale-100">
          <div className="relative flex items-center justify-center gap-0 md:gap-6">
            {/* App Store button - left of device */}
            <img 
              src="/appstore.svg" 
              alt="App Store" 
              className="w-[80px] md:w-[100px] h-auto -mr-16 md:mr-0" 
              style={{ opacity: 0.8 }} 
            />
            
            {/* iPhone mockup in center */}
            <IPhoneMockup
              model="15-pro"
              color="natural-titanium"
              scale={0.6}
              wallpaper="/main.png"
            />
            
            {/* Google Play button - right of device */}
            <img 
              src="/google-play-badge-coming-soon.webp" 
              alt="Google Play" 
              className="w-[90px] md:w-[110px] h-auto -ml-16 md:ml-0" 
              style={{ opacity: 0.8 }} 
            />
          </div>
        </div>
      </div>
    ),
    rightLabel: "Unity",
    background: "/yabalitsa.jpg",
  },
  {
    leftLabel: "Transition",
    title: (
      <>
        <div style={{ fontSize: '0.7em', marginBottom: '0.5rem' }}>Management</div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
          <GetStartedButton />
          <Link 
            href="/venue-login" 
            style={{ 
              color: 'white', 
              textDecoration: 'underline', 
              fontSize: '12px',
              opacity: 0.7
            }}
          >
            Already an Owner? Log in here
          </Link>
        </div>
      </>
    ),
    rightLabel: "Transition",
    background: "/management.jpg",
  },
  {
    leftLabel: "Flow",
    title: (
      <>
        <div style={{ fontSize: '0.7em' }}>FSE</div>
        <div style={{ fontSize: '0.3em', fontWeight: '400', marginTop: '0.2em' }}>
          (football search engine)
        </div>
      </>
    ),
    rightLabel: "Flow",
    background: "/stadium-931975_1920.jpg",
  },
];

export default function HeroDemo() {
  const apiRef = React.useRef<FullScreenFXAPI>(null);

  return (
    <>
      <FullScreenScrollFX
        sections={sections}
        header={
          <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
            <img 
              src="/yabalo.png" 
              alt="Yabalitsa" 
              style={{ 
                width: '300px', 
                height: 'auto',
                filter: 'brightness(0) invert(1)'
              }} 
            />
            {/* Desktop/Tablet CTA - top right */}
            <Link
              href="https://www.instagram.com/yabalitsa"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex absolute right-4 top-2 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-white backdrop-blur-md hover:bg-white/20 transition z-50 pointer-events-auto"
            >
              <Instagram className="w-4 h-4" />
              <span className="text-xs font-medium">Follow us</span>
            </Link>
            {/* Mobile CTA removed by request */}
          </div>
        }
        footer={<div></div>}
        showProgress
        durations={{ change: 0.7, snap: 800 }}
      />
    </>
  );
}
