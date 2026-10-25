'use strict';
// Admin-only directory for RailSNTGyan. The browser never has Admin SDK credentials.
const {onCall,HttpsError} = require('firebase-functions/v2/https');
const {initializeApp} = require('firebase-admin/app');
const {getAuth} = require('firebase-admin/auth');
const {getFirestore} = require('firebase-admin/firestore');
initializeApp();

exports.adminUserDirectory = onCall({
  region: 'asia-south1',
  memory: '256MiB',
  timeoutSeconds: 60,
  maxInstances: 3,
}, async (request) => {
  // Enforced by Firebase's verified callable auth context, not a supplied UID or request value.
  if (!request.auth || request.auth.token.admin !== true) {
    throw new HttpsError('permission-denied', 'Admin account required.');
  }
  const auth = getAuth();
  const store = getFirestore();
  let nextPageToken;
  const accounts = [];
  do {
    const page = await auth.listUsers(1000, nextPageToken);
    accounts.push(...page.users);
    nextPageToken = page.pageToken;
    // Avoid unexpectedly returning enormous and sensitive datasets in a callable.
    if (accounts.length > 3000) throw new HttpsError('resource-exhausted', 'Directory exceeds supported size.');
  } while (nextPageToken);

  const profiles = new Map();
  // Firestore Admin SDK read in small batches; client rules are not bypassed by the website.
  for (let i=0;i<accounts.length;i+=150) {
    const part=accounts.slice(i,i+150);
    const refs=part.map(u=>store.collection('user_profiles').doc(u.uid));
    if (!refs.length) continue;
    const snaps=await store.getAll(...refs);
    snaps.forEach((d,j)=>{ if(d.exists) profiles.set(part[j].uid,d.data()); });
  }
  const users=accounts.map(u=>{
    const p=profiles.get(u.uid)||{};
    // Only the information required by the Admin directory is transmitted.
    return {
      uid:u.uid,
      email:u.email||'',
      displayName:p.displayName||u.displayName||'',
      designation:p.designation||'',
      department:p.department||'',
      railway:p.railway||'',
      division:p.division||'',
      mobile:p.mobile||'',
      disabled:!!u.disabled,
      role:u.customClaims?.admin===true?'Admin':'User',
      emailVerified:!!u.emailVerified,
      registeredAt:u.metadata?.creationTime||'',
      lastSignIn:u.metadata?.lastSignInTime||'',
    };
  }).sort((a,b)=>(a.displayName||a.email).localeCompare(b.displayName||b.email,'en'));
  return {exact:true,users};
});
