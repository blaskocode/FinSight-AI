# Demo Script - FinSight AI

This script is designed for a 5-7 minute demo video showcasing FinSight AI's capabilities.

## Pre-Demo Setup

1. **Start the application:**
   ```bash
   npm run dev
   ```

2. **Have test user ready:**
   - User ID: `user-1762493514942-gm8c7gimv` (High Utilization persona)
   - Or use a user from data generation output

3. **Prepare browser:**
   - Open http://localhost:3000
   - Clear browser cache if needed
   - Have browser console open (optional, for debugging)

---

## Demo Script (5-7 minutes)

### [0:00-0:30] Introduction & Problem Statement

**Visual:** Show application logo or welcome screen

**Narration:**
> "Hi, I'm here to show you FinSight AI - a personalized financial insights platform that transforms transaction data into actionable recommendations.
>
> **The Problem:** Banks have access to rich transaction data but are constrained from providing personalized financial advice due to regulatory limitations. Customers need guidance but often receive generic recommendations that don't address their specific financial situation.
>
> **The Solution:** FinSight AI bridges this gap by analyzing transaction patterns, assigning users to financial personas, and providing personalized, explainable recommendations - all while maintaining strict consent and eligibility guardrails."

**Action:** 
- Show the application homepage or consent screen

---

### [0:30-1:00] Consent-First Approach

**Visual:** Consent screen

**Narration:**
> "FinSight AI is built on a **consent-first** foundation. Before any analysis happens, users must explicitly opt-in to data sharing. This ensures transparency and user control.
>
> Notice how we clearly explain:
> - What data we'll analyze
> - How it will be used
> - That users can revoke consent at any time
>
> This is critical for building trust and maintaining compliance."

**Action:**
- Highlight the consent explanation
- Show the consent checkbox
- Enter a test user ID
- Click "I Consent"

---

### [1:00-2:00] Persona Assignment & Dashboard

**Visual:** Dashboard loading, then persona reveal

**Narration:**
> "Once consent is given, FinSight AI analyzes the user's transaction history to detect behavioral patterns. Based on these patterns, we assign users to one of five financial personas:
>
> - **High Utilization**: Users with high credit card usage
> - **Variable Income**: Users with irregular income patterns
> - **Subscription Heavy**: Users with many recurring subscriptions
> - **Savings Builder**: Users actively building savings
> - **Lifestyle Creep**: High earners with low savings rates
>
> In this case, our user has been assigned the **High Utilization** persona based on their 65% credit utilization and interest charges.
>
> Notice the distinct visual identity - each persona has its own color scheme, icon, and description. This makes the persona feel personal and relatable."

**Action:**
- Show the persona card with animation
- Highlight the confidence score
- Show the financial health score
- Point out the visual design elements

---

### [2:00-3:00] Behavioral Signals & Insights

**Visual:** Quick Stats Widget and Signals

**Narration:**
> "FinSight AI doesn't just assign a persona - it provides detailed behavioral signals that explain *why* the persona was assigned.
>
> For this High Utilization user, we can see:
> - 65% credit utilization (well above the 50% threshold)
> - $125 in interest charges over the past 3 months
> - Multiple credit accounts with balances
>
> These signals are calculated in real-time from transaction data and provide transparency into the decision-making process.
>
> We also show quick stats like monthly recurring spend, emergency fund coverage, and income stability - giving users a complete picture of their financial health."

**Action:**
- Scroll to Quick Stats Widget
- Show the persona-specific metrics
- Highlight trend indicators
- Show tooltips on hover

---

### [3:00-4:00] Personalized Recommendations

**Visual:** Recommendations list

**Narration:**
> "Based on the persona and behavioral signals, FinSight AI generates personalized recommendations. Each recommendation includes:
>
> - **A clear title and description**
> - **A personalized rationale** explaining why this recommendation is relevant
> - **An impact estimate** showing potential savings or benefits
>
> Notice how the rationale is specific: 'Based on your 65% credit utilization, we recommend...' - not generic advice.
>
> Recommendations are ranked by impact and urgency, ensuring users see the most valuable suggestions first.
>
> We have two types of recommendations:
> - **Education content**: Articles, guides, and tools to help users learn
> - **Partner offers**: Eligible financial products like balance transfer cards or high-yield savings accounts
>
> All partner offers are filtered through eligibility checks to ensure they're safe and relevant."

**Action:**
- Scroll through recommendations
- Click on a recommendation to show details
- Highlight the personalized rationale
- Show a partner offer card
- Show the payment plan modal if applicable

---

### [4:00-5:00] AI Chat Interface

**Visual:** Chat bubble and chat window

