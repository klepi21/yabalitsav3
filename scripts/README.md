# Venue Owner Creation Script

This script creates a new venue owner account and associated venue in Firebase.

## Prerequisites

1. Make sure your Firebase environment variables are set in your `.env.local` file:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

2. Install Firebase dependencies if not already installed:
   ```bash
   npm install firebase
   ```

## Usage

### Option 1: Using npm script (Recommended)
```bash
npm run create-venue-owner
```

### Option 2: Direct execution
```bash
node scripts/create-venue-owner.js
```

## Customization

Before running the script, you can modify the venue owner and venue details in the script:

### Venue Owner Details (lines 20-25):
```javascript
const venueOwnerData = {
  email: 'admin@example.com',        // Change this
  password: 'password123',           // Change this
  name: 'Admin User',                // Change this
  phone: '+306912345678'             // Change this
};
```

### Venue Details (lines 27-35):
```javascript
const venueData = {
  name: 'Example Football Pitch',    // Change this
  address: '123 Example Street, Athens, Greece',  // Change this
  phone: '+306912345678',            // Change this
  email: 'info@examplepitch.com',    // Change this
  description: 'A professional football pitch for rent',  // Change this
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
};
```

## What the Script Does

1. **Creates Firebase Auth User**: Creates a new user account with email and password
2. **Creates Venue Owner Document**: Adds a document to the `venueOwners` collection
3. **Creates Venue Document**: Adds a document to the `venues` collection
4. **Links Venue Owner to Venue**: Updates the venue owner document with the venue ID

## Output

The script will output:
- Venue Owner UID
- Venue ID
- Email and password for login
- Success/error messages

## Security Note

⚠️ **Important**: The default password is weak. Make sure to change it after the first login!

## Error Handling

The script handles common errors:
- Email already in use
- Weak password
- Invalid email format
- Firebase connection issues

## Example Output

```
Creating venue owner account...
✅ Venue owner account created with UID: abc123def456
✅ Venue owner document created
✅ Venue document created with ID: xyz789uvw012
✅ Venue owner updated with venue ID

🎉 Success! Venue owner and venue created successfully.

📋 Summary:
Venue Owner UID: abc123def456
Venue ID: xyz789uvw012
Email: admin@example.com
Password: password123

⚠️  Remember to change the password after first login!
```
