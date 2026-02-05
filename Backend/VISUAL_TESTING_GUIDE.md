# SkillKart Backend - Visual Testing Guide (Step-by-Step)

## 🎯 Complete Testing in 15 Minutes

This guide provides **exact steps** with **what you should see** at each stage.

---

## 🚀 PHASE 1: Setup (5 minutes)

### Step 1.1: Create Supabase Users

#### Create Freelancer User
1. Open [Supabase Dashboard](https://app.supabase.com/)
2. Go to **Authentication** → **Users**
3. Click **"Add user"** → **"Create new user"**
4. Fill in form:
   ```
   Email: freelancer@example.com
   Password: Test123456!
   Auto Confirm User: ✅ ON (IMPORTANT!)
   ```
5. Click **"Create user"**
6. ✅ User appears in list
7. **COPY THE USER ID** (click on user to see it)
   - Format: `123e4567-e89b-12d3-a456-426614174000`
   - Save this as `FREELANCER_SUPABASE_ID`

#### Create Client User
1. Click **"Add user"** again
2. Fill in form:
   ```
   Email: client@example.com
   Password: Client123456!
   Auto Confirm User: ✅ ON
   ```
3. Click **"Create user"**
4. **COPY THE USER ID**
   - Save this as `CLIENT_SUPABASE_ID`

**✅ You should now have:**
- ✅ 2 users in Supabase dashboard
- ✅ 2 user IDs copied

---

### Step 1.2: Get Supabase Credentials

1. In Supabase, go to **Settings** → **API**
2. Copy these values:

```
Project URL: https://xxxxxxxxxxxxx.supabase.co
anon public: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

3. Save these somewhere safe (Notepad/TextEdit)

---

### Step 1.3: Configure Backend

1. Open your terminal
2. Navigate to project:
   ```bash
   cd skillkart-backend
   ```

3. Copy environment file:
   ```bash
   cp .env.example .env
   ```

4. Edit `.env` file:
   ```bash
   nano .env  # or use VS Code, TextEdit, etc.
   ```

5. Update these values:
   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/skillkart
   SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co  ← YOUR PROJECT URL
   SUPABASE_SERVICE_KEY=eyJhbGci...  ← YOUR SERVICE_ROLE KEY
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   CORS_ORIGIN=http://localhost:3000
   ```

6. Save and close file

---

### Step 1.4: Start Services

#### Start MongoDB
```bash
# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Windows
net start MongoDB
```

**✅ Check it's running:**
```bash
# macOS
brew services list | grep mongodb

# Linux
sudo systemctl status mongod
```

You should see: **"started"** or **"active (running)"**

#### Start Backend
```bash
# Install dependencies (first time only)
npm install

# Start server
npm run dev
```

**✅ You should see:**
```
✅ MongoDB Connected: localhost
🚀 Server running on port 5000 in development mode
```

**⚠️ If errors occur:**
- MongoDB not running? Start it first
- Port 5000 in use? Change PORT in .env
- Missing packages? Run `npm install` again

---

## 🧪 PHASE 2: Postman Testing (10 minutes)

### Step 2.1: Import Postman Collection

1. Open Postman
2. Click **"Import"** (top left)
3. Click **"Upload Files"**
4. Select `SkillKart-API.postman_collection.json`
5. Click **"Import"**

**✅ You should see:**
- New collection: "SkillKart API - Complete Collection"
- Folders: Authentication, Profile, Jobs, Proposals, File Upload
- 24 pre-configured requests

---

### Step 2.2: Configure Collection Variables

1. Click on **"SkillKart API - Complete Collection"**
2. Go to **"Variables"** tab
3. Update **"Current value"** column:

| Variable | Current Value |
|----------|---------------|
| `baseUrl` | `http://localhost:5000` |
| `supabaseUrl` | `https://xxxxx.supabase.co` ← YOUR URL |
| `anonKey` | `eyJhbGci...` ← YOUR ANON KEY |

4. Click **"Save"** (Ctrl+S or Cmd+S)

**✅ Variables are now set!**

---

### Step 2.3: Test Flow - Start Here!

**📍 IMPORTANT: Run requests in this exact order!**

---

#### ✅ REQUEST 1: Health Check

1. Click **"0. Health Check"**
2. Click **"Send"**

**Expected Result:**
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2024-02-03T..."
}
```

**Status:** `200 OK`

🎉 **Backend is working!**

---

#### ✅ REQUEST 2: Get Freelancer Token

1. Click **"1. Get Supabase Token (Freelancer)"**
2. Verify body has:
   ```json
   {
     "email": "freelancer@example.com",
     "password": "Test123456!"
   }
   ```
3. Click **"Send"**

**Expected Result:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "freelancer@example.com"
  }
}
```

