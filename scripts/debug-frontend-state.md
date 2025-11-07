# Debug Frontend State

Open DevTools Console (F12) and run these commands:

## Check Current User
```javascript
localStorage.getItem('userId')
```
Should return: `user-1762524842070-fl7lie322`

## Check Onboarding Status
```javascript
localStorage.getItem('onboardingComplete')
```
Should return: `"true"`

## Check Zustand Store State
```javascript
// This will show the current state in the Zustand store
window.__ZUSTAND_STORE__ || "Store not exposed - check src/store/useStore.ts"
```

## Manual Profile Load
If localStorage has the correct userId but profile isn't loading, manually trigger it:
```javascript
// Get the userId
const userId = localStorage.getItem('userId');
console.log('User ID:', userId);

// Manually fetch profile
fetch(`http://localhost:3002/api/profile/${userId}`, {
  headers: { 'Content-Type': 'application/json' }
})
  .then(r => r.json())
  .then(data => console.log('Profile data:', data))
  .catch(err => console.error('Profile error:', err));
```

## Check for Errors
```javascript
// Look for any errors in the console
console.log('Check above for any red error messages');
```

