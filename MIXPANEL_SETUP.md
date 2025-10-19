# Mixpanel Setup Guide - ArtMe App

## ✅ Installation Complete

Mixpanel has been successfully integrated into your ArtMe app with a complete tracking plan.

## 🔑 Configuration

- **Project Token:** `0727920bbe04bfe154712e1c41d9cc78`
- **API Endpoint:** `https://api-eu.mixpanel.com` (EU region)
- **Implementation File:** `lib/analytics.ts`

## 📊 Events Being Tracked

### Critical Events for Your Business Questions:

#### 1. **Style Selected** → Answers: "Which artists are most popular?"
- Properties: `style_name`, `style_category`, `is_first_selection`
- Triggered: When user taps an art style card
- Location: `app/(tabs)/index.tsx` lines 379-384 & 424-429

#### 2. **Paywall Viewed** → Answers: "How many times do users see the paywall?"
- Properties: `source`, `credits_remaining`, `transformations_completed_count`
- Triggered: When paywall appears
- Location: `app/(tabs)/index.tsx` lines 760-764 & 784-788

#### 3. **Masterpiece Created** → The "WOW" moment for activation
- Properties: `style_name`, `is_first_transformation`, `credits_remaining`
- Triggered: When transformation completes successfully
- Location: `app/(tabs)/index.tsx` lines 296-301

#### 4. **App Opened**
- Properties: `session_count`, `days_since_install`, `is_first_launch`
- Triggered: When app launches
- Location: `app/_layout.tsx` line 251

## 🧪 How to Test Mixpanel Integration

### Step 1: Open the App
1. Run your app: `npx expo start`
2. Open it in simulator or device
3. You should see in console: `✅ Mixpanel loaded successfully`
4. And: `✅ Analytics initialized - Event "App Opened" sent to Mixpanel`

### Step 2: Verify in Mixpanel Dashboard

1. Go to: https://mixpanel.com/project/YOUR_PROJECT_ID
2. Click on **"Events"** in left sidebar
3. Click **"Live View"** tab
4. You should see events appearing in real-time

### Step 3: Generate Test Events

Perform these actions in your app:

1. **Select an art style** (Van Gogh, Monet, etc.)
   - Should send: `Style Selected`
   - Check properties: `style_name`, `style_category`

2. **Select an image** from gallery or camera
   - Should send: `Image Selected`
   - Check properties: `source`, `is_first_image`

3. **Transform an image**
   - Should send: `Transformation Started`
   - Then: `Masterpiece Created` (when complete)
   - Check properties: `style_name`, `is_first_transformation`, `credits_remaining`

4. **Open the paywall** (after transformation or from profile)
   - Should send: `Paywall Viewed`
   - Check properties: `source`, `credits_remaining`, `transformations_completed_count`

### Step 4: Check User Properties

1. In Mixpanel, go to **"Users"** → **"Live View"**
2. Click on your test user
3. Verify these properties are set:
   - `total_transformations`
   - `credits_balance`
   - `subscription_status`
   - `paywall_views_count`
   - `onboarding_completed`

## 🔍 Troubleshooting

### Events Not Appearing?

1. **Check Console Logs:**
   ```
   ✅ Mixpanel loaded successfully
   📊 Event tracked: [Event Name] { properties }
   ```

2. **Verify Network:**
   - Open browser dev tools → Network tab
   - Filter by "mixpanel"
   - Should see POST requests to `https://api-eu.mixpanel.com/track`

3. **Check Initialization:**
   - Make sure app has restarted after npm install
   - Run: `npx expo prebuild --clean` if using bare workflow
   - Restart metro bundler

### Common Issues:

1. **`__DEV__` is not defined:**
   - This is normal in React Native web
   - The code handles this gracefully

2. **Events delayed:**
   - Mixpanel may batch events
   - Check "Live View" - it should update within 10-30 seconds

3. **User properties not updating:**
   - Make sure user is identified: `Analytics.identifyUser(userId, email)`
   - This should happen after signup/login

## 📈 Key Funnels to Build in Mixpanel

### 1. Activation Funnel
**Purpose:** See where users drop off before first transformation

**Steps:**
1. App Opened
2. Style Selected
3. Image Selected
4. Masterpiece Created

**How to Build:**
1. Go to Mixpanel → Funnels
2. Click "+ New Funnel"
3. Add the 4 events above in order
4. Save as "Activation Funnel"

