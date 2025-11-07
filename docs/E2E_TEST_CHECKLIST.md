# FinSight AI - End-to-End Test Checklist

**Date**: 2024-12-19  
**Status**: ✅ READY FOR TESTING

## Test Overview

This document provides a comprehensive end-to-end test checklist for the FinSight AI application. All tests should be performed manually to verify the complete user journey from start to finish.

## Prerequisites

1. **Start Servers**:
   ```bash
   npm run dev
   ```
   - Frontend: `http://localhost:3000`
   - Backend: `http://localhost:3002`

2. **Generate Test Data** (if not already done):
   ```bash
   cd data-gen && node index.js
   ```

3. **Test Users**: Use `scripts/list-users.js` to find available test users

## Test Scenarios

### Test 1: New User Onboarding Flow

**Objective**: Verify complete onboarding experience for a new user

**Steps**:
1. [ ] Navigate to `http://localhost:3000`
2. [ ] Verify onboarding wizard appears (Step 1: Welcome)
3. [ ] Click "Get Started" button
4. [ ] Verify Step 2: Consent explanation displays
5. [ ] Click "Next" button
6. [ ] Verify Step 3: Consent form displays
7. [ ] Enter a valid user ID (e.g., `user-1762493514942-gm8c7gimv`)
8. [ ] Check consent checkbox
9. [ ] Click "I Consent - Continue" button
10. [ ] Verify Step 4: Processing animation displays
11. [ ] Wait for processing to complete
12. [ ] Verify Step 5: Persona reveal displays
13. [ ] Verify persona badge animates in
14. [ ] Verify signals reveal one by one
15. [ ] Click "Go to Dashboard" button
16. [ ] Verify dashboard loads with persona and recommendations

**Expected Results**:
- ✅ Onboarding wizard displays all 5 steps correctly
- ✅ Consent form accepts user ID and checkbox
- ✅ Processing animation shows progress
- ✅ Persona reveal animation works smoothly
- ✅ Dashboard loads successfully after onboarding

**Issues Found**: _______________________________

---

### Test 2: Returning User Dashboard Load

**Objective**: Verify dashboard loads correctly for a returning user

**Steps**:
1. [ ] Navigate to `http://localhost:3000`
2. [ ] If onboarding appears, click "Skip to Dashboard"
3. [ ] Enter user ID in consent screen (if shown)
4. [ ] Submit consent
5. [ ] Verify dashboard loads
6. [ ] Verify hero persona card displays with correct persona
7. [ ] Verify financial health score displays
8. [ ] Verify quick stats widget displays persona-specific stats
9. [ ] Verify persona timeline displays (if user has history)
10. [ ] Verify spending breakdown displays
11. [ ] Verify recommendations list displays (3-5 recommendations)
12. [ ] Verify transaction history section displays

**Expected Results**:
- ✅ Dashboard loads in <3 seconds
- ✅ All sections display correctly
- ✅ Persona-specific styling applied
- ✅ Recommendations are personalized
- ✅ No console errors

**Issues Found**: _______________________________

---

### Test 3: Recommendation Interaction

**Objective**: Verify users can interact with recommendations

**Steps**:
1. [ ] Load dashboard with a user who has recommendations
2. [ ] Verify recommendation cards display with:
   - [ ] Priority badge (Critical/High/Medium/Low)
   - [ ] Difficulty badge (Quick Win/Moderate/Long-term)
   - [ ] Impact estimate
   - [ ] Rationale text
3. [ ] Click "Show Details" on a recommendation
4. [ ] Verify details expand showing:
   - [ ] Type (Education/Partner Offer)
   - [ ] Created date
   - [ ] Estimated impact
5. [ ] Click "Show Less" to collapse
6. [ ] Find a payment plan recommendation (if available)
7. [ ] Click "View Payment Plan" button
8. [ ] Verify payment plan modal opens
9. [ ] Verify chart displays (Avalanche vs Snowball)
10. [ ] Verify payment schedule displays
11. [ ] Toggle between Avalanche and Snowball strategies
12. [ ] Verify chart updates correctly
13. [ ] Close modal
14. [ ] Find a partner offer recommendation (if available)
15. [ ] Verify partner offer card displays with eligibility status
16. [ ] Click "Apply Now" button (if eligible)
17. [ ] Verify external link behavior (or alert if placeholder)

