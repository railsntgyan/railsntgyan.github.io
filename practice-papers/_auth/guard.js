/*
 * RailSNTGyan Firebase UI authentication gate for existing HTML CBT papers.
 * Login is checked with Firebase Auth, never with sessionStorage/query params.
 * Only after verification do we execute the original paper application.
 * This does NOT make questions.json or public image assets private on GitHub Pages.
 */
(function(){
  'use strict';
  const current = document.currentScript;
  const appPath = current?.getAttribute('data-app') || 'app.js';
  const portalPath = current?.getAttribute('data-portal') || '../../../../index.html';
  const config = {
    apiKey:'AIzaSyBAB8onFJN5t9k8No2YqCbcuFNFAQ5cbpY',
    authDomain:'signal-portal-6104.firebaseapp.com',
    projectId:'signal-portal-6104',
    storageBucket:'signal-portal-6104.firebasestorage.app',
    messagingSenderId:'177672020477',
    appId:'1:177672020477:web:9fe0f9565e53b6a5143994'
  };
  const gate = document.getElementById('rs-login-gate');
  const title = document.getElementById('rs-gate-title');
  const msg = document.getElementById('rs-gate-message');
  const button = document.getElementById('rs-gate-login');
  if (button) button.href=portalPath;
  const status=(heading,body)=>{
    document.documentElement.classList.remove('rs-auth-verified');
    if(title)title.textContent=heading;
    if(msg)msg.textContent=body;
  };
  const bounce=()=>{
    status('Login required','Please sign in at RailSNTGyan before accessing the CBT. Redirecting to the portal…');
    try{window.location.replace(portalPath)}catch(_){};
  };
  if(typeof firebase==='undefined'||!firebase.auth){
    status('Unable to verify login','Firebase Authentication could not load. Check internet connectivity and try again.');
    return;
  }
  try {if(!firebase.apps.length)firebase.initializeApp(config)}
  catch(e){status('Authentication error','Unable to initialize Firebase Authentication.');return}
  const auth = firebase.auth();
  let revision=0, loaded=false;
  auth.onAuthStateChanged(async user=>{
    const currentRevision=++revision;
    if(!user){bounce();return}
    status('Checking RailSNTGyan login…','Verifying your existing Firebase session.');
    try{
      await user.getIdToken();
      if(currentRevision!==revision||auth.currentUser?.uid!==user.uid)return;
      document.documentElement.classList.add('rs-auth-verified');
      if(loaded)return;
      loaded=true;
      const app=document.createElement('script');
      app.src=appPath;
      app.onerror=()=>{status('CBT could not start','Unable to load the question-paper application. Please refresh the page.');};
      document.body.appendChild(app);
    }catch(e){
      if(currentRevision!==revision)return;
      status('Login verification failed','Unable to verify your session. Return to RailSNTGyan and sign in again.');
    }
  },()=>{status('Login service unavailable','Firebase could not verify the current session. Check your internet connection.');});
})();
