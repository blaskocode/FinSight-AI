# FinSight AI - User Testing Plan

## Test Environment Setup

### Prerequisites
1. Backend server running on `http://localhost:3002`
2. Frontend server running on `http://localhost:3000`
3. Database initialized with synthetic data (100 users, 12 months of history)
4. OpenAI API key configured (for AI chat and rationale generation)

### Test Users
- **User 1**: High Utilization persona (utilization >= 50%)
- **User 2**: Variable Income persona (pay gap > 45 days, buffer < 1 month)
- **User 3**: Subscription Heavy persona (recurring spend > 20% of total)
- **User 4**: Savings Builder persona (savings rate > 15%)
- **User 5**: Lifestyle Creep persona (income high, savings rate low)
- **Admin**: Password: `admin123` (or from `ADMIN_PASSWORD` env var)

---

## Test Suite 1: User Flow - Consent & Dashboard

### Test 1.1: Initial Load & Consent Screen
**Steps:**
1. Navigate to `http://localhost:3000`
2. Verify consent screen appears
3. Check that consent screen has:
   - Clear explanation of data usage
   - Consent checkbox
   - User ID input field
   - Submit button

**Expected Results:**
- ✅ Consent screen displays correctly
- ✅ All UI elements are visible and functional

### Test 1.2: Consent Submission
**Steps:**
1. Enter a valid user ID (e.g., `user-1`)
2. Check the consent checkbox
3. Click "Submit Consent"

**Expected Results:**
- ✅ Consent is recorded in database
- ✅ User is redirected to dashboard
- ✅ Dashboard loads with user's persona and signals

### Test 1.3: Dashboard Initial Load
**Steps:**
1. After consent, verify dashboard displays:
   - Persona card with correct persona type
   - Behavioral signals section
   - Recommendations list
   - Chat bubble in bottom-right corner

**Expected Results:**
- ✅ Persona card shows correct persona type
- ✅ Persona icon and colors match persona type
- ✅ Signals display correctly (utilization, subscriptions, savings, etc.)
- ✅ Recommendations appear (at least 3 education + 1 partner offer)
- ✅ Chat bubble is visible

---

## Test Suite 2: Persona Assignment & Display

### Test 2.1: High Utilization Persona
**Steps:**
1. Use a user with high credit utilization (>= 50%)
2. Load dashboard
3. Verify persona assignment

**Expected Results:**
- ✅ Persona type: "High Utilization"
- ✅ Persona icon: CreditCard
- ✅ Persona color: Red/Orange gradient
- ✅ Signals show utilization >= 50%

### Test 2.2: Variable Income Persona
**Steps:**
1. Use a user with variable income patterns
2. Load dashboard
3. Verify persona assignment

**Expected Results:**
- ✅ Persona type: "Variable Income"
- ✅ Persona icon: TrendingDown
- ✅ Signals show pay gap > 45 days and buffer < 1 month

### Test 2.3: Secondary Personas
**Steps:**
1. Use a user with multiple persona matches
2. Load dashboard
3. Check for secondary persona tags

**Expected Results:**
- ✅ Primary persona displays prominently
- ✅ Secondary personas shown as tags (if implemented)
- ✅ Persona history shows all assignments

---

## Test Suite 3: Recommendations

### Test 3.1: Recommendation Display
**Steps:**
1. Load dashboard with a user who has recommendations
2. Verify recommendations list

**Expected Results:**
- ✅ At least 3 education recommendations
- ✅ At least 1 partner offer recommendation
- ✅ Each recommendation shows:
  - Title
  - Rationale (personalized)
  - Type badge (Education/Partner Offer)
  - Priority indicator (if applicable)

### Test 3.2: Recommendation Details
**Steps:**
1. Click on a recommendation card
2. Verify detailed view

**Expected Results:**
- ✅ Full rationale displays
- ✅ Impact estimate shows (if applicable)
- ✅ Difficulty level shows (if applicable)
- ✅ For partner offers: eligibility status, "Apply Now" button
- ✅ For debt recommendations: payment plan option

### Test 3.3: Payment Plan Modal
**Steps:**
1. Find a debt-related recommendation
2. Click "View Payment Plan"
3. Verify payment plan modal

**Expected Results:**
- ✅ Modal opens with payment plan details
- ✅ Avalanche vs Snowball comparison shows
- ✅ Timeline chart displays (Recharts)
- ✅ Payment schedule table shows monthly breakdown
- ✅ Total interest saved calculation displays

### Test 3.4: Partner Offer Eligibility
**Steps:**
1. Find a partner offer recommendation
2. Verify eligibility status