**Status:** `200 OK`

**Check Console (bottom of Postman):**
```
✅ Freelancer token saved
```

🎉 **Token automatically saved to collection variables!**

---

#### ✅ REQUEST 3: Sync Freelancer User

1. Click **"3. Sync Freelancer User"**
2. Click **"Send"**

**Expected Result:**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "_id": "65abc123...",
    "supabaseId": "123e4567...",
    "email": "freelancer@example.com",
    "role": null,
    "authProvider": "email",
    "isProfileComplete": false
  },
  "message": "User synced successfully"
}
```

**Status:** `200 OK`

**Check Console:**
```
✅ Freelancer user ID saved
```

🎉 **User created in MongoDB!**

---

#### ✅ REQUEST 4: Get Current User

1. Click **"7. Get Current User"**
2. Click **"Send"**

**Expected Result:**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "email": "freelancer@example.com",
    "role": null,
    "isProfileComplete": false
  }
}
```

**Status:** `200 OK`

🎉 **Authentication working!**

---

#### ✅ REQUEST 5: Select Freelancer Role

1. Click **"5. Select Role (Freelancer)"**
2. Click **"Send"**

**Expected Result:**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "email": "freelancer@example.com",
    "role": "freelancer",  ← NOW SET!
    "isProfileComplete": false
  },
  "message": "Role selected successfully"
}
```

**Status:** `200 OK`

🎉 **Role assigned!**

---

#### ✅ REQUEST 6: Create Freelancer Profile

1. Click **"8. Create Freelancer Profile"**
2. Review the body (pre-filled with sample data)
3. Click **"Send"**

**Expected Result:**
```json
{
  "success": true,
  "statusCode": 201,
  "data": {
    "fullName": "John Doe",
    "title": "Full Stack Developer",
    "skills": [
      {"name": "React", "level": "expert"},
      ...
    ],
    "hourlyRate": 75,
    "totalProposals": 0,
    "isAvailable": true
  },
  "message": "Freelancer profile created successfully"
}
```

**Status:** `201 Created`

🎉 **Freelancer profile complete!**

---

#### ✅ REQUEST 7: Get My Profile

1. Click **"10. Get My Profile"**
2. Click **"Send"**

**Expected Result:** Your complete freelancer profile

**Status:** `200 OK`

---

### 🔄 Now Repeat for Client User

#### ✅ REQUEST 8: Get Client Token

1. Click **"2. Get Supabase Token (Client)"**
2. Verify body has `client@example.com`
3. Click **"Send"**

**Check Console:**
```
✅ Client token saved
```

---

#### ✅ REQUEST 9: Sync Client User

1. Click **"4. Sync Client User"**
2. Click **"Send"**

**Status:** `200 OK`

---

#### ✅ REQUEST 10: Select Client Role

1. Click **"6. Select Role (Client)"**
2. Click **"Send"**

**Expected:** `role: "client"` in response

---

#### ✅ REQUEST 11: Create Client Profile

1. Click **"9. Create Client Profile"**
2. Click **"Send"**

**Status:** `201 Created`

🎉 **Client profile complete!**

---

### 💼 Job Testing Flow

#### ✅ REQUEST 12: Create Job (as Client)

1. Click **"11. Create Job (Client)"**
2. **IMPORTANT:** Make sure it uses `{{clientToken}}`
3. Click **"Send"**

**Expected Result:**
```json
{
  "success": true,
  "statusCode": 201,
  "data": {
    "_id": "65xyz789...",
    "title": "Build a React Dashboard with Real-time Analytics",
    "status": "active",
    "proposals": 0,
    "views": 0
  }
}
```

**Check Console:**
```
✅ Job ID saved: 65xyz789...
```

🎉 **Job posted!**

---

#### ✅ REQUEST 13: Get All Jobs (Public)

1. Click **"12. Get All Jobs (Public)"**
2. No auth needed
3. Click **"Send"**

**Expected Result:**
```json
{
  "success": true,
  "data": {
    "jobs": [
      {
        "title": "Build a React Dashboard...",
        "status": "active"
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1
    }
  }
}
```

🎉 **Job is publicly visible!**

---

#### ✅ REQUEST 14: Submit Proposal (as Freelancer)

1. Click **"18. Submit Proposal (Freelancer)"**
2. **IMPORTANT:** Uses `{{token}}` (freelancer)
3. Click **"Send"**

**Expected Result:**
```json
{
  "success": true,
  "statusCode": 201,
  "data": {
    "jobId": "65xyz789...",
    "freelancerId": "65abc123...",
    "status": "pending",
    "coverLetter": "..."
  },
  "message": "Proposal submitted successfully"
}
```

**Check Console:**
```
✅ Proposal ID saved
```

🎉 **Proposal submitted!**

---

#### ✅ REQUEST 15: View Proposals (as Client)

1. Click **"20. Get Job Proposals (Client)"**
2. **IMPORTANT:** Uses `{{clientToken}}`
3. Click **"Send"**

**Expected Result:**
```json
{
  "success": true,
  "data": [
    {
      "freelancerId": {
        "email": "freelancer@example.com",
        "profile": {
          "fullName": "John Doe",
          "title": "Full Stack Developer",
          "skills": [...]
        }
      },
      "coverLetter": "...",
      "status": "pending"
    }
  ]
}
```

🎉 **Client can see freelancer's proposal!**

---

#### ✅ REQUEST 16: Accept Proposal (as Client)

1. Click **"21. Accept Proposal (Client)"**
2. Click **"Send"**

**Expected Result:**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "status": "accepted",  ← CHANGED!
    "respondedAt": "2024-02-03T..."
  },
  "message": "Proposal accepted successfully"
}
```

🎉 **Proposal accepted! Job status changed to "in-progress"**

---

## 🎯 What You've Accomplished

After completing all steps, you have:

✅ **Created 2 users** in Supabase (freelancer + client)  
✅ **Synced users** to MongoDB  
✅ **Set roles** for both users  
✅ **Created profiles** for both  
✅ **Posted a job** (as client)  
✅ **Submitted a proposal** (as freelancer)  
✅ **Accepted the proposal** (as client)  
✅ **Tested authentication**, authorization, and RBAC  
✅ **Verified all security features** are working  

---

## 🔍 Verification Checklist

### Check MongoDB (Optional)

If you want to verify data in MongoDB:

```bash
# Open MongoDB shell
mongosh

# Switch to skillkart database
use skillkart

# View users
db.users.find().pretty()

# View jobs
db.jobs.find().pretty()

# View proposals
db.proposals.find().pretty()
```

**You should see:**
- 2 users (1 freelancer, 1 client)
- 1 job (status: "in-progress" after accepting proposal)
- 1 proposal (status: "accepted")

---

## 🧪 Testing Scenarios Matrix

| Test | Actor | Endpoint | Expected Status | What It Tests |
|------|-------|----------|----------------|---------------|
| Health Check | Anyone | GET /health | 200 | Server running |
| Get Token | Anyone | POST /auth/v1/token | 200 | Supabase auth |
| Sync User | Anyone | POST /api/auth/sync | 200 | User creation |
| Select Role | Authenticated | POST /api/auth/role | 200 | Role assignment |
| Create Profile | Authenticated | POST /api/profile/* | 201 | Profile creation |
| Create Job | Client | POST /api/jobs | 201 | RBAC + Job creation |
| Submit Proposal | Freelancer | POST /api/proposals | 201 | RBAC + Proposal |
| Get Proposals | Client | GET /api/proposals/job/:id | 200 | Authorization |
| Accept Proposal | Client | PATCH /api/proposals/:id/accept | 200 | Workflow |

---

## 🎬 Quick Start Commands

### Terminal 1: Backend Server
```bash
cd skillkart-backend
npm run dev
```

### Terminal 2: MongoDB Check
```bash
mongosh
use skillkart
db.users.find()
```

### Terminal 3: Testing (curl examples)
```bash
# Health check
curl http://localhost:5000/health

# Create user (after getting Supabase token)
curl -X POST http://localhost:5000/api/auth/sync \
  -H "Content-Type: application/json" \
  -d '{"supabaseId":"YOUR_ID","email":"test@example.com","authProvider":"email"}'
```

---

## 📊 Expected Response Times

| Endpoint Type | Expected Response Time |
|---------------|----------------------|
| Health Check | < 10ms |
| Auth Sync | < 100ms |
| Profile Creation | < 200ms |
| Job Creation | < 200ms |
| Job List (10 items) | < 300ms |
| Proposal Submit | < 250ms |

**If slower:** Check MongoDB connection and indexes

---

## 🔥 Pro Testing Tips

### Tip 1: Use Collection Runner
1. Click on collection
2. Click **"Run"**
3. Select all requests
4. Click **"Run SkillKart API"**
5. Watch all tests execute automatically!

### Tip 2: View Saved Variables
1. Click collection
2. Variables tab
3. See all auto-saved IDs and tokens

### Tip 3: Check Console Output
- Bottom panel in Postman
- Shows all `console.log()` from test scripts
- Great for debugging

### Tip 4: Duplicate Requests
- Right-click any request → Duplicate
- Modify for different test scenarios
- Example: "Submit Proposal - Variation 2"

---

## 🎯 Advanced Testing Scenarios

### Scenario 1: Multiple Proposals
1. Create 3 different freelancer users
2. Each submits a proposal
3. Client views all proposals
4. Client accepts one
5. Verify others are auto-rejected

### Scenario 2: Job Filters
1. Create 5 different jobs with different:
   - Categories
   - Skills
   - Budget ranges
2. Test filtering by each parameter
3. Verify pagination works

### Scenario 3: File Upload
1. Upload resume (PDF)
2. Upload portfolio image (JPG)
3. Try invalid file type (should fail)
4. Try oversized file > 10MB (should fail)
5. Delete uploaded file

### Scenario 4: Error Handling
1. Try creating job as freelancer (should fail - 403)
2. Try accessing profile without token (should fail - 401)
3. Try invalid data (should fail - 400 with errors)
4. Try accessing non-existent resource (should fail - 404)

---

## 📝 Testing Notes Template

Use this to track your testing:

```
Date: __________
Tester: __________

✅ AUTHENTICATION
[ ] Health check works
[ ] Freelancer token obtained
[ ] Client token obtained
[ ] User sync successful
[ ] Roles assigned correctly

✅ PROFILES
[ ] Freelancer profile created
[ ] Client profile created
[ ] Profile retrieval works
[ ] Profile update works

✅ JOBS
[ ] Job creation works (client)
[ ] Job listing works (public)
[ ] Job filtering works
[ ] Job search works
[ ] Job update works (client)

✅ PROPOSALS
[ ] Proposal submit works (freelancer)
[ ] Proposal view works (client)
[ ] Proposal accept works (client)
[ ] Job status updates correctly

✅ FILES
[ ] File upload works
[ ] File retrieval works
[ ] File deletion works

✅ SECURITY
[ ] RBAC blocks unauthorized access
[ ] Token validation works
[ ] Input validation catches errors

NOTES:
_________________________________
_________________________________
```

---

## 🚨 Troubleshooting Quick Reference

### Error: "ECONNREFUSED"
→ Backend not running. Start with `npm run dev`

### Error: "MongooseServerSelectionError"
→ MongoDB not running. Start MongoDB service

### Error: "Invalid or expired token"
→ Token expired (1 hour limit). Get new token (Request #1 or #2)

### Error: "User not found in database"
→ Run sync endpoint first (Request #3 or #4)

### Error: "Access denied. Required role: client"
→ Using wrong token. Switch to `{{clientToken}}`

### Error: "Profile already exists"
→ Profile already created. Use update endpoint instead

### Error: "Validation failed"
→ Check request body format matches schema exactly

---

## ✨ Success Indicators

You know everything is working when:

1. ✅ All requests return expected status codes
2. ✅ Console shows "✅" messages for saved variables
3. ✅ MongoDB has records (check with mongosh)
4. ✅ Tokens work for protected endpoints
5. ✅ RBAC blocks unauthorized access properly
6. ✅ Job workflow completes end-to-end
7. ✅ No server errors in terminal

---

## 🎓 Understanding the Flow

```
USER SIGNUP (Frontend)
    ↓
Supabase Authentication
    ↓
GET JWT TOKEN
    ↓
SYNC USER (Backend creates MongoDB record)
    ↓
SELECT ROLE (client or freelancer)
    ↓
CREATE PROFILE (complete onboarding)
    ↓
USE PLATFORM
    ↓
Client: Post jobs, review proposals, hire
Freelancer: Browse jobs, submit proposals, work
```

---

## 🔄 Token Refresh Guide

Tokens expire after 1 hour. When you get "Invalid token" error:

**Quick Refresh:**
1. Run Request #1 (Get Supabase Token - Freelancer)
2. OR Request #2 (Get Supabase Token - Client)
3. Token auto-saves to collection variables
4. Continue testing!

**Alternative: Manual Refresh**
```bash
curl -X POST 'https://YOUR_SUPABASE_URL/auth/v1/token?grant_type=password' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"freelancer@example.com","password":"Test123456!"}'
```

---

**You're all set! Start testing! 🚀**

Remember: Run requests **in order** for best results, especially for the first test run.
