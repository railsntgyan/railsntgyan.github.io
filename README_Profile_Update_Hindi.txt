RailSNTGyan — PROFILE / USER DIRECTORY / PASSWORD UPDATE
Date: 25.10.2026

IMPORTANT: This update starts from your already updated website where Manage Users was removed.
The portal, login theme, main tables, database management, assets and other existing features are unchanged.

A. GITHUB: SIMPLE WEBSITE UPDATE
1. Download RailSNTGyan_Profile_Updated_index.html and rename it to index.html, if necessary.
2. Open your GitHub Pages repository and REPLACE ONLY the existing root index.html.
3. Commit the changes, refresh the website (Ctrl + F5).
4. OR use the complete ZIP project contents if you want the whole updated project.

B. IMPORTANT — FIRESTORE PROFILE PERMISSIONS (REQUIRED)
The Profile extension writes to Firestore collection "user_profiles" using each user UID as document ID.
You must publish the new rules. Otherwise Edit Profile may display a permission-denied error.
1. Firebase Console -> signal-portal-6104 -> Firestore Database -> Rules.
2. BACK UP your current rules first.
3. Open RailSNTGyan_user_profiles_rules_SNIPPET.txt.
4. Copy ONLY the "match /user_profiles/{userId} { ... }" block.
5. Paste it INSIDE existing "match /databases/{database}/documents { ... }" block.
6. Keep all existing secr_records, master data, and any other rules UNCHANGED.
7. Publish, then test with a non-admin User account.
8. Do NOT paste the snippet as your complete rules: that can break your existing application.

Security:
- Every user can GET and WRITE their OWN profile document only.
- Admin (Firebase custom claim admin:true) can read/list profiles.
- User cannot change account role, login email or other users' profiles.
- Profile mobile number is OPTIONAL; changing it here does not verify ownership.
- Never store password in Firestore.

C. CHANGE PASSWORD (NO BACKEND SETUP REQUIRED)
Profile -> Change Password -> current password + new password + confirmation -> Update Password.
Firebase reauthentication verifies the current password before updating it.
Login page -> Forgot password? is ALREADY present in your original code and has been retained.
For reset email, Email/Password sign-in must be enabled in Firebase Authentication.
Check Firebase Authentication -> Templates -> Password reset for sender/template configuration.

D. ADMIN USER DIRECTORY (VIEW ONLY)
Profile -> Admin Management -> User Directory.
Without the optional Cloud Function below, directory lists saved Firestore profiles ONLY.
Thus its first metric is explicitly "Saved Profiles" (not total registered users).
Normal users cannot list all profiles when Firestore rules from section B are applied.
Existing Add in Database function remains unchanged.

E. EXACT REGISTERED FIREBASE USER COUNT (OPTIONAL ADMIN BACKEND)
For the true total of users created manually in Firebase Authentication — including users
who have never signed in or filled out Profile — deploy the included Cloud Function.
This is NOT automatic when uploading index.html or ZIP to GitHub.
Firebase Cloud Functions generally require a Blaze billing-enabled Firebase project.
You should check your project plan and usage costs before deploying.

The complete ZIP contains:
  firebase.json
  functions/package.json
  functions/index.js

Commands on Windows PowerShell, in the extracted project ROOT folder:
  node --version
  npm --version
  npm install --prefix functions
  npx firebase-tools login
  npx firebase-tools deploy --only functions:adminUserDirectory --project signal-portal-6104

The function is deployed in Mumbai region asia-south1 and can be invoked only by a
signed-in account with the securely verified Firebase custom claim admin: true.
It reads Firebase Authentication accounts with Admin SDK and joins profile documents.
It does NOT add users, delete users, change passwords or change roles.
The website automatically uses this function for exact Registered Users / Completed / Pending
figures when deployed; otherwise it falls back to saved profiles.

F. WHAT WAS NOT CHANGED
- Firebase login and existing admin:false / admin:true role logic
- Homepage / sections / approvals / tables / master database / other project files
- Login layout, light/dark theme and original Forgot password? button
- The previously removed Manage Users remains removed

TEST CHECKLIST
[ ] Existing Admin and normal user can sign in.
[ ] User can save Display Name, Designation, Department, Railway, Division and Mobile.
[ ] Reopen Profile and verify saved data.
[ ] User can change password and re-login with new password.
[ ] Forgot password? sends the reset email to a registered account.
[ ] Normal user cannot see Admin Management / User Directory.
[ ] Admin can view profile details and search by email/mobile/name/division.
[ ] After Cloud Function deploy: total users includes new Firebase Console accounts that have never signed in.

Note: The ZIP and HTML have been checked locally with JavaScript syntax and simulated
browser tests. No write/deployment was performed against your live Firebase project.