**Expected Results**:
- ✅ All recommendation types display correctly
- ✅ Expand/collapse works smoothly
- ✅ Payment plan modal displays chart and data
- ✅ Strategy toggle works correctly
- ✅ Partner offers show eligibility correctly

**Issues Found**: _______________________________

---

### Test 4: Transaction History

**Objective**: Verify transaction history search and pagination

**Steps**:
1. [ ] Load dashboard
2. [ ] Scroll to transaction history section
3. [ ] Verify transaction table displays
4. [ ] Verify transactions are paginated (if >10 transactions)
5. [ ] Enter search term (e.g., "Netflix")
6. [ ] Verify search filters transactions across all pages
7. [ ] Verify search highlights matching text
8. [ ] Clear search
9. [ ] Verify all transactions display again
10. [ ] Click "Next" button (if multiple pages)
11. [ ] Verify next page loads correctly
12. [ ] Click "Previous" button
13. [ ] Verify previous page loads correctly
14. [ ] Verify transaction details display:
    - [ ] Date
    - [ ] Merchant name
    - [ ] Amount
    - [ ] Category

**Expected Results**:
- ✅ Transaction table displays correctly
- ✅ Search works across all transactions (not just current page)
- ✅ Pagination works correctly
- ✅ Search highlighting works
- ✅ All transaction details display

**Issues Found**: _______________________________

---

### Test 5: AI Chat Interface

**Objective**: Verify AI chat functionality

**Steps**:
1. [ ] Load dashboard
2. [ ] Verify chat bubble button appears in bottom-right corner
3. [ ] Click chat bubble
4. [ ] Verify chat window opens (full-screen on mobile, fixed on desktop)
5. [ ] Verify suggested questions display
6. [ ] Click a suggested question
7. [ ] Verify question is sent and AI responds
8. [ ] Type a custom question (e.g., "How much did I spend on dining last month?")
9. [ ] Press Enter or click Send
10. [ ] Verify message appears in chat
11. [ ] Verify typing indicator shows while waiting
12. [ ] Verify AI response appears
13. [ ] Verify response is relevant and helpful
14. [ ] Ask a follow-up question
15. [ ] Verify conversation context is maintained
16. [ ] Click "Clear History" button
17. [ ] Verify chat history is cleared
18. [ ] Close chat window
19. [ ] Verify chat bubble is still visible

**Expected Results**:
- ✅ Chat bubble appears and opens correctly
- ✅ Suggested questions work
- ✅ Messages send and receive correctly
- ✅ AI responses are relevant
- ✅ Conversation context maintained
- ✅ Clear history works
- ✅ Chat window responsive (mobile vs desktop)

**Issues Found**: _______________________________

---

### Test 6: Persona Evolution Timeline

**Objective**: Verify persona timeline displays correctly

**Steps**:
1. [ ] Load dashboard with a user who has persona history
2. [ ] Scroll to persona timeline section
3. [ ] Verify timeline displays horizontally
4. [ ] Verify persona badges display with correct colors
5. [ ] Verify transition markers display at persona changes
6. [ ] Hover over a persona segment
7. [ ] Verify tooltip displays persona type and date
8. [ ] Verify narrative description displays
9. [ ] Scroll timeline horizontally (if long)
10. [ ] Verify legend displays all personas

**Expected Results**:
- ✅ Timeline displays correctly
- ✅ Persona segments are color-coded
- ✅ Transitions are marked
- ✅ Tooltips work
- ✅ Narrative descriptions are accurate
- ✅ Timeline is scrollable

**Issues Found**: _______________________________

---

### Test 7: Spending Insights

**Objective**: Verify spending visualizations

**Steps**:
1. [ ] Load dashboard
2. [ ] Scroll to spending insights section
3. [ ] Verify pie chart displays spending by category
4. [ ] Verify chart is interactive (hover shows details)
5. [ ] Verify bar chart displays monthly income vs expenses
6. [ ] Verify top merchants list displays
7. [ ] Verify unusual spending alerts display (if applicable)
8. [ ] Verify summary cards display:
   - [ ] Total Spending
   - [ ] Total Income
   - [ ] Net Cash Flow

**Expected Results**:
- ✅ All charts render correctly
- ✅ Charts are interactive
- ✅ Data is accurate
- ✅ Summary cards display correct values

**Issues Found**: _______________________________

---

### Test 8: Admin View

