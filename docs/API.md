# API Documentation - FinSight AI

Complete API reference for FinSight AI backend endpoints.

## Base URL

```
http://localhost:3002/api
```

## Authentication

### Consent-Based Access

Most endpoints require **active user consent**. Consent is managed via the `/api/consent` endpoint. Endpoints protected by consent will return `403 Forbidden` if the user has not consented.

### Admin Access

Admin endpoints require password authentication via `/api/admin/login`. Admin access is session-based (handled by frontend state in this demo).

## Rate Limits

Currently, there are no rate limits implemented. For production, consider implementing:
- Per-user rate limits
- Per-endpoint rate limits
- IP-based rate limiting

## Error Responses

All endpoints follow a consistent error response format:

```json
{
  "error": "Error message",
  "message": "Additional details (optional)"
}
```

### HTTP Status Codes

- `200 OK` - Success
- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - Authentication required (admin endpoints)
- `403 Forbidden` - Consent required
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

## Endpoints

### Health & Status

#### GET /api/health

Health check endpoint to verify the API is running.

**Authentication:** None required

**Response:**
```json
{
  "status": "ok",
  "message": "FinSight AI Backend is running"
}
```

**Example:**
```bash
curl http://localhost:3002/api/health
```

---

#### GET /api

API welcome message.

**Authentication:** None required

**Response:**
```json
{
  "message": "Welcome to FinSight AI API"
}
```

**Example:**
```bash
curl http://localhost:3002/api
```

---

### Consent Management

#### POST /api/consent

Record or revoke user consent for data analysis.

**Authentication:** None required

**Request Body:**
```json
{
  "user_id": "string (required)",
  "consented": "boolean (required)"
}
```

**Response (Consent Recorded):**
```json
{
  "success": true,
  "message": "Consent recorded successfully",
  "consent_id": "consent-123",
  "consent": {
    "consent_id": "consent-123",
    "user_id": "user-123",
    "status": "active",
    "consented_at": "2025-01-15T10:30:00Z",
    "revoked_at": null
  }
}
```

**Response (Consent Revoked):**
```json
{
  "success": true,
  "message": "Consent revoked successfully"
}
```

**Error Responses:**
- `400` - Invalid request (missing user_id or consented)
- `404` - User not found
- `404` - No active consent to revoke

**Example:**
```bash
# Record consent
curl -X POST http://localhost:3002/api/consent \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-1762493514942-gm8c7gimv",
    "consented": true
  }'

# Revoke consent
curl -X POST http://localhost:3002/api/consent \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-1762493514942-gm8c7gimv",
    "consented": false
  }'
```

---

### User Profile

#### GET /api/profile/:user_id

Get user's behavioral profile, persona assignment, and financial signals.

**Authentication:** Requires active consent

**Path Parameters:**
- `user_id` (string, required) - User identifier

**Response:**
```json
{
  "user_id": "user-123",
  "persona": {
    "type": "high_utilization",
    "assigned_at": "2025-01-15T10:30:00Z",
    "confidence": 0.85,
    "criteria_met": ["utilization >= 50%", "interest_charges > 0"],
    "secondary_personas": ["variable_income"]
  },
  "signals": {
    "utilization": {
      "utilization": 65.5,
      "balance": 3275.00,
      "limit": 5000.00,
      "threshold": "high",
      "isHighUtilization": true
    },
    "interest_charges": {
      "totalCharges": 125.50,
      "monthlyAverage": 41.83,
      "chargeCount": 3
    },
    "minimum_payment_only": false,
    "is_overdue": false,
    "recurringMerchants": 5,
    "monthlyRecurringSpend": 89.99,
    "subscriptionShare": 0.12,
    "savingsGrowthRate": 0.05,
    "netSavingsInflow": 500.00,
    "emergencyFundCoverage": 3.2,
    "incomeStability": "stable",
    "averageIncome": 4500.00
  }
}
```

**Response (No Persona):**
```json
{
  "user_id": "user-123",
  "persona": null,
  "signals": {},
  "message": "No persona assigned - criteria not met"
}
```

**Error Responses:**
- `403` - Consent required
- `404` - User not found
- `500` - Failed to assign persona

**Example:**
```bash
curl http://localhost:3002/api/profile/user-1762493514942-gm8c7gimv
```

---

### Recommendations

#### GET /api/recommendations/:user_id

