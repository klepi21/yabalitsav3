'use client';

import React from "react";
import { FullScreenScrollFX, FullScreenFXAPI } from "@/components/ui/full-screen-scroll-fx";
import { GetStartedButton } from "@/components/ui/get-started-button";

const sections = [
  {
    leftLabel: "Unity",
    title: (
      <>
        The App
        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '1rem', alignItems: 'center' }}>
          <img src="/appstore.svg" alt="App Store" style={{ width: '120px', height: 'auto' }} />
          <img src="/google-play-badge-coming-soon.webp" alt="Google Play" style={{ width: '135px', height: 'auto' }} />
        </div>
      </>
    ),
    rightLabel: "Unity",
    background: "/yabalitsa.jpg",
  },
  {
    leftLabel: "Transition",
    title: (
      <>
        Management
        <div style={{ marginTop: '1.5rem' }}>
          <GetStartedButton />
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
        FSE
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
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <img 
              src="/yabalitsalogo.png" 
              alt="Yabalitsa" 
              style={{ 
                width: '120px', 
                height: 'auto',
                filter: 'brightness(0) invert(1)'
              }} 
            />
            <div style={{ fontSize: 'clamp(0.8rem, 1.5vw, 1.2rem)', fontWeight: '400' }}>Ecosystem</div>
          </div>
        }
        footer={<div></div>}
        showProgress
        durations={{ change: 0.7, snap: 800 }}
      />
    </>
  );
}
