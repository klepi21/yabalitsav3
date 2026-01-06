'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 px-4 py-12">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 right-10 w-72 h-72 bg-football-green opacity-5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-green-600 opacity-3 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 text-center max-w-2xl">
        {/* Football icon with 404 */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-football-green to-green-600 mb-4">
              404
            </div>
            <div className="absolute inset-0 flex items-center justify-center -z-10">
              <div className="text-6xl animate-bounce" style={{ animationDuration: '2s' }}>
                ⚽
              </div>
            </div>
          </div>
        </div>

        {/* Yabalitsa branding line */}
        <div className="mb-6">
          <h1 className="text-5xl md:text-6xl font-black text-gray-900 mb-3">
            Out of Bounds
          </h1>
          <div className="h-1.5 w-32 bg-gradient-to-r from-football-green to-green-500 mx-auto rounded-full"></div>
        </div>

        {/* Main message */}
        <div className="mb-10">
          <p className="text-xl md:text-2xl text-gray-700 mb-4 font-semibold">
            The pitch you're looking for isn't here
          </p>
          <p className="text-lg text-gray-600 mb-6 max-w-lg mx-auto leading-relaxed">
            This page seems to have gone off-field. Don't worry, we'll help you get back to the game and find what you're looking for!
          </p>
        </div>

        {/* Help section */}
        <div className="text-sm text-gray-600">
          <p className="mb-3">
            Still can't find what you need?{' '}
            <Link href="/" className="text-football-green font-bold hover:underline">
              Contact support
            </Link>
          </p>
          <p className="text-xs text-gray-500">
            Error: <span className="font-mono font-bold text-football-green">404_NOT_FOUND</span>
          </p>
        </div>
      </div>
    </div>
  );
}