Get personalized recommendations for a user based on their persona and financial signals.

**Authentication:** Requires active consent

**Path Parameters:**
- `user_id` (string, required) - User identifier

**Response:**
```json
{
  "user_id": "user-123",
  "recommendations": [
    {
      "id": "rec-123",
      "type": "education",
      "title": "Understanding Credit Utilization",
      "description": "Learn how credit utilization affects your credit score...",
      "rationale": "Based on your 65% credit utilization, we recommend...",
      "impact_estimate": {
        "savings": "Potential $200-500/year",
        "urgency": "high",
        "difficulty": "medium"
      },
      "created_at": "2025-01-15T10:30:00Z"
    },
    {
      "id": "rec-124",
      "type": "partner_offer",
      "title": "Balance Transfer Credit Card",
      "description": "Transfer your high-interest balance to a 0% APR card...",
      "rationale": "You're paying $125/month in interest charges...",
      "impact_estimate": {
        "savings": "Save $1,500/year in interest",
        "urgency": "high",
        "difficulty": "low"
      },
      "created_at": "2025-01-15T10:30:00Z"
    }
  ],
  "count": 5
}
```

**Response (No Recommendations):**
```json
{
  "user_id": "user-123",
  "recommendations": [],
  "count": 0,
  "message": "Please load your profile first to assign a persona and generate recommendations"
}
```

**Error Responses:**
- `403` - Consent required
- `404` - User not found
- `500` - Failed to generate recommendations

**Example:**
```bash
curl http://localhost:3002/api/recommendations/user-1762493514942-gm8c7gimv
```

---

### Payment Plans

#### GET /api/payment-plan/:user_id

Get a debt payment plan using Avalanche or Snowball strategy.

**Authentication:** Requires active consent

**Path Parameters:**
- `user_id` (string, required) - User identifier

**Query Parameters:**
- `strategy` (string, optional) - Payment strategy: `"avalanche"` (default) or `"snowball"`

**Response:**
```json
{
  "strategy": "avalanche",
  "availableCashFlow": 500.00,
  "totalDebt": 15000.00,
  "totalInterest": 2500.00,
  "payoffMonths": 18,
  "interestSaved": 500.00,
  "debts": [
    {
      "liabilityId": "liab-123",
      "accountId": "acc-123",
      "accountName": "Chase Credit Card",
      "type": "credit_card",
      "balance": 8000.00,
      "apr": 0.24,
      "monthlyPayment": 300.00,
      "payoffMonth": 12,
      "totalInterest": 1200.00,
      "totalPaid": 9200.00
    }
  ],
  "timeline": [
    {
      "month": 1,
      "date": "2025-02-15",
      "totalPayment": 500.00,
      "debts": [
        {
          "liabilityId": "liab-123",
          "payment": 300.00,
          "remainingBalance": 7800.00
        }
      ]
    }
  ]
}
```

**Error Responses:**
- `403` - Consent required
- `404` - User not found
- `500` - Failed to generate payment plan

**Example:**
```bash
# Avalanche strategy (default)
curl http://localhost:3002/api/payment-plan/user-1762493514942-gm8c7gimv

# Snowball strategy
curl "http://localhost:3002/api/payment-plan/user-1762493514942-gm8c7gimv?strategy=snowball"
```

---

#### GET /api/payment-plan/:user_id/compare

Get a comparison of Avalanche vs Snowball payment strategies.

**Authentication:** Requires active consent

**Path Parameters:**
- `user_id` (string, required) - User identifier

**Response:**
```json
{
  "avalanche": {
    "strategy": "avalanche",
    "availableCashFlow": 500.00,
    "totalDebt": 15000.00,
    "totalInterest": 2500.00,
    "payoffMonths": 18,
    "interestSaved": 500.00,
    "debts": [...],
    "timeline": [...]
  },
  "snowball": {
    "strategy": "snowball",
    "availableCashFlow": 500.00,
    "totalDebt": 15000.00,
    "totalInterest": 2800.00,
    "payoffMonths": 20,
    "interestSaved": 200.00,
    "debts": [...],
    "timeline": [...]
  }
}
```

**Error Responses:**
- `403` - Consent required
- `404` - User not found
- `500` - Failed to generate comparison

**Example:**
```bash
curl http://localhost:3002/api/payment-plan/user-1762493514942-gm8c7gimv/compare
```

---

### AI Chat

