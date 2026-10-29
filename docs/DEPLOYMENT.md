# HostelEase — Production Deployment Guide

This guide walks you through deploying **HostelEase** with a cloud MongoDB Atlas database, Render backend, and Vercel frontend.

---

## Architecture Overview

- **Database:** MongoDB Atlas (AWS Mumbai, replica set)
- **Backend API:** Node.js Express on Render (`https://hostelease-api.onrender.com`)
- **Frontend SPA:** Vite + React on Vercel (`https://hostelease.vercel.app`)
- **Email Delivery:** Resend Node.js SDK

---

## Step 1: Push Code to GitHub

Open terminal in the project directory:

```bash
git add .
git commit -m "feat: configure vercel rewrites and render blueprint for deployment"
git push origin main
```

---

## Step 2: Deploy Backend to Render (3 Minutes)

1. Sign in to [Render.com](https://render.com).
2. Click **New +** → **Web Service**.
3. Select your GitHub repository (`COMPLAIN-APP` or `hostel-complaint-tracker`).
4. Configure the service:
   - **Name:** `hostelease-api`
   - **Region:** Singapore or Frankfurt (closest to Mumbai)
   - **Branch:** `main`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npx tsx server/server.ts`
   - **Instance Type:** `Free`
5. Click **Advanced** → **Add Environment Variable** and enter:
   | Key | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `PORT` | `10000` |
   | `MONGODB_URI` | `mongodb+srv://<username>:<password>@cluster0.exks1t3.mongodb.net/hostel_complaints?retryWrites=true&w=majority` |
   | `JWT_SECRET` | *(Click "Generate" or paste a 32-character random string)* |
   | `COOKIE_SECRET` | *(Click "Generate" or paste a 32-character random string)* |
   | `OTP_SECRET` | *(Click "Generate" or paste a 32-character random string)* |
   | `INITIAL_ADMIN_NAME` | `Campus Chief Admin` |
   | `INITIAL_ADMIN_EMAIL` | `admin@iitp.ac.in` |
   | `INITIAL_ADMIN_PASSWORD` | `CampusAdmin2026!` |
   | `RESEND_API_KEY` | `your_resend_api_key` |
   | `EMAIL_FROM` | `HostelEase <onboarding@resend.dev>` |
   | `CLIENT_ORIGIN` | `https://hostelease.vercel.app` *(update with your real Vercel URL in Step 3)* |
6. Click **Create Web Service**.
7. Once deployed, copy your backend URL (e.g. `https://hostelease-api.onrender.com`).

---

## Step 3: Deploy Frontend to Vercel (2 Minutes)

1. Sign in to [Vercel.com](https://vercel.com).
2. Click **Add New...** → **Project** → select your GitHub repository.
3. In **Build and Output Settings**:
   - **Framework Preset:** `Vite`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. In **Environment Variables**, add:
   | Name | Value |
   |---|---|
   | `VITE_API_URL` | `https://hostelease-api.onrender.com` *(your Render URL from Step 2)* |
5. Click **Deploy**.
6. Vercel will provide your live URL (e.g. `https://hostelease.vercel.app`).

---

## Step 4: Link Frontend & Backend CORS

1. Go back to your **Render** dashboard → **Environment**.
2. Update `CLIENT_ORIGIN` to match your exact Vercel URL:
   ```env
   CLIENT_ORIGIN=https://hostelease.vercel.app
   ```
3. Click **Save Changes** (Render will automatically redeploy with the updated CORS origin).

---

## Step 5: Verification Checklist

Once both services are deployed:

1. **Health Check:** Open `https://hostelease-api.onrender.com/api/auth/csrf-token` in your browser. It should return `{"success": true, "data": {"csrfToken": "..."}}`.
2. **Staff Login:** Navigate to `https://hostelease.vercel.app/staff-login`, click **Hostel Admin**, and authenticate. You should see all 4 hostels and configured blocks.
3. **Student Demo Login:** Navigate to `https://hostelease.vercel.app/login`, click **Auto-fill Demo Student Credentials**, and sign in. You should see all 5 seeded tickets and metric counters.
4. **Student OTP Registration:** Try registering with your email address to receive an OTP via Resend.