**Expected Results:**
- ✅ Eligibility badge shows (Eligible/Not Eligible)
- ✅ Eligibility criteria explained
- ✅ "Apply Now" button (if eligible) or "Learn More" (if not)
- ✅ Disclaimer text displays

---

## Test Suite 4: AI Chat Interface

### Test 4.1: Chat Bubble & Window
**Steps:**
1. Click chat bubble in bottom-right
2. Verify chat window opens

**Expected Results:**
- ✅ Chat window opens with smooth animation
- ✅ Message history displays (empty initially)
- ✅ Input field and send button visible
- ✅ Suggested questions appear (if no messages)

### Test 4.2: Send Message
**Steps:**
1. Type a message: "What are my biggest expenses?"
2. Click send or press Enter
3. Wait for AI response

**Expected Results:**
- ✅ User message appears immediately (right-aligned, blue)
- ✅ Loading indicator shows while processing
- ✅ AI response appears (left-aligned, gray)
- ✅ Response is relevant and personalized
- ✅ "Cached" indicator shows if response was cached

### Test 4.3: Conversation Context
**Steps:**
1. Send: "What's my credit utilization?"
2. Send follow-up: "How can I improve it?"
3. Verify context is maintained

**Expected Results:**
- ✅ Second message references first message context
- ✅ AI understands "it" refers to credit utilization
- ✅ Conversation flows naturally

### Test 4.4: Transaction Query Function
**Steps:**
1. Send: "Show me my transactions from last month"
2. Verify function calling works

**Expected Results:**
- ✅ AI uses function calling to query transactions
- ✅ Transaction data is returned and formatted
- ✅ Response includes relevant transaction details

### Test 4.5: Clear History
**Steps:**
1. Send a few messages
2. Click "Clear History"
3. Verify history is cleared

**Expected Results:**
- ✅ All messages removed
- ✅ Suggested questions reappear
- ✅ New conversation starts fresh

---

## Test Suite 5: Admin Dashboard

### Test 5.1: Admin Login
**Steps:**
1. Navigate to `/admin` or click admin link
2. Enter password: `admin123`
3. Click "Login"

**Expected Results:**
- ✅ Login form displays
- ✅ Login succeeds with correct password
- ✅ Error message shows with incorrect password
- ✅ Redirects to admin dashboard on success

### Test 5.2: User List Display
**Steps:**
1. After login, verify user list

**Expected Results:**
- ✅ Table displays with columns: Name, Email, Persona, Consent Status, Last Active
- ✅ Only users with active consent are shown
- ✅ Pagination works (20 users per page)
- ✅ Stats display: Total Users, Current Page, Users on Page

### Test 5.3: Search & Filter
**Steps:**
1. Enter search query in search box
2. Click "Search"
3. Verify filtered results

**Expected Results:**
- ✅ Search filters by name or email
- ✅ Results update correctly
- ✅ Pagination resets to page 1

### Test 5.4: Sort Columns
**Steps:**
1. Click on column headers (Name, Email, Persona, Last Active)
2. Verify sorting works

**Expected Results:**
- ✅ Clicking column header sorts ascending
- ✅ Clicking again sorts descending
- ✅ Sort indicator (arrow) shows current sort direction
- ✅ Data sorts correctly

### Test 5.5: View User Details
**Steps:**
1. Click "View Details" on a user
2. Verify user detail page

**Expected Results:**
- ✅ User detail page loads
- ✅ Shows: Name, Email, Persona, Consent Status
- ✅ Persona history timeline displays
- ✅ Current recommendations list shows
- ✅ Transaction history table shows (if consent active)
- ✅ Behavioral signals display (if consent active)
- ✅ "Back to User List" button works

### Test 5.6: Consent Warning
**Steps:**
1. Find a user without consent (if any)
2. View their details
3. Verify consent warning

**Expected Results:**
- ✅ Yellow warning banner displays
- ✅ Message: "User has not consented to data sharing"
- ✅ Detailed financial data is not shown
- ✅ Basic user info still displays

### Test 5.7: Audit Log
**Steps:**
1. Click "Audit Log" button in header
2. Verify audit log displays

**Expected Results:**
- ✅ Audit log table shows
- ✅ Columns: Timestamp, Admin ID, User ID, Action
- ✅ Entries show "viewed_profile" actions
- ✅ Entries are sorted by timestamp (newest first)
- ✅ Pagination works

### Test 5.8: Audit Log Filtering
**Steps:**
1. Filter by user ID
2. Filter by date range
3. Filter by action type

**Expected Results:**
- ✅ Filters apply correctly
- ✅ Results update dynamically
- ✅ "Clear Filters" button resets all filters
- ✅ Stats update with filtered results