#### POST /api/chat/:user_id

Send a message to the AI chat assistant and get a personalized response.

**Authentication:** Requires active consent

**Path Parameters:**
- `user_id` (string, required) - User identifier

**Request Body:**
```json
{
  "message": "string (required) - User's question or message",
  "conversation_id": "string (optional) - Conversation ID for context"
}
```

**Response:**
```json
{
  "response": "Based on your 65% credit utilization, I recommend...",
  "conversationId": "conv-123",
  "cached": false,
  "tokensUsed": 150
}
```

**Response (Cached):**
```json
{
  "response": "Based on your 65% credit utilization, I recommend...",
  "conversationId": "conv-123",
  "cached": true,
  "tokensUsed": 0
}
```

**Error Responses:**
- `400` - Message is required
- `403` - Consent required
- `404` - User not found
- `500` - Failed to process chat message

**Example:**
```bash
curl -X POST http://localhost:3002/api/chat/user-1762493514942-gm8c7gimv \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How can I improve my credit score?",
    "conversation_id": "conv-123"
  }'
```

**Note:** Responses are cached for 1 hour. Similar queries will return cached responses to reduce API costs.

---

### Transaction History

#### GET /api/transactions/:user_id

Get user's transaction history with pagination and search.

**Authentication:** Requires active consent

**Path Parameters:**
- `user_id` (string, required) - User identifier

**Query Parameters:**
- `page` (number, optional) - Page number (default: 1)
- `limit` (number, optional) - Items per page (default: 20, max: 100)
- `search` (string, optional) - Search term (searches merchant name and categories)

**Response:**
```json
{
  "transactions": [
    {
      "transaction_id": "tx-123",
      "date": "2025-01-15",
      "amount": -45.99,
      "merchant_name": "Netflix",
      "category": "GENERAL_MERCHANDISE"
    }
  ],
  "total": 260,
  "page": 1,
  "limit": 20,
  "totalPages": 13
}
```

**Error Responses:**
- `403` - Consent required
- `404` - User not found
- `500` - Failed to fetch transactions

**Example:**
```bash
# Get first page
curl http://localhost:3002/api/transactions/user-1762493514942-gm8c7gimv

# Get page 2
curl "http://localhost:3002/api/transactions/user-1762493514942-gm8c7gimv?page=2"

# Search transactions
curl "http://localhost:3002/api/transactions/user-1762493514942-gm8c7gimv?search=netflix"
```

---

### Persona History

#### GET /api/persona-history/:user_id

Get persona evolution timeline showing how the user's persona has changed over time.

**Authentication:** Requires active consent

**Path Parameters:**
- `user_id` (string, required) - User identifier

**Query Parameters:**
- `months` (number, optional) - Number of months to look back (default: 12)

**Response:**
```json
{
  "user_id": "user-123",
  "history": [
    {
      "persona_id": "persona-123",
      "persona_type": "high_utilization",
      "assigned_at": "2025-01-15T10:30:00Z",
      "confidence": 0.85,
      "signals": {...}
    }
  ],
  "timeline": [
    {
      "persona": "high_utilization",
      "startDate": "2025-01-15",
      "endDate": "2025-02-15",
      "duration": "1 month",
      "narrative": "User showed high credit utilization..."
    }
  ],
  "months": 12
}
```

**Error Responses:**
- `403` - Consent required
- `404` - User not found
- `500` - Failed to fetch persona history

**Example:**
```bash
# Get 12 months of history (default)
curl http://localhost:3002/api/persona-history/user-1762493514942-gm8c7gimv

# Get 6 months of history
curl "http://localhost:3002/api/persona-history/user-1762493514942-gm8c7gimv?months=6"
```

---

### Spending Analysis

#### GET /api/spending-analysis/:user_id

Get detailed spending analysis including category breakdown, monthly trends, and top merchants.

**Authentication:** Requires active consent

**Path Parameters:**
- `user_id` (string, required) - User identifier

**Query Parameters:**
- `months` (number, optional) - Number of months to analyze (default: 6)

