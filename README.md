# 🏟️ Yabalitsa Management - Football Pitch Management System

A modern, responsive web application for managing football pitch venues, bookings, and operations. Built with Next.js, TypeScript, and Tailwind CSS.

## ⚠️ Important: Firebase Integration

**This system is designed to work alongside your existing Firebase app without conflicts.**

**Your existing collections remain untouched:**
- `games`
- `notification_logs`
- `notification_requests`
- `users`
- `venues`

**New collections use `yabalitsa_` prefix:**
- `yabalitsa_venues` - Football venue information
- `yabalitsa_pitches` - Individual pitch details
- `yabalitsa_bookings` - Booking records
- `yabalitsa_customers` - Customer information
- `yabalitsa_timeSlots` - Available time slots
- `yabalitsa_blockedSlots` - Blocked/unavailable slots
- `yabalitsa_venueSettings` - Venue-specific configurations

## ✨ Features

### 🏢 Venue Management
- **Add/Edit/Delete Venues**: Complete venue information management
- **Contact Details**: Email, phone, and address management
- **Notes & Documentation**: Additional venue information and notes

### ⚽ Pitch Management
- **Multiple Pitch Types**: Support for 5-a-side, 7-a-side, futsal, and 11-a-side
- **Flexible Scheduling**: Customizable opening hours and slot durations
- **Pricing Configuration**: Set fixed prices per time slot
- **Opening Hours**: Daily schedule management with open/close times

### 📅 Booking System
- **Manual Booking Creation**: Staff can create bookings for users
- **Booking Management**: Edit, cancel, and reschedule existing bookings
- **Status Tracking**: Confirmed, pending, and cancelled booking states
- **User Records**: Store customer contact information and booking history

### 📊 Dashboard & Analytics
- **Real-time Statistics**: Today's bookings, revenue, and occupancy
- **Performance Metrics**: Venue and pitch utilization tracking
- **Revenue Analytics**: Financial performance and trends
- **Quick Actions**: Fast access to common operations

### 👥 User Management
- **Customer Records**: Store user contact information
- **Booking History**: Track user booking patterns
- **Contact Management**: Email and phone number storage

### ⚙️ System Settings
- **Timezone Configuration**: Support for multiple time zones
- **Currency Settings**: Multi-currency support
- **Booking Rules**: Configurable booking policies
- **Notification Preferences**: Email, SMS, and push notification settings

## 🚀 Technology Stack

- **Frontend**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Heroicons
- **Forms**: React Hook Form with Zod validation
- **Date Handling**: date-fns
- **Database**: Firebase (Firestore & Authentication)
- **UI Components**: Headless UI

## 📁 Project Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── venues/            # Venue management pages
│   ├── pitches/           # Pitch management pages
│   ├── bookings/          # Booking management pages
│   ├── users/             # User management pages
│   ├── reports/           # Analytics and reporting
│   └── settings/          # System configuration
├── components/            # Reusable UI components
├── lib/                   # Firebase configuration
├── types/                 # TypeScript type definitions
├── utils/                 # Utility functions
└── hooks/                 # Custom React hooks
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Firebase project (yabalitsa-6f5e8)

### 1. Clone the Repository
```bash
git clone <repository-url>
cd yabalitsa-management
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Firebase Configuration
1. Your Firebase config is already set up in `src/lib/firebase.ts`
2. Enable Firestore Database in your Firebase project
3. Set up security rules from `firestore.rules` file
4. **Important**: The system will create new collections with `yabalitsa_` prefix

### 4. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🔥 Firebase Collections Structure

### Yabalitsa Venues Collection
```typescript
interface Venue {
  id: string;
  name: string;
  address: string;
  contactDetails: {
    email: string;
    phone: string;
  };
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Yabalitsa Pitches Collection
```typescript
interface Pitch {
  id: string;
  venueId: string;
  name: string;
  type: '5-a-side' | '7-a-side' | 'futsal' | '11-a-side';
  size: string;
  defaultOpeningHours: Record<string, { open: string; close: string; isOpen: boolean }>;
  slotDuration: number; // in minutes
  pricePerSlot: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### Yabalitsa Bookings Collection
```typescript
interface Booking {
  id: string;
  slotId: string;
  pitchId: string;
  venueId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  startTime: Date;
  endTime: Date;
  price: number;
  status: 'confirmed' | 'pending' | 'cancelled';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Yabalitsa Customers Collection
```typescript
interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: Date;
  updatedAt: Date;
}
```

## 🎯 Key Features Implementation

### Automatic Slot Generation
The system automatically generates time slots based on:
- Opening hours for each pitch
- Slot duration configuration
- Available time windows

### Blocking System
- **Individual Slots**: Block specific time slots
- **Full Days**: Block entire days (holidays, maintenance)
- **Recurring Blocks**: Weekly/monthly recurring closures

### Booking Management
- **Manual Creation**: Staff can create bookings for customers
- **Flexible Scheduling**: Move bookings between slots and pitches
- **Status Management**: Track booking lifecycle

## 📱 Responsive Design

- **Mobile-First**: Optimized for mobile devices
- **Responsive Layout**: Adapts to all screen sizes
- **Touch-Friendly**: Optimized for touch interactions
- **Accessibility**: WCAG compliant design

## 🔒 Security Features

- **Firebase Authentication**: Secure user management
- **Role-Based Access**: Different permission levels
- **Data Validation**: Zod schema validation
- **Secure Storage**: Firebase security rules
- **Collection Isolation**: `yabalitsa_` prefix prevents conflicts

## 🚧 Future Enhancements

### Phase 2: User Booking Portal
- **Online Booking**: Customer self-service portal
- **Payment Integration**: Stripe/PayPal integration
- **Real-time Availability**: Live slot availability
- **Mobile App**: React Native mobile application

### Phase 3: Advanced Features
- **Recurring Bookings**: Weekly/monthly recurring slots
- **Team Management**: Group bookings and team accounts
- **Equipment Rental**: Additional services integration
- **Multi-language**: Internationalization support

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- Tailwind CSS for the utility-first CSS framework
- Firebase for the backend services
- Heroicons for the beautiful icons

---

**Built with ❤️ for football pitch management**

**No conflicts with your existing Firebase app! 🎉**
