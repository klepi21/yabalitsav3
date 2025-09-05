'use client'

import Link from "next/link"
import { CenterUnderline, ComesInGoesOutUnderline } from "@/components/ui/underline-animation"

export function ContactFooter() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-white py-16">
      <div className="flex flex-row items-start text-black h-full uppercase space-x-8 text-sm sm:text-xl md:text-2xl lg:text-3xl">
        <div>Contact</div>
        <ul className="flex flex-col space-y-1 h-full">
          <Link href="https://instagram.com/yabalitsa" target="_blank" rel="noopener noreferrer">
            <ComesInGoesOutUnderline label="INSTAGRAM" direction="right" />
          </Link>
          <Link href="mailto:support@yabalitsa.com">
            <CenterUnderline label="SUPPORT@YABALITSA.COM" />
          </Link>
        </ul>
      </div>
    </div>
  )
}
