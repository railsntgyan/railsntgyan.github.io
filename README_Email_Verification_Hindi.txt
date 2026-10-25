RailSNTGyan - Profile Email Verification Update (25 October 2026)

क्या नया है?
- Profile -> Security में Send Verification Email और Check Verification Status buttons.
- User स्वयं अपने Registered Email पर verification link प्राप्त कर सकता है.
- ईमेल link confirm करने के बाद Check Verification Status दबाने पर Verified दिखाई देगा.
- पहले से Verified हो तो Send button disabled रहता है.
- Firebase Spark Free Plan पर, बिना Firestore Rules change या Cloud Function के काम करता है.

GitHub पर कैसे लागू करें?
1. ZIP extract करें (यदि full website चाहिए).
2. GitHub repository में केवल index.html replace करें, यदि बाकी सभी files पहले से मौजूद हैं.
3. Commit changes करें. Webpage को reload करें.
4. Login -> Profile -> Security -> Send Verification Email.
5. Registered Email की Inbox/Spam में Firebase link खोलें.
6. वापस RailSNTGyan -> Security -> Check Verification Status दबाएँ.

सावधानियाँ:
- Email केवल अपने account के address पर भेजा जा सकता है.
- Email भेजना = Verified होना नहीं; email link खोलना जरूरी है.
- Firebase Authentication email template और भेजने की quotas/project settings लागू होंगे.
- Live Firebase में verification test यहाँ नहीं किया गया है; simulated browser tests सफल हैं.
- Login, passwords, Profile editing, User Directory, assets, tables, navigation, CSS theme में कोई और बदलाव नहीं किया गया है.
