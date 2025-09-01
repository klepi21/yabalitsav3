# 🧪 Test Data Setup Guide

This guide will help you set up test data to test the entire venue management system.

## 🚀 Quick Setup

### 1. Run the Setup Script

```bash
npm run setup-test
```

This will create:
- ✅ A test venue ("Test Football Arena")
- ✅ A test venue owner account
- ✅ A test pitch
- ✅ A test customer

### 2. Test Credentials

After running the script, you'll get these credentials:

```
📧 Email: owner@testvenue.com
🔑 Password: test123456
🏟️ Venue ID: [auto-generated]
```

## 🔧 Manual Setup (Alternative)

If you prefer to set up manually or the script fails:

### 1. Create Venue Owner Account

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `yabalitsa-6f5e8`
3. Go to **Authentication** → **Users**
4. Click **Add User**
5. Enter:
   - Email: `owner@testvenue.com`
   - Password: `test123456`

### 2. Create Test Venue

1. Go to **Firestore Database**
2. Navigate to `yabalitsa_venues` collection
3. Add document with:
   ```json
   {
     "name": "Test Football Arena",
     "address": "123 Test Street, Athens, Greece",
     "contactDetails": {
       "email": "test@footballarena.com",
       "phone": "+30 210 123 4567"
     },
     "notes": "Test venue for development",
     "createdAt": [serverTimestamp],
     "updatedAt": [serverTimestamp]
   }
   ```

### 3. Create Venue Owner Document

1. Navigate to `yabalitsa_venueOwners` collection
2. Add document with:
   ```json
   {
     "venueId": "[VENUE_ID_FROM_STEP_2]",
     "email": "owner@testvenue.com",
     "name": "Test Venue Owner",
     "phone": "+30 697 123 4567",
     "role": "owner",
     "permissions": ["manage_venue", "manage_pitches", "manage_bookings", "manage_customers"],
     "createdAt": [serverTimestamp],
     "updatedAt": [serverTimestamp]
   }
   ```

## 🧪 Testing the System

### 1. Start Development Server

```bash
npm run dev
```

### 2. Access the App

1. Go to `http://localhost:3000`
2. You'll be redirected to `/venue-login`
3. Login with:
   - Email: `owner@testvenue.com`
   - Password: `test123456`

### 3. Test Features

- ✅ **Venue Dashboard** - View venue overview
- ✅ **Pitch Management** - View existing pitch, add new ones
- ✅ **Bookings** - Access bookings page
- ✅ **Customers** - Access customers page
- ✅ **Settings** - Access venue settings

## 🔍 What You'll See

### Venue Dashboard
- Venue information
- Quick stats (pitches, bookings, customers, revenue)
- Pitch overview
- Quick action buttons

### Test Data
- **1 Venue**: Test Football Arena
- **1 Pitch**: Main Pitch (5-a-side, €25/hour)
- **1 Customer**: John Test Customer
- **Opening Hours**: 9 AM - 10 PM daily

## 🚨 Troubleshooting

### Common Issues

1. **"Venue owner account not found"**
   - Check if venue owner document exists in `yabalitsa_venueOwners`
   - Verify email matches exactly

2. **"Venue not found"**
   - Check if venue document exists in `yabalitsa_venues`
   - Verify venue ID in venue owner document

3. **Authentication errors**
   - Check Firebase Authentication users
   - Verify email/password combination

### Reset Test Data

To start fresh, delete the test documents from:
- `yabalitsa_venues`
- `yabalitsa_venueOwners`
- `yabalitsa_pitches`
- `yabalitsa_customers`

Then run `npm run setup-test` again.

## 🎯 Next Steps

After testing:
1. **Create real venues** using the venue creation form
2. **Set up real venue owner accounts** for actual venues
3. **Configure real pitches** with actual opening hours and pricing
4. **Add real customers** and bookings

---

**Happy Testing! 🎉**