### 2. Monetization Funnel
**Purpose:** Understand conversion from paywall view to purchase

**Steps:**
1. Paywall Viewed
2. Purchase Started
3. Purchase Completed

**Segmentation:** Add breakdown by:
- `source` (where paywall was shown)
- `credits_remaining`
- `transformations_completed_count`

**How to Build:**
1. Go to Mixpanel → Funnels
2. Add the 3 events above
3. Click "Breakdown" → Select properties mentioned
4. Save as "Monetization Funnel"

### 3. Repeat Engagement
**Purpose:** See if users come back to create more art

**Steps:**
1. Masterpiece Created (with `is_first_transformation = true`)
2. App Opened (at least 1 day later)
3. Masterpiece Created (second time)

**How to Build:**
1. Go to Mixpanel → Funnels
2. Add "Masterpiece Created" with filter `is_first_transformation = true`
3. Add "App Opened" with time constraint: "at least 1 day after step 1"
4. Add "Masterpiece Created" again
5. Save as "Repeat Engagement"

## 📊 Key Reports to Create

### 1. Most Popular Art Styles
**Type:** Insights → Segmentation

1. Event: `Style Selected`
2. Breakdown by: `style_name`
3. View as: Bar chart
4. Date range: Last 30 days

### 2. Paywall Conversion Rate
**Type:** Funnels

1. Step 1: Paywall Viewed
2. Step 2: Purchase Completed
3. View conversion %

### 3. Daily Active Users (DAU)
**Type:** Insights → Segmentation

1. Event: `App Opened`
2. Count unique users
3. Show: Daily
4. Date range: Last 30 days

### 4. Revenue by Product
**Type:** Insights → Segmentation

1. Event: `Purchase Completed`
2. Sum of: `revenue`
3. Breakdown by: `product_type`

## 🎯 Your Specific Business Questions - Answered

### Q1: "Are users getting to the wow moment?"
→ **Check:** Activation Funnel
→ **Metric:** % who complete "Masterpiece Created"

### Q2: "Which art styles are most popular?"
→ **Check:** "Style Selected" event segmented by `style_name`
→ **Report:** Most Popular Art Styles (see above)

### Q3: "Where are users seeing the paywall?"
→ **Check:** "Paywall Viewed" segmented by `source`
→ **Look for:** Which source has highest volume

### Q4: "Why are they buying (or not)?"
→ **Check:** Monetization Funnel segmented by:
  - `credits_remaining` (do they wait until 0?)
  - `transformations_completed_count` (buy after trying the product?)
  - `source` (which trigger converts best?)

### Q5: "Which purchase option is most popular?"
→ **Check:** "Purchase Completed" segmented by `product_id`
→ **Or:** Sum `revenue` by `product_type` (credits vs subscription)

### Q6: "Do users come back after the first day/week?"
→ **Check:** Retention report (Mixpanel → Retention)
→ **Cohort:** Users who completed "Masterpiece Created"
→ **Return event:** "App Opened"
→ **Timeframe:** Day 1, Day 7, Day 30

## 🚀 Next Steps

1. **Let the app run** for a few hours/days to collect data
2. **Build the 3 key funnels** mentioned above
3. **Create a dashboard** with your 4-5 most important metrics
4. **Set up alerts** for:
   - Drop in activation rate (Masterpiece Created %)
   - Spike in paywall dismissals without purchase
   - Unusual decrease in DAU

## 💡 Pro Tips

1. **Cohort Analysis:** In any Mixpanel report, you can segment by user cohorts (e.g., "Users who signed up this week")

2. **Retention Magic:** The Retention report will automatically show you D1, D7, D30 retention for any cohort

3. **Revenue Tracking:** Mixpanel's `mixpanel.people.track_charge()` is already set up - you'll see LTV per user in the People section

4. **Export Data:** You can export any report to CSV for deeper analysis in Excel/Sheets

## 📞 Support

- **Mixpanel Docs:** https://docs.mixpanel.com/
- **React Native Integration:** https://docs.mixpanel.com/docs/tracking-methods/sdks/javascript
- **EU Data Residency:** https://docs.mixpanel.com/docs/privacy/eu-residency

---

**Summary:** Mixpanel is now fully integrated and tracking all critical events. Open your app, perform some actions, then check Mixpanel Live View within 30 seconds to see events flowing in! 🎉
