RailSNTGyan | Welcome Screen Stuck - FIX | 24 October 2026

Issue:
After successful Firebase Login, welcome animation remained on-screen.
Reason verified in latest file: HMIS CSS forced #loginScreen display:flex!important,
while the existing auth success handler used only element.style.display='none'.
The Welcome .railV44Show class also was not reset on successful transition.

Changes in index.html (only):
  1. Strong authenticated-state CSS hides #loginScreen.hmis-login-page.
  2. railSetLoginVisible() uses inline !important display and visibility.
  3. Welcome overlay reset at login completion AND logout.
  4. Original Welcome duration 2400 ms retained.
  5. Firebase credentials, login/auth flows, User Management, page layouts,
     dashboard, master database, light/dark themes unchanged.

GitHub Pages upload:
  - If railway images already exist in assets/, upload only index.html
    into the root of Railsignal.github.io repository.
  - Do not upload the ZIP itself into GitHub.
  - After commit, reload site (Ctrl+Shift+R on computer) and sign in.
  - Welcome should disappear after about 2.4 seconds.
  - If issue persists, check Console for a JavaScript error or stale cached HTML.

Tests: static CSS cascade + simulated auth DOM transitions; a true
live Firebase sign-in cannot be tested from this offline environment.