**Response:**
```json
{
  "user_id": "user-123",
  "totalSpending": 15000.00,
  "averageMonthlySpending": 2500.00,
  "categoryBreakdown": [
    {
      "category": "GENERAL_MERCHANDISE",
      "amount": 5000.00,
      "percentage": 33.33
    },
    {
      "category": "FOOD_AND_DRINK",
      "amount": 3000.00,
      "percentage": 20.00
    }
  ],
  "monthlyTrend": [
    {
      "month": "2024-12",
      "income": 4500.00,
      "expenses": 2400.00,
      "net": 2100.00
    }
  ],
  "topMerchants": [
    {
      "merchant": "Amazon",
      "count": 25,
      "total": 1200.00
    }
  ],
  "unusualSpending": [
    {
      "date": "2025-01-10",
      "amount": 500.00,
      "merchant": "Electronics Store",
      "reason": "Spending 2x average for this merchant"
    }
  ],
  "months": 6
}
```

**Error Responses:**
- `403` - Consent required
- `404` - User not found
- `500` - Failed to fetch spending analysis

**Example:**
```bash
# Get 6 months of analysis (default)
curl http://localhost:3002/api/spending-analysis/user-1762493514942-gm8c7gimv

# Get 12 months of analysis
curl "http://localhost:3002/api/spending-analysis/user-1762493514942-gm8c7gimv?months=12"
```

---

### Admin Endpoints

#### POST /api/admin/login

Authenticate as an admin user.

**Authentication:** None required (but password required)

**Request Body:**
```json
{
  "password": "string (required) - Admin password"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful"
}
```

**Error Responses:**
- `400` - Password is required
- `401` - Invalid password

**Example:**
```bash
curl -X POST http://localhost:3002/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "password": "admin"
  }'
```

**Note:** Default password is `"admin"`. Set `ADMIN_PASSWORD` environment variable to change it.

---

#### GET /api/admin/users

Get list of users with active consent (for admin dashboard).

**Authentication:** Admin password (handled by frontend)

**Query Parameters:**
- `page` (number, optional) - Page number (default: 1)
- `limit` (number, optional) - Items per page (default: 20)
- `search` (string, optional) - Search by name or email

**Response:**
```json
{
  "users": [
    {
      "user_id": "user-123",
      "name": "John Doe",
      "email": "john@example.com",
      "persona_type": "high_utilization",
      "consent_status": "active",
      "last_active": "2025-01-15T10:30:00Z"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 20,
  "totalPages": 5
}
```

**Error Responses:**
- `500` - Failed to fetch users

**Example:**
```bash
# Get first page
curl http://localhost:3002/api/admin/users

# Search users
curl "http://localhost:3002/api/admin/users?search=john"

# Get page 2
curl "http://localhost:3002/api/admin/users?page=2&limit=50"
```

---

#### GET /api/admin/user/:user_id

Get detailed information about a specific user (for admin dashboard).

**Authentication:** Admin password (handled by frontend)

**Path Parameters:**
- `user_id` (string, required) - User identifier

**Response:**
```json
{
  "user_id": "user-123",
  "name": "John Doe",
  "email": "john@example.com",
  "created_at": "2024-10-15T10:30:00Z",
  "has_consent": true,
  "current_persona": {
    "type": "high_utilization",
    "assigned_at": "2025-01-15T10:30:00Z",
    "confidence": 0.85
  },
  "persona_history": [
    {
      "persona_type": "high_utilization",
      "assigned_at": "2025-01-15T10:30:00Z"
    }
  ],
  "recommendations": [
    {
      "id": "rec-123",
      "type": "education",
      "title": "Understanding Credit Utilization",
      "created_at": "2025-01-15T10:30:00Z"
    }
  ],
  "signals": {
    "utilization": 65.5,
    "interest_charges": 125.50,
    "recurringMerchants": 5
  },
  "recent_transactions": [
    {
      "transaction_id": "tx-123",
      "date": "2025-01-15",
      "amount": -45.99,
      "merchant_name": "Netflix"
    }
  ]
}
```

**Response (No Consent):**
```json
{
  "user_id": "user-123",
  "name": "John Doe",
  "email": "john@example.com",
  "created_at": "2024-10-15T10:30:00Z",
  "has_consent": false,
  "current_persona": null,
  "persona_history": [],
  "recommendations": [],
  "signals": {},
  "recent_transactions": []
}
```

**Error Responses:**
- `404` - User not found
- `500` - Failed to fetch user detail

**Note:** Access is logged to audit trail. If user has no consent, sensitive data is not returned.

**Example:**
```bash
curl http://localhost:3002/api/admin/user/user-1762493514942-gm8c7gimv
```

