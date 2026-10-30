/*
 * RailSNTGyan AMM CBT login gate (Firebase Authentication).
 * The practice UI runs only after a real signed-in Firebase user is verified.
 * A copied public GitHub URL is NOT proof of login. This is a UI access gate;
 * GitHub Pages cannot enforce HTTP access restrictions on questions.json.
 */
(function(){
  'use strict';
  document.documentElement.classList.remove('rs-auth-verified');
  const tag=document.currentScript;
  const appPath=tag?.getAttribute('data-app')||'app.js';
  const portalPath=tag?.getAttribute('data-portal')||'../../../../index.html';
  const cfg={
    apiKey:'AIzaSyBAB8onFJN5t9k8No2YqCbcuFNFAQ5cbpY',
    authDomain:'signal-portal-6104.firebaseapp.com',
    projectId:'signal-portal-6104',
    storageBucket:'signal-portal-6104.firebasestorage.app',
    messagingSenderId:'177672020477',
    appId:'1:177672020477:web:9fe0f9565e53b6a5143994'
  };
  const login=document.getElementById('rs-gate-login');
  const title=document.getElementById('rs-gate-title');
  const message=document.getElementById('rs-gate-message');
  if(login)login.href=portalPath;
  function status(heading,body){
    document.documentElement.classList.remove('rs-auth-verified');
    if(title)title.textContent=heading;
    if(message)message.textContent=body;
  }
  if(typeof firebase==='undefined'||typeof firebase.auth!=='function'){
    status('Login verification unavailable','Firebase Authentication did not load. Please check internet connectivity and reload.');
    return;
  }
  try{if(!firebase.apps.length)firebase.initializeApp(cfg)}
  catch(err){status('Login verification error','Firebase could not start. Refresh the page.');return}
  const auth=firebase.auth();
  let generation=0;
  let appLoaded=false;
  function unauthenticated(){
    status('RailSNTGyan login required','Please sign in to RailSNTGyan to use this AMM practice paper. This direct link cannot start a test without a signed-in session.');
  }
  // The portal uses SESSION persistence. Use the same policy on CBT pages so a
  // previous LOCAL-persistence login is not used as a separate access rule.
  const persistenceReady=auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);
  persistenceReady.then(()=>{
    auth.onAuthStateChanged(async(user)=>{
      const run=++generation;
      if(!user){unauthenticated();return}
      status('Checking RailSNTGyan login…','Verifying your current Firebase session.');
      try{
        // Force a fresh ID token on arrival. Do not rely on URL flags or sessionStorage.
        const result=await user.getIdTokenResult(true);
        if(run!==generation||auth.currentUser?.uid!==user.uid)return;
        if(!result?.token||!user.uid)throw Error('Missing Firebase login token');
        document.documentElement.classList.add('rs-auth-verified');
        if(appLoaded)return;
        appLoaded=true;
        const script=document.createElement('script');
        script.src=appPath;
        script.onerror=()=>status('Practice paper unavailable','Unable to load the exam application. Please refresh the page.');
        document.body.appendChild(script);
      }catch(err){
        if(run!==generation)return;
        status('Unable to verify login','Please return to RailSNTGyan, sign in again, and reopen the AMM paper.');
      }
    },()=>status('Authentication unavailable','Unable to check your Firebase session. Check the connection and refresh.'));
  }).catch(()=>status('Authentication unavailable','Unable to initialize secure browser-session login. Please return to RailSNTGyan.'));
  // Prevent a cached page from showing the test after the user has signed out.
  window.addEventListener('pageshow',()=>{
    if(appLoaded&&!auth.currentUser)unauthenticated();
  });
})();