**Objective**: Verify admin functionality

**Steps**:
1. [ ] Navigate to admin view (or use admin route)
2. [ ] Verify admin login screen displays
3. [ ] Enter admin password (default: `admin123`)
4. [ ] Click "Login" button
5. [ ] Verify admin dashboard loads
6. [ ] Verify user list displays with:
   - [ ] Name
   - [ ] Email
   - [ ] Persona
   - [ ] Consent status
   - [ ] Last active date
7. [ ] Test search functionality
8. [ ] Test sorting (click column headers)
9. [ ] Test pagination
10. [ ] Click on a user
11. [ ] Verify user detail view displays:
    - [ ] User overview
    - [ ] Persona history
    - [ ] Current recommendations
    - [ ] Transaction history
    - [ ] Behavioral signals
12. [ ] Verify audit log displays
13. [ ] Test audit log filtering
14. [ ] Verify audit entries are logged when viewing user details

**Expected Results**:
- ✅ Admin login works
- ✅ User list displays correctly
- ✅ Search, sort, and pagination work
- ✅ User detail view shows all information
- ✅ Audit log records admin actions
- ✅ Consent warnings display for users without consent

**Issues Found**: _______________________________

---

### Test 9: Error Handling

**Objective**: Verify error handling and recovery

**Steps**:
1. [ ] Try to access dashboard without consent
2. [ ] Verify appropriate error message displays
3. [ ] Submit consent
4. [ ] Verify dashboard loads
5. [ ] Stop backend server
6. [ ] Try to load recommendations
7. [ ] Verify error message displays
8. [ ] Verify retry button appears
9. [ ] Restart backend server
10. [ ] Click retry button
11. [ ] Verify data loads successfully
12. [ ] Enter invalid user ID
13. [ ] Verify error message displays
14. [ ] Enter valid user ID
15. [ ] Verify dashboard loads

**Expected Results**:
- ✅ Error messages are user-friendly
- ✅ Retry functionality works
- ✅ Application recovers gracefully from errors
- ✅ No unhandled errors in console

**Issues Found**: _______________________________

---

### Test 10: Mobile Responsiveness

**Objective**: Verify mobile experience

**Steps**:
1. [ ] Open application in mobile viewport (<640px)
2. [ ] Verify layout stacks vertically
3. [ ] Verify chat bubble is appropriately sized
4. [ ] Open chat
5. [ ] Verify chat is full-screen on mobile
6. [ ] Verify touch targets are at least 44x44px
7. [ ] Test all interactive elements:
   - [ ] Buttons
   - [ ] Links
   - [ ] Form inputs
   - [ ] Cards
8. [ ] Verify transaction history displays as cards (not table)
9. [ ] Verify charts are responsive
10. [ ] Test onboarding flow on mobile
11. [ ] Verify all animations work on mobile

**Expected Results**:
- ✅ Layout adapts correctly for mobile
- ✅ Touch targets are appropriately sized
- ✅ Chat is full-screen on mobile
- ✅ All features work on mobile
- ✅ No horizontal scrolling

**Issues Found**: _______________________________

---

## Performance Checks

### Load Time
- [ ] Initial page load: <3 seconds
- [ ] Dashboard load: <3 seconds
- [ ] Recommendation generation: <5 seconds
- [ ] Chat response: <5 seconds

### Responsiveness
- [ ] No lag when clicking buttons
- [ ] Animations are smooth (60fps)
- [ ] Charts render quickly
- [ ] No janky scrolling

## Accessibility Checks

- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] Screen reader compatible (test with VoiceOver/NVDA)
- [ ] Color contrast meets WCAG AA
- [ ] Focus indicators are visible
- [ ] ARIA labels are present

## Browser Console

- [ ] No errors in console
- [ ] No warnings in console
- [ ] No failed network requests (except expected 404s)

## Summary

**Total Tests**: 10 major test scenarios  
**Status**: ⏳ Ready for testing  
**Completion**: ___/10 test scenarios completed

**Critical Issues Found**: _______________________________

**High Priority Issues Found**: _______________________________

**Medium Priority Issues Found**: _______________________________

**Low Priority Issues Found**: _______________________________

---

**Next Steps**:
1. Complete all test scenarios
2. Document any issues found
3. Fix critical and high-priority issues
4. Re-test after fixes
5. Mark PR-43 as complete

