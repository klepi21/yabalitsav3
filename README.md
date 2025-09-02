# Yabalitsa Management System

A comprehensive football pitch management system built with Next.js, TypeScript, and Firebase.

## 🏗️ Project Structure

The application is organized into modules, with the **Management Module** being the first implemented:

### Root Route (`/`)
- **Clean landing page** without sidebar or authentication
- **Company branding** and description
- **Manual link** to access the management module
- **No automatic redirects** or authentication checks

### Management Module (`/management`)

The management module provides venue owners with tools to manage their football pitches, bookings, and operations.

#### Routes:
- `/management` - Main entry point (redirects based on auth status)
- `/venue-login` - Venue owner authentication (no sidebar, standalone page)
- `/management/dashboard` - Main dashboard with sidebar (requires auth)
- `/management/pitches` - Pitch management with sidebar (requires auth)
- `/management/pitches/[id]` - Individual pitch details with sidebar (requires auth)
- `/management/pitches/[id]/edit` - Pitch editing with blocked dates and sidebar (requires auth)
- `/management/bookings` - Booking management with calendar views and sidebar (requires auth)
- `/management/bookings/new` - New booking creation with recurring options and sidebar (requires auth)
- `/management/customers` - Customer management with sidebar (requires auth)
- `/management/customers/[id]` - Customer details with sidebar (requires auth)
- `/management/customers/[id]/edit` - Customer editing with sidebar (requires auth)
- `/management/reports` - Analytics dashboard with charts and reports (requires auth)
- `/management/settings` - Venue settings with sidebar (requires auth)

#### Layout Behavior:
- **Root page (`/`)** → Clean landing page without sidebar or authentication
- **Login page (`/venue-login`)** → Standalone page without sidebar
- **Management pages** → All require authentication and show sidebar
- **Sidebar only appears** on management pages (`/management/*`) when user is logged in
- **Centralized layout** → All pages use root layout, sidebar controlled by SidebarWrapper

#### Features:
- **Authentication**: Secure venue owner login system
- **Pitch Management**: Create, edit, and manage football pitches
- **Blocked Dates**: Set dates when pitches are unavailable
- **Booking System**: Manage customer bookings with calendar views
- **Recurring Bookings**: Create multiple bookings at once (weekly/daily patterns)
- **Responsive Design**: Mobile-first approach with touch-friendly interfaces

#### Key Components:
- `Sidebar` - Navigation component with emoji-based menu (only for authenticated users)
- `WeeklyCalendar` - Interactive calendar for booking management
- `BlockedDateService` - Firebase service for managing unavailable dates

## 🚀 Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up Firebase:**
   - Create a Firebase project
   - Add your Firebase config to `src/lib/firebase.ts`
   - Enable Authentication and Firestore

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Access the system:**
   - **Root page**: Visit `/` for company landing page
   - **Management**: Navigate to `/management` for venue management
   - **Create account**: Use the script to create a venue owner account
   - **Log in**: Access the dashboard and management features

## 🔧 Development Scripts

- **Create venue owner:** `npm run create-venue-owner`
- **Development:** `npm run dev`
- **Build:** `npm run build`
- **Start production:** `npm start`

## 📱 Mobile-First Design

The system is designed with mobile responsiveness in mind:
- Touch-friendly interfaces (44px minimum tap targets)
- Responsive layouts that adapt to screen sizes
- Optimized for both mobile and desktop use

## 🌐 Internationalization

- Greek language support throughout the interface
- Localized date and time formatting
- Cultural context for football terminology

## 🔒 Security Features

- Firebase Authentication for venue owners
- Secure data access with proper permissions
- Input validation and sanitization
- Protected routes with authentication checks

## 🎯 Future Modules

The system is designed to be extensible for additional modules:
- Customer Portal
- Payment Processing
- Analytics & Reporting
- Mobile Applications

## 📄 License

This project is proprietary software for Yabalitsa management operations.