---

#### GET /api/admin/audit

Get audit log of admin actions.

**Authentication:** Admin password (handled by frontend)

**Query Parameters:**
- `page` (number, optional) - Page number (default: 1)
- `limit` (number, optional) - Items per page (default: 50)
- `adminId` (string, optional) - Filter by admin ID
- `userId` (string, optional) - Filter by user ID
- `action` (string, optional) - Filter by action type
- `startDate` (string, optional) - Filter by start date (ISO format)
- `endDate` (string, optional) - Filter by end date (ISO format)

**Response:**
```json
{
  "logs": [
    {
      "log_id": "log-123",
      "admin_id": "admin",
      "user_id": "user-123",
      "action": "viewed_profile",
      "timestamp": "2025-01-15T10:30:00Z"
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 50,
  "totalPages": 3
}
```

**Error Responses:**
- `500` - Failed to fetch audit log

**Example:**
```bash
# Get all audit logs
curl http://localhost:3002/api/admin/audit

# Filter by user
curl "http://localhost:3002/api/admin/audit?userId=user-123"

# Filter by date range
curl "http://localhost:3002/api/admin/audit?startDate=2025-01-01&endDate=2025-01-31"
```

---

## Consent Requirements Summary

| Endpoint | Consent Required | Notes |
|----------|-----------------|-------|
| `GET /api/health` | ❌ No | Public health check |
| `GET /api` | ❌ No | Public welcome message |
| `POST /api/consent` | ❌ No | Used to record consent |
| `GET /api/profile/:user_id` | ✅ Yes | Requires active consent |
| `GET /api/recommendations/:user_id` | ✅ Yes | Requires active consent |
| `GET /api/payment-plan/:user_id` | ✅ Yes | Requires active consent |
| `GET /api/payment-plan/:user_id/compare` | ✅ Yes | Requires active consent |
| `POST /api/chat/:user_id` | ✅ Yes | Requires active consent |
| `GET /api/transactions/:user_id` | ✅ Yes | Requires active consent |
| `GET /api/persona-history/:user_id` | ✅ Yes | Requires active consent |
| `GET /api/spending-analysis/:user_id` | ✅ Yes | Requires active consent |
| `POST /api/admin/login` | ❌ No | Admin authentication |
| `GET /api/admin/users` | ❌ No | Admin only (password required) |
| `GET /api/admin/user/:user_id` | ❌ No | Admin only (password required) |
| `GET /api/admin/audit` | ❌ No | Admin only (password required) |

## Testing Examples

### Complete User Flow

```bash
# 1. Health check
curl http://localhost:3002/api/health

# 2. Record consent
curl -X POST http://localhost:3002/api/consent \
  -H "Content-Type: application/json" \
  -d '{"user_id":"user-1762493514942-gm8c7gimv","consented":true}'

# 3. Get profile (triggers persona assignment)
curl http://localhost:3002/api/profile/user-1762493514942-gm8c7gimv

# 4. Get recommendations
curl http://localhost:3002/api/recommendations/user-1762493514942-gm8c7gimv

# 5. Get transaction history
curl http://localhost:3002/api/transactions/user-1762493514942-gm8c7gimv

# 6. Chat with AI
curl -X POST http://localhost:3002/api/chat/user-1762493514942-gm8c7gimv \
  -H "Content-Type: application/json" \
  -d '{"message":"How can I improve my credit score?"}'
```

### Admin Flow

```bash
# 1. Admin login
curl -X POST http://localhost:3002/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"password":"admin"}'

# 2. Get user list
curl http://localhost:3002/api/admin/users

# 3. Get user detail
curl http://localhost:3002/api/admin/user/user-1762493514942-gm8c7gimv

# 4. Get audit log
curl http://localhost:3002/api/admin/audit
```

## Response Caching

Some endpoints include caching headers:

- **Static endpoints** (`/api/health`, `/api`): 5 minutes cache
- **Dynamic endpoints**: 30 seconds cache

Clients should respect these headers for optimal performance.

## Notes

- All timestamps are in ISO 8601 format (UTC)
- All monetary amounts are in USD
- User IDs are strings and should be URL-encoded in requests
- Pagination is 1-indexed (page 1 is the first page)
- Search is case-insensitive and searches across multiple fields
- Admin endpoints do not require consent but require password authentication
- Chat responses are cached for 1 hour to reduce API costs

