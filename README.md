# IdeaLab
IdeaLab - A laboratory for early stage ideas.

## Client env
VITE_GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com

## Google login test
1) Start server + client
2) Open Login page
3) Click Continue with Google
4) Confirm POST /api/auth/google sends { idToken }
5) Confirm 200 response returns accessToken and user
6) Confirm redirect to /feed