**Narration:**
> "One of FinSight AI's most powerful features is the conversational AI interface. Users can ask questions about their finances and get personalized, contextual answers.
>
> The AI has access to the user's transaction data, persona, and behavioral signals, so it can provide specific, relevant advice.
>
> For example, users can ask:
> - 'How much did I spend on dining last month?'
> - 'Why is my credit utilization high?'
> - 'What's a good emergency fund size for someone like me?'
>
> The AI uses GPT-4o-mini to generate empathetic, educational responses. Responses are cached to reduce costs and improve response times.
>
> Notice how the AI references specific data points from the user's profile - this makes the advice feel personal and trustworthy."

**Action:**
- Click the chat bubble
- Type a question: "How can I improve my credit score?"
- Show the AI response
- Ask another question: "What's my biggest spending category?"
- Show the transaction query capability

---

### [5:00-6:00] Persona Evolution & Spending Insights

**Visual:** Persona Timeline and Spending Breakdown

**Narration:**
> "FinSight AI doesn't just show the current state - it tracks how users' financial personas evolve over time.
>
> The Persona Evolution Timeline shows when and why personas changed, creating a narrative of the user's financial journey.
>
> We also provide rich spending insights with visualizations:
> - Category breakdown pie charts
> - Monthly income vs expenses trends
> - Top merchants analysis
> - Unusual spending alerts
>
> These insights help users understand their spending patterns and identify opportunities for improvement."

**Action:**
- Scroll to Persona Timeline
- Show the timeline visualization
- Scroll to Spending Breakdown
- Show the pie chart
- Show the bar chart
- Highlight top merchants

---

### [6:00-6:30] Admin Oversight

**Visual:** Admin dashboard (switch to admin view)

**Narration:**
> "For financial institutions, FinSight AI includes an admin dashboard for oversight and compliance.
>
> Admins can:
> - View all users with active consent
> - See detailed user profiles and recommendations
> - Track persona assignments and changes
> - View transaction history
> - Access a complete audit log of all admin actions
>
> Importantly, admins **cannot** access user data without consent - the system enforces strict privacy controls.
>
> All admin access is logged for compliance and audit purposes."

**Action:**
- Switch to admin view (if possible, or show screenshots)
- Show user list
- Show user detail view
- Show audit log
- Highlight consent enforcement

---

### [6:30-7:00] Key Takeaways & Closing

**Visual:** Dashboard overview or key features highlight

**Narration:**
> "To summarize, FinSight AI provides:
>
> - **Personalized insights** based on behavioral analysis
> - **Explainable recommendations** with specific data points
> - **Consent-first architecture** ensuring user privacy
> - **AI-powered conversations** for financial education
> - **Visual excellence** with persona-driven design
> - **Admin oversight** for compliance and monitoring
>
> All while maintaining strict guardrails to stay within educational boundaries - never crossing into regulated financial advice.
>
> Thank you for watching! For more information, visit our documentation or try the demo yourself."

**Action:**
- Show a final overview of the dashboard
- Highlight key features
- Show the "Not Financial Advice" disclaimer

---

## Key Talking Points

### Problem Statement
- Banks have data but can't give advice
- Generic recommendations don't help
- Users need personalized guidance

### Solution Highlights
- Behavioral pattern detection
- Persona-based personalization
- Explainable AI recommendations
- Consent-first architecture

### Technical Excellence
- Real-time signal calculation
- AI-powered rationale generation
- Comprehensive testing (142 tests passing)
- Performance optimized
- Fully responsive design

### User Experience
- Beautiful, persona-driven UI
- Smooth animations
- Clear, educational language
- Actionable recommendations

---

## Demo Tips

### Do's
- ✅ Speak clearly and at a moderate pace
- ✅ Highlight specific data points (e.g., "65% utilization")
- ✅ Show the visual polish and animations
- ✅ Emphasize the consent-first approach
- ✅ Show the AI chat in action
- ✅ Demonstrate the persona evolution

### Don'ts
- ❌ Don't rush through features
- ❌ Don't skip the consent explanation
- ❌ Don't forget to show error handling
- ❌ Don't ignore the mobile responsiveness
- ❌ Don't forget the "Not Financial Advice" disclaimer

---

## Alternative Demo Flow (Shorter - 3-4 minutes)

If you need a shorter demo:

1. **[0:00-0:30]** Problem & Solution
2. **[0:30-1:00]** Consent & Persona Assignment
3. **[1:00-2:00]** Recommendations & Rationale
4. **[2:00-2:30]** AI Chat Demo
5. **[2:30-3:00]** Key Takeaways

---

## Post-Demo Notes

After recording, consider:
- Adding captions/subtitles
- Creating a highlights reel (1-2 minutes)
- Adding background music (optional)
- Including a call-to-action
- Sharing on demo platforms

---

## Evaluation Metrics to Highlight

If creating a metrics report, include:
- **Coverage**: 100% of users have assigned personas
- **Explainability**: 100% of recommendations have rationales
- **Latency**: <5 seconds for recommendation generation
- **Test Coverage**: 142 tests passing (53 unit, 34 business logic, 55 integration)
- **Performance**: Optimized with indexes, caching, code splitting
- **Responsiveness**: Fully responsive, mobile-optimized