### Test 5.9: Audit Log Entry Creation
**Steps:**
1. View a user's details
2. Go to audit log
3. Verify entry was created

**Expected Results:**
- ✅ New audit log entry appears
- ✅ Entry shows: admin_id="admin", user_id, action="viewed_profile"
- ✅ Timestamp is recent
- ✅ Entry appears in chronological order

---

## Test Suite 6: Edge Cases & Error Handling

### Test 6.1: Invalid User ID
**Steps:**
1. Enter non-existent user ID
2. Submit consent
3. Load dashboard

**Expected Results:**
- ✅ Error message displays
- ✅ User is informed user not found
- ✅ Dashboard doesn't crash

### Test 6.2: No Persona Assignment
**Steps:**
1. Use a user who doesn't match any persona criteria
2. Load dashboard

**Expected Results:**
- ✅ Dashboard still loads
- ✅ Message: "No persona assigned - criteria not met"
- ✅ Recommendations may be limited or generic

### Test 6.3: No Recommendations
**Steps:**
1. Use a user with no recommendations generated
2. Load dashboard

**Expected Results:**
- ✅ Dashboard loads successfully
- ✅ Recommendations section shows empty state or message
- ✅ No crashes or errors

### Test 6.4: Network Error Simulation
**Steps:**
1. Stop backend server
2. Try to load dashboard
3. Try to send chat message

**Expected Results:**
- ✅ Error messages display clearly
- ✅ UI doesn't crash
- ✅ User can retry actions

### Test 6.5: Missing OpenAI API Key
**Steps:**
1. Remove or invalidate OpenAI API key
2. Try to use AI chat
3. Try to generate recommendations

**Expected Results:**
- ✅ Fallback behavior works (template-based rationales)
- ✅ Error messages are clear
- ✅ Application doesn't crash

---

## Test Suite 7: Performance & Responsiveness

### Test 7.1: Page Load Time
**Steps:**
1. Measure time to load dashboard
2. Measure time to load admin dashboard

**Expected Results:**
- ✅ Dashboard loads in < 2 seconds
- ✅ Admin dashboard loads in < 3 seconds
- ✅ No noticeable lag

### Test 7.2: Chat Response Time
**Steps:**
1. Send a chat message
2. Measure response time

**Expected Results:**
- ✅ Response time < 5 seconds (non-cached)
- ✅ Cached responses < 1 second
- ✅ Loading indicator shows during wait

### Test 7.3: Large Data Sets
**Steps:**
1. Load user with many transactions (100+)
2. Load admin dashboard with many users (100+)

**Expected Results:**
- ✅ Pagination works correctly
- ✅ No performance degradation
- ✅ UI remains responsive

---

## Test Suite 8: Cross-Browser & Responsive Design

### Test 8.1: Desktop Browsers
**Steps:**
1. Test in Chrome
2. Test in Firefox
3. Test in Safari
4. Test in Edge

**Expected Results:**
- ✅ All features work in all browsers
- ✅ Styling is consistent
- ✅ No browser-specific bugs

### Test 8.2: Mobile Responsiveness
**Steps:**
1. Resize browser to mobile width (375px)
2. Test all features

**Expected Results:**
- ✅ Layout adapts to mobile
- ✅ Touch interactions work
- ✅ Text is readable
- ✅ Buttons are appropriately sized

### Test 8.3: Tablet Responsiveness
**Steps:**
1. Resize browser to tablet width (768px)
2. Test all features

**Expected Results:**
- ✅ Layout adapts to tablet
- ✅ Features are accessible
- ✅ No layout issues

---

## Test Results Summary

### Pass Criteria
- ✅ All critical user flows work
- ✅ No crashes or errors
- ✅ Performance is acceptable
- ✅ UI is responsive and accessible
- ✅ Error handling is graceful

### Known Issues
- Document any bugs or issues found during testing

### Recommendations
- Document any improvements or enhancements suggested

---

## Quick Test Checklist

**User Flow:**
- [ ] Consent screen displays
- [ ] Consent submission works
- [ ] Dashboard loads with persona
- [ ] Recommendations display
- [ ] Chat bubble works
- [ ] Chat messages send/receive

**Admin Flow:**
- [ ] Admin login works
- [ ] User list displays
- [ ] Search works
- [ ] Sorting works
- [ ] User detail view works
- [ ] Audit log displays
- [ ] Audit log filtering works

**Edge Cases:**
- [ ] Invalid user ID handled
- [ ] Network errors handled
- [ ] Missing data handled gracefully

---

**Last Updated:** [Date]
**Tested By:** [Name]
**Version:** MVP + Phase 1 + Phase 2 + Phase 3

