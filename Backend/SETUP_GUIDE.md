# SkillKart Backend - Complete Setup Guide

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Database Configuration](#database-configuration)
4. [Supabase Setup](#supabase-setup)
5. [Cloudinary Setup](#cloudinary-setup)
6. [Running the Application](#running-the-application)
7. [Testing API Endpoints](#testing-api-endpoints)
8. [Deployment](#deployment)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software
- **Node.js** v18.0.0 or higher ([Download](https://nodejs.org/))
- **MongoDB** ([Local Installation](https://www.mongodb.com/try/download/community) or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))
- **Git** ([Download](https://git-scm.com/))

### Required Accounts
- **Supabase Account** ([Sign up](https://supabase.com/))
- **Cloudinary Account** ([Sign up](https://cloudinary.com/))

---

## Initial Setup

### 1. Install Dependencies

```bash
cd skillkart-backend
npm install
```

### 2. Environment Configuration

Copy the example environment file:
```bash
cp .env.example .env
```

---

## Database Configuration

### Option A: MongoDB Atlas (Cloud - Recommended for Production)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster (Free tier available)
3. Click "Connect" → "Connect your application"
4. Copy the connection string
5. Update `.env`:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/skillkart?retryWrites=true&w=majority
```

### Option B: Local MongoDB

1. Install MongoDB locally
2. Start MongoDB:
```bash
# macOS
brew services start mongodb-community

# Windows
net start MongoDB

# Linux
sudo systemctl start mongod
```
3. Update `.env`:
```env
MONGODB_URI=mongodb://localhost:27017/skillkart
```

---

## Supabase Setup

### 1. Create Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Click "New Project"
3. Fill in project details
4. Wait for setup to complete

### 2. Get API Credentials

1. Go to **Settings** → **API**
2. Copy:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **Service Role Key** (under "service_role" - NOT anon key)

### 3. Configure Authentication

1. Go to **Authentication** → **Providers**
2. Enable **Email** provider
3. Enable **Google** provider (optional):
   - Get Google OAuth credentials from [Google Cloud Console](https://console.cloud.google.com/)
   - Add Client ID and Client Secret

### 4. Update `.env`

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...your-service-role-key
```

⚠️ **IMPORTANT**: Use the `service_role` key, NOT the `anon` key!

---

## Cloudinary Setup

### 1. Create Cloudinary Account

1. Go to [Cloudinary](https://cloudinary.com/)
2. Sign up for free account
3. Go to Dashboard

### 2. Get Credentials

From your Cloudinary Dashboard, copy:
- **Cloud Name**
- **API Key**
- **API Secret**

### 3. Update `.env`

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz123456
```

---

## Running the Application

### Development Mode

```bash
npm run dev
```

The server will start on `http://localhost:5000`

### Production Mode

```bash
npm start
```

### Verify Server is Running

Open browser or use curl:
```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2024-02-03T10:30:00.000Z"
}
```

---

## Testing API Endpoints

### Using Postman

1. Download [Postman](https://www.postman.com/downloads/)
2. Create a new collection "SkillKart API"
3. Set base URL: `http://localhost:5000`

### Example Requests

#### 1. Sync User (After Supabase Authentication)

```http
POST http://localhost:5000/api/auth/sync
Content-Type: application/json

{
  "supabaseId": "uuid-from-supabase",
  "email": "test@example.com",
  "authProvider": "email"
}
```

#### 2. Select Role

```http
POST http://localhost:5000/api/auth/role
Authorization: Bearer YOUR_SUPABASE_JWT_TOKEN
Content-Type: application/json

{
  "role": "freelancer"
}
```

#### 3. Create Profile

```http
POST http://localhost:5000/api/profile/freelancer
Authorization: Bearer YOUR_SUPABASE_JWT_TOKEN
Content-Type: application/json

{
  "fullName": "John Doe",
  "title": "Full Stack Developer",
  "hourlyRate": 50,
  "skills": [
    {"name": "JavaScript", "level": "expert"},
    {"name": "React", "level": "expert"}
  ]
}
```

---

## Complete .env File Example

```env
# Server
NODE_ENV=development
PORT=5000

# MongoDB
MONGODB_URI=mongodb://localhost:27017/skillkart

# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz123456

# CORS
CORS_ORIGIN=http://localhost:3000

# JWT (Optional)
JWT_SECRET=your_random_secret_key_at_least_32_characters_long
```

---

## Deployment

### Deploying to Railway

1. Install Railway CLI:
```bash
npm install -g @railway/cli
```

2. Login and initialize:
```bash
railway login
railway init
```

3. Add environment variables:
```bash
railway variables set MONGODB_URI="your-mongodb-uri"
railway variables set SUPABASE_URL="your-supabase-url"
# ... add all other variables
```

4. Deploy:
```bash
railway up
```

### Deploying to Render

1. Create `render.yaml`:
```yaml
services:
  - type: web
    name: skillkart-backend
    env: node
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: MONGODB_URI
        sync: false
      - key: SUPABASE_URL
        sync: false
      # Add all env vars
```

2. Push to GitHub
3. Connect Render to your repository
4. Add environment variables in Render dashboard

### Deploying to Heroku

```bash
heroku create skillkart-backend
heroku config:set MONGODB_URI="your-mongodb-uri"
heroku config:set SUPABASE_URL="your-supabase-url"
# ... set all env vars
git push heroku main
```

---

## Troubleshooting

### MongoDB Connection Issues

**Error**: "MongooseServerSelectionError"

**Solution**:
1. Check MongoDB is running:
```bash
# macOS
brew services list

# Linux
sudo systemctl status mongod
```

2. Verify connection string in `.env`
3. For MongoDB Atlas: Check IP whitelist (add `0.0.0.0/0` for testing)

### Supabase Authentication Errors

**Error**: "Invalid or expired token"

**Solution**:
1. Verify you're using `service_role` key, not `anon` key
2. Check token is properly formatted: `Bearer <token>`
3. Ensure Supabase URL is correct

### File Upload Errors

**Error**: "File upload failed"

**Solution**:
1. Verify Cloudinary credentials
2. Check file size (max 10MB)
3. Verify file type is in allowed list

### Port Already in Use

**Error**: "EADDRINUSE: address already in use"

**Solution**:
```bash
# Find process using port 5000
lsof -i :5000

# Kill process
kill -9 <PID>

# Or use different port
PORT=5001 npm run dev
```

---

## Quick Start Checklist

- [ ] Node.js v18+ installed
- [ ] MongoDB running (local or Atlas)
- [ ] Supabase project created
- [ ] Cloudinary account created
- [ ] `.env` file configured with all credentials
- [ ] Dependencies installed (`npm install`)
- [ ] Server running (`npm run dev`)
- [ ] Health check successful (`/health` endpoint)
- [ ] Test auth sync endpoint

---

## Support

For issues or questions:
1. Check this guide first
2. Review error logs in console
3. Check MongoDB connection
4. Verify all environment variables
5. Ensure all services (Supabase, Cloudinary) are active

---

## Next Steps

1. Set up your frontend to integrate with these APIs
2. Test all authentication flows
3. Add rate limiting for production
4. Set up monitoring and logging
5. Configure CI/CD pipeline

**Happy coding! 🚀**
