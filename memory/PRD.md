# May - AI Habit Trainer App

## Overview
May is a cross-platform AI-powered habit trainer app. Users set goals, receive personalized day-by-day plans from AI (Gemini 3 Flash), and get daily motivation through chat. The app tracks streaks, manages multiple goals with categories, and intelligently reschedules missed tasks.

## Tech Stack
- **Frontend**: React Native (Expo SDK 54) with Expo Router
- **Backend**: FastAPI + MongoDB (Motor)
- **AI**: Gemini 3 Flash via emergentintegrations (Emergent LLM Key)
- **Payments**: Stripe (test key) with Apple Pay / Google Pay support
- **Auth**: JWT Bearer tokens

## Core Features

### Authentication
- Email/password registration and login
- Guest sign-in for trying the app
- JWT token stored in AsyncStorage
- Guest-to-full account upgrade

### Goal Management
- Create goals with title, description, category, and duration (7-90 days)
- AI generates personalized day-by-day plans (Gemini 3 Flash)
- Review and accept AI-generated plans
- Support for 8 categories: fitness, learning, productivity, health, creativity, mindfulness, finance, other
- Multiple simultaneous goals

### Daily Tasks
- Auto-generated from the accepted plan
- Toggle task completion with optimistic UI
- Progress tracking per day
- Streak tracking (consecutive days with all tasks completed)

### AI Chat
- Chat with May (AI coach) per goal
- Context-aware responses based on goal progress, streak, and history
- Warm, encouraging, and actionable coaching

### Smart Rescheduling
- Detects missed/incomplete tasks from previous days
- AI redistributes tasks across remaining days
- Maintains goal continuity

### Subscription (Stripe)
- **Free/Guest**: 1 goal (guest) / 2 goals (registered)
- **May Premium Monthly**: $6.99/month - Unlimited everything
- **May Premium Yearly**: $49.99/year (40% savings) - Unlimited everything
- Apple Pay (iOS) / Google Pay (Android) / Card (Web) via Stripe Checkout
- Payment status polling and webhook support

### Theme Support
- Auto (follows system), Light, Dark modes
- Persisted preference in AsyncStorage
- Consistent design system (Pastel & Soft archetype)

## API Endpoints
- POST /api/auth/register, /api/auth/login, /api/auth/guest, /api/auth/me, /api/auth/upgrade
- GET /api/dashboard
- POST /api/goals, GET /api/goals, GET /api/goals/{id}, PUT /api/goals/{id}/accept, DELETE /api/goals/{id}
- GET /api/goals/{id}/tasks/today, POST /api/goals/{id}/tasks/{idx}/toggle
- POST /api/goals/{id}/reschedule
- POST /api/goals/{id}/chat, GET /api/goals/{id}/chat
- GET /api/goals/{id}/daily-message
- GET /api/subscription/plans, POST /api/subscription/checkout, GET /api/subscription/status/{sid}, GET /api/subscription/me
- POST /api/webhook/stripe

## Navigation
- Welcome → Auth (Login/Register) → Tabs (Home, Goals, May, Profile)
- Goal Create → Goal Detail (Plan Review / Active Tasks)
- Chat per goal → Full chat interface with May
- Subscription screen with pricing

## Database Collections
users, goals, daily_progress, chat_messages, daily_messages, payment_transactions
