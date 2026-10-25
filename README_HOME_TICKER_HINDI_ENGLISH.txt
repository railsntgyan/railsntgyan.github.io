RailSNTGyan — HOME News Ticker Reminder (25-10-2026)

GitHub website update: Replace ONLY index.html in your existing repository, then Commit.
Do NOT delete images/assets or any other existing files.

Changes: A slim, scrolling amber reminder ribbon appears only on authenticated HOME.
If required Firestore profile fields (name/designation/department/railway/division) are missing, it prompts Edit Profile.
If Firebase Auth emailVerified is false, it prompts Verify Email.
When both are completed, it disappears automatically. Mobile has small icon actions.
The message pauses when hovered/focused, and reduced-motion settings disable animation.

Edit Profile button opens My Profile > Edit Profile.
Verify Email button opens My Profile > Security.
After saving the profile or checking email verification, the ribbon updates automatically.

No Firestore rules, Cloud Functions, billing or new services are required if the existing Profile feature already works.

Note: If reading a profile document is denied or fails, the ticker does not make an unsupported claim that the profile is incomplete; it can still show the email-verification reminder.

Original portal / login / tables / master database / other assets unchanged.
