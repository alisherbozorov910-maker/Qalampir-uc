# PUBG UC Shop

Firebase-based PUBG UC shop starter. Includes:
- Email/password auth + email verification
- Uzbek/Russian language switch
- Animated space background
- Balance and payment receipt workflow
- UC packages and orders
- Support tickets
- Admin dashboard with role-based access

## Setup
1. Create a Firebase project.
2. Enable Authentication > Email/Password.
3. Enable Firestore and Storage.
4. Replace `src/firebase-config.js` values with your Firebase Web App config.
5. Deploy Firestore and Storage rules from `firebase-rules/`.
6. Create your own admin account in Firebase Authentication.
7. In Firestore create `users/{ADMIN_UID}` with:
   `{ "email": "your@email.com", "role": "admin", "balance": 0, "createdAt": serverTimestamp() }`
8. Add UC packages in the Admin panel.

Do NOT put an admin password in frontend code. Admin access is controlled by the Firestore role field + security rules.
