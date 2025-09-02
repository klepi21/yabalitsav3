# Venue Owner Creation Script

This script creates a new venue owner with their venue and pitch in the Yabalitsa system.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install firebase
```

### 2. Configure Firebase
Edit `create-new-venue-owner.js` and replace the `firebaseConfig` with your actual Firebase configuration:

```javascript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-actual-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

### 3. Customize Data
Edit the following sections in the script:

#### Venue Owner Details
```javascript
const venueOwnerData = {
  email: "your-email@example.com",
  password: "YourSecurePassword123!",
  firstName: "Your First Name",
  lastName: "Your Last Name",
  phone: "+306912345678"
};
```

#### Venue Details
```javascript
const venueData = {
  name: "Your Venue Name",
  address: "Your Venue Address",
  description: "Your venue description",
  // ... customize other fields
};
```

#### Pitch Details
```javascript
const pitchData = {
  name: "Your Pitch Name",
  type: "5x5", // or "6x6", "7x7", etc.
  pricePerSlot: 50, // price in euros
  slotDuration: 60, // duration in minutes
  // ... customize other fields
};
```

### 4. Run the Script
```bash
node scripts/create-new-venue-owner.js
```

## 📋 What the Script Creates

1. **User Account** - Firebase Authentication user
2. **Venue Owner Profile** - Profile in `yabalitsa_venue_owners` collection
3. **Venue** - Venue in `yabalitsa_venues` collection
4. **Pitch** - Pitch in `yabalitsa_pitches` collection
5. **Relationships** - Links between owner, venue, and pitch

## 🔐 Generated Credentials

After successful execution, the script will output:

```
📋 CREDENTIALS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 Email: your-email@example.com
🔑 Password: YourSecurePassword123!
🆔 User ID: [generated-uid]
🏟️ Venue ID: [generated-venue-id]
⚽ Pitch ID: [generated-pitch-id]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 🚨 Important Notes

- **Save credentials securely** - The password is only shown once
- **Change default data** - Update names, addresses, and contact info
- **Check Firebase rules** - Ensure your security rules allow these operations
- **Test in development** - Run this in a test environment first

## 🛠️ Troubleshooting

### Common Errors

1. **"auth/email-already-in-use"**
   - Solution: Change the email address in `venueOwnerData.email`

2. **"auth/invalid-api-key"**
   - Solution: Update `firebaseConfig` with correct values

3. **"permission-denied"**
   - Solution: Check Firebase security rules and collection names

### Debug Information
The script provides detailed error messages and suggestions for common issues.

## 🔄 Multiple Venues

To create multiple venue owners, simply:
1. Copy the script
2. Change the data variables
3. Run again

## 📱 Login

After creation, the venue owner can login at:
- **URL**: `/venue-login`
- **Email**: The email you specified
- **Password**: The password you specified

## 🎯 Next Steps

After creating the venue owner:
1. Test login functionality
2. Verify venue appears in search results
3. Check pitch availability
4. Test booking system
