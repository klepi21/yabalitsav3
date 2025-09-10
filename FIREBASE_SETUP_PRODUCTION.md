# Firebase Admin Setup for Production

## 1. Get Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `yabalitsa-6f5e8`
3. Go to **Project Settings** (gear icon) > **Service Accounts**
4. Click **"Generate new private key"**
5. Download the JSON file (e.g., `yabalitsa-service-account.json`)

## 2. Convert to Base64

```bash
# Convert the JSON file to base64
cat yabalitsa-service-account.json | base64 -w 0
```

## 3. Set Environment Variable

Add to your `.env.local` file:

```bash
FIREBASE_SERVICE_ACCOUNT=eyJ0eXBlIjoic2VydmljZV9hY2NvdW50IiwicHJvamVjdF9pZCI6InlhYmFsaXRzYS02ZjVlOCIsInByaXZhdGVfa2V5X2lkIjoiLi4uIiwicHJpdmF0ZV9rZXkiOiIuLi4iLCJjbGllbnRfZW1haWwiOiIuLi4iLCJjbGllbnRfaWQiOiIuLi4iLCJhdXRoX3VyaSI6Imh0dHBzOi8vYWNjb3VudHMuZ29vZ2xlLmNvbS9vL29hdXRoMi9hdXRoIiwidG9rZW5fdXJpIjoiaHR0cHM6Ly9vYXV0aDIuZ29vZ2xlYXBpcy5jb20vdG9rZW4iLCJhdXRoX3Byb3ZpZGVyX3g1MDlfY2VydF91cmwiOiJodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS9vYXV0aDIvdjEvY2VydHMiLCJjbGllbnRfeDUwOV9jZXJ0X3VybCI6Ii4uLiJ9
```

## 4. Get Resend API Key (Optional)

1. Go to [Resend](https://resend.com/)
2. Sign up/Login
3. Go to **API Keys**
4. Create new API key
5. Add to `.env.local`:

```bash
RESEND_API_KEY=re_1234567890abcdef
```

## 5. Production Deployment

For Vercel/Netlify, add these environment variables in your deployment dashboard.

## 6. Firestore Security Rules

Make sure your Firestore rules allow the admin to write to `email_verifications` collection:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow admin to manage email verifications
    match /email_verifications/{email} {
      allow read, write: if request.auth != null && request.auth.token.admin == true;
    }
    
    // Your existing rules...
  }
}
```
