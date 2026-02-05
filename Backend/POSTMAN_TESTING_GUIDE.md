# SkillKart Backend - Postman Testing Guide

## 🎯 Complete Testing Flow with Supabase

This guide walks you through testing the entire backend using Postman and Supabase.

---

## Part 1: Supabase Setup

### Step 1: Create Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Click "New Project"
3. Fill in:
   - **Name**: skillkart
   - **Database Password**: (save this!)
   - **Region**: Choose closest to you
4. Wait for project setup (2-3 minutes)

### Step 2: Enable Authentication Providers

1. Go to **Authentication** → **Providers**
2. Enable **Email** provider:
   - Toggle "Enable Email provider" to ON
   - Enable "Confirm email" to OFF (for testing)
   - Save

3. Enable **Google** provider (Optional):
   - Get Google OAuth credentials
   - Add Client ID and Secret
   - Save

### Step 3: Get Your Credentials

1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
   - **anon public**: `eyJhbGciOiJI...` (for frontend)
   - **service_role**: `eyJhbGciOiJI...` (for backend)

⚠️ **CRITICAL**: Use `service_role` key in backend, NOT `anon` key!

### Step 4: Update Backend .env File

```env
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJI...your-service-role-key...
```

---

## Part 2: Start Your Backend

### Step 1: Install Dependencies (if not done)
```bash
cd skillkart-backend
npm install
```

### Step 2: Configure .env File
```bash
cp .env.example .env
nano .env  # or use any text editor
```

**Minimum .env configuration:**
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/skillkart
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJI...
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CORS_ORIGIN=http://localhost:3000
```

### Step 3: Start MongoDB
```bash
# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Windows
net start MongoDB

# Or use MongoDB Atlas and skip this step
```

### Step 4: Start Backend Server
```bash
npm run dev
```

You should see:
```
✅ MongoDB Connected: localhost
🚀 Server running on port 5000 in development mode
```

---

## Part 3: Create Test User in Supabase

### Option A: Using Supabase Dashboard (Easiest)

1. Go to **Authentication** → **Users**
2. Click "Add user" → "Create new user"
3. Fill in:
   - **Email**: `testuser@example.com`
   - **Password**: `Test123456!`
   - **Auto Confirm User**: Toggle ON (important for testing)
4. Click "Create user"
5. **Copy the User ID** (looks like: `123e4567-e89b-12d3-a456-426614174000`)

### Option B: Using Supabase API (Programmatic)

**Create user via Supabase API:**

```bash
curl -X POST 'https://YOUR_SUPABASE_URL/auth/v1/signup' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "Test123456!"
  }'
```

**Response will include:**
```json
{
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "testuser@example.com",
    ...
  },
  "session": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    ...
  }
}
```

### Step 5: Get JWT Token

**Method 1: Sign in via API**

```bash
curl -X POST 'https://YOUR_SUPABASE_URL/auth/v1/token?grant_type=password' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "Test123456!"
  }'
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzA3MDYxNjAwLCJpYXQiOjE3MDcwNTgwMDAsImlzcyI6Imh0dHBzOi8veHh4eHh4eHh4eHh4eHguc3VwYWJhc2UuY28vYXV0aC92MSIsInN1YiI6IjEyM2U0NTY3LWU4OWItMTJkMy1hNDU2LTQyNjYxNDE3NDAwMCIsImVtYWlsIjoidGVzdHVzZXJAZXhhbXBsZS5jb20iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6e30sInVzZXJfbWV0YWRhdGEiOnt9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzA3MDU4MDAwfV0sInNlc3Npb25faWQiOiJhYmNkZWYxMi0zNDU2LTc4OTAtYWJjZC1lZjEyMzQ1Njc4OTAifQ.SIGNATURE_HERE",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "...",
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "testuser@example.com"
  }
}
```

**Copy the `access_token`** - this is your JWT!

**Method 2: From Supabase Dashboard**

1. Go to **Authentication** → **Users**
2. Click on your test user
3. Scroll down to find sessions (if user has logged in)
4. Or use Method 1 to generate a fresh token

---

## Part 4: Postman Setup

### Step 1: Install Postman

Download from [Postman.com](https://www.postman.com/downloads/)

### Step 2: Create New Collection

1. Open Postman
2. Click "Collections" → "+" → "Blank Collection"
3. Name it: **SkillKart API**

### Step 3: Set Collection Variables

1. Click on your collection
2. Go to **Variables** tab
3. Add these variables:

| Variable | Initial Value | Current Value |
|----------|---------------|---------------|
| `baseUrl` | `http://localhost:5000` | `http://localhost:5000` |
| `supabaseUrl` | `https://xxxxx.supabase.co` | `https://xxxxx.supabase.co` |
| `anonKey` | `your-anon-key` | `your-anon-key` |
| `token` | `leave-empty` | `leave-empty` |
| `userId` | `leave-empty` | `leave-empty` |
| `jobId` | `leave-empty` | `leave-empty` |

4. Click **Save**

### Step 4: Set Collection Authorization (Optional)

1. Click on collection → **Authorization** tab
2. Type: **Bearer Token**
3. Token: `{{token}}`
4. This will apply to all requests in the collection

---

## Part 5: Complete Testing Workflow

### 🔹 Test 1: Health Check (No Auth Required)

**Request:**
```
GET {{baseUrl}}/health
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2024-02-03T10:30:00.000Z"
}
```

✅ If this works, your backend is running!

---

### 🔹 Test 2: Get Supabase JWT Token

**Create a new request in Postman:**

1. **Method**: POST
2. **URL**: `{{supabaseUrl}}/auth/v1/token?grant_type=password`
3. **Headers**:
   - `apikey`: `{{anonKey}}`
   - `Content-Type`: `application/json`
4. **Body** (raw JSON):
```json
{
  "email": "testuser@example.com",
  "password": "Test123456!"
}
```

5. Click **Send**

**Expected Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "...",
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "testuser@example.com",
    ...
  }
}
```

**Important: Save the Response Data**

Add this to the **Tests** tab of this request:
```javascript
// Save token to collection variable
if (pm.response.code === 200) {
    const jsonData = pm.response.json();
    pm.collectionVariables.set("token", jsonData.access_token);
    pm.collectionVariables.set("supabaseId", jsonData.user.id);
    console.log("✅ Token saved:", jsonData.access_token);
}
```

Now when you send this request, it automatically saves the token!

---

### 🔹 Test 3: Sync User to MongoDB

**Request:**
```
POST {{baseUrl}}/api/auth/sync
```

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "supabaseId": "{{supabaseId}}",
  "email": "testuser@example.com",
  "authProvider": "email"
}
```

**Expected Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "_id": "65abc123def456789012",
    "supabaseId": "123e4567-e89b-12d3-a456-426614174000",
    "email": "testuser@example.com",
    "role": null,
    "authProvider": "email",
    "isProfileComplete": false,
    "isActive": true,
    "lastLogin": "2024-02-03T10:30:00.000Z",
    "createdAt": "2024-02-03T10:30:00.000Z",
    "updatedAt": "2024-02-03T10:30:00.000Z"
  },
  "message": "User synced successfully"
}
```

**Save MongoDB User ID** - Add to Tests tab:
```javascript
if (pm.response.code === 200) {
    const jsonData = pm.response.json();
    pm.collectionVariables.set("userId", jsonData.data._id);
    console.log("✅ User ID saved:", jsonData.data._id);
}
```

---

### 🔹 Test 4: Get Current User

**Request:**
```
GET {{baseUrl}}/api/auth/me
```

**Headers:**
```
Authorization: Bearer {{token}}
```

**Expected Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "_id": "65abc123def456789012",
    "email": "testuser@example.com",
    "role": null,
    "isProfileComplete": false,
    ...
  },
  "message": "User retrieved successfully"
}
```

✅ This confirms authentication is working!

---

### 🔹 Test 5: Select Role (Freelancer)

**Request:**
```
POST {{baseUrl}}/api/auth/role
```

**Headers:**
```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "role": "freelancer"
}
```

**Expected Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "_id": "65abc123def456789012",
    "email": "testuser@example.com",
    "role": "freelancer",
    "isProfileComplete": false,
    ...
  },
  "message": "Role selected successfully"
}
```

---

### 🔹 Test 6: Create Freelancer Profile

**Request:**
```
POST {{baseUrl}}/api/profile/freelancer
```

**Headers:**
```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "fullName": "John Doe",
  "title": "Full Stack Developer",
  "phoneNumber": "+1234567890",
  "location": {
    "country": "United States",
    "city": "San Francisco",
    "timezone": "PST"
  },
  "bio": "Experienced full stack developer with 5+ years of expertise in React, Node.js, and cloud technologies. Passionate about building scalable applications.",
  "hourlyRate": 75,
  "skills": [
    {
      "name": "React",
      "level": "expert"
    },
    {
      "name": "Node.js",
      "level": "expert"
    },
    {
      "name": "MongoDB",
      "level": "intermediate"
    },
    {
      "name": "JavaScript",
      "level": "expert"
    }
  ],
  "experience": [
    {
      "title": "Senior Developer",
      "company": "Tech Corp",
      "startDate": "2020-01-01",
      "current": true,
      "description": "Leading development of microservices architecture"
    }
  ],
  "languages": [
    {
      "language": "English",
      "proficiency": "native"
    },
    {
      "language": "Spanish",
      "proficiency": "conversational"
    }
  ],
  "availability": "full-time"
}
```

**Expected Response:**
```json
{
  "success": true,
  "statusCode": 201,
  "data": {
    "_id": "65abc456def789012345",
    "userId": "65abc123def456789012",
    "fullName": "John Doe",
    "title": "Full Stack Developer",
    "skills": [...],
    "hourlyRate": 75,
    "totalProposals": 0,
    "totalJobsCompleted": 0,
    "rating": 0,
    "isAvailable": true,
    ...
  },
  "message": "Freelancer profile created successfully"
}
```

✅ Profile complete! Now you can submit proposals.

---

### 🔹 Test 7: Get My Profile

**Request:**
```
GET {{baseUrl}}/api/profile/me
```

**Headers:**
```
Authorization: Bearer {{token}}
```

**Expected Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "fullName": "John Doe",
    "title": "Full Stack Developer",
    ...
  },
  "message": "Profile retrieved successfully"
}
```

---

## Part 6: Testing as CLIENT (Create Second User)

### Step 1: Create Client User in Supabase

1. Go to **Authentication** → **Users** in Supabase
2. Click "Add user" → "Create new user"
3. Fill in:
   - **Email**: `client@example.com`
   - **Password**: `Client123456!`
   - **Auto Confirm User**: ON
4. Click "Create user"

### Step 2: Get Client JWT Token

**Create new request in Postman:**

```
POST {{supabaseUrl}}/auth/v1/token?grant_type=password
```

**Headers:**
```
apikey: {{anonKey}}
Content-Type: application/json
```

**Body:**
```json
{
  "email": "client@example.com",
  "password": "Client123456!"
}
```

**In Tests tab:**
```javascript
if (pm.response.code === 200) {
    const jsonData = pm.response.json();
    pm.collectionVariables.set("clientToken", jsonData.access_token);
    pm.collectionVariables.set("clientSupabaseId", jsonData.user.id);
    console.log("✅ Client token saved");
}
```

### Step 3: Sync Client User

**Request:**
```
POST {{baseUrl}}/api/auth/sync
```

**Body:**
```json
{
  "supabaseId": "{{clientSupabaseId}}",
  "email": "client@example.com",
  "authProvider": "email"
}
```

**In Tests tab:**
```javascript
if (pm.response.code === 200) {
    pm.collectionVariables.set("clientUserId", pm.response.json().data._id);
}
```

### Step 4: Select Client Role

**Request:**
```
POST {{baseUrl}}/api/auth/role
```

**Headers:**
```
Authorization: Bearer {{clientToken}}
Content-Type: application/json
```

**Body:**
```json
{
  "role": "client"
}
```

### Step 5: Create Client Profile

**Request:**
```
POST {{baseUrl}}/api/profile/client
```

**Headers:**
```
Authorization: Bearer {{clientToken}}
Content-Type: application/json
```

**Body:**
```json
{
  "companyName": "TechStartup Inc",
  "fullName": "Jane Smith",
  "phoneNumber": "+1234567890",
  "location": {
    "country": "United States",
    "city": "New York",
    "timezone": "EST"
  },
  "bio": "We're a fast-growing tech startup looking for talented developers to join our projects.",
  "website": "https://techstartup.com",
  "companySize": "11-50",
  "industry": "Technology"
}
```

**Expected Response:** 201 Created

---

## Part 7: Testing Job Flow

### 🔹 Test 8: Create Job (as Client)

**Request:**
```
POST {{baseUrl}}/api/jobs
```

**Headers:**
```
Authorization: Bearer {{clientToken}}
Content-Type: application/json
```

**Body:**
```json
{
  "title": "Build a React Dashboard with Real-time Analytics",
  "description": "I need an experienced React developer to build a comprehensive dashboard with real-time analytics. The dashboard should include charts, tables, and data visualization components. Integration with our existing REST API is required. Must have experience with Chart.js or similar libraries. Project timeline is flexible but prefer completion within 2 months.",
  "category": "Web Development",
  "skills": ["React", "JavaScript", "TypeScript", "Chart.js", "REST API"],
  "budget": {
    "type": "fixed",
    "min": 2000,
    "max": 3000,
    "currency": "USD"
  },
  "duration": "1-3-months",
  "experienceLevel": "intermediate",
  "projectType": "one-time",
  "deadline": "2024-04-30T23:59:59.000Z"
}
```

**In Tests tab:**
```javascript
if (pm.response.code === 201) {
    const jsonData = pm.response.json();
    pm.collectionVariables.set("jobId", jsonData.data._id);
    console.log("✅ Job ID saved:", jsonData.data._id);
}
```

**Expected Response:** 201 Created with job object

---

### 🔹 Test 9: Get All Jobs (Public - No Auth)

**Request:**
```
GET {{baseUrl}}/api/jobs?page=1&limit=10&sort=newest
```

**No headers needed** (public endpoint)

**Expected Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "jobs": [
      {
        "_id": "...",
        "title": "Build a React Dashboard with Real-time Analytics",
        "category": "Web Development",
        "skills": ["React", "JavaScript", ...],
        "budget": {...},
        "status": "active",
        "proposals": 0,
        "views": 0
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    }
  },
  "message": "Jobs retrieved successfully"
}
```

---

### 🔹 Test 10: Get Job by ID

**Request:**
```
GET {{baseUrl}}/api/jobs/{{jobId}}
```

**Expected Response:** 200 OK with full job details

---

### 🔹 Test 11: Submit Proposal (as Freelancer)

**Request:**
```
POST {{baseUrl}}/api/proposals
```

**Headers:**
```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body:**
```json
{
  "jobId": "{{jobId}}",
  "coverLetter": "Hello! I'm very excited about this React dashboard project. I have over 5 years of experience building data visualization dashboards using React, Chart.js, and D3.js. I've successfully delivered similar projects for clients in the fintech and healthcare industries. I understand your requirements and can deliver a high-quality, responsive dashboard within your timeline. I'd love to discuss the project details further and show you examples of my previous work. Looking forward to working with you!",
  "proposedBudget": {
    "amount": 2500,
    "type": "fixed",
    "currency": "USD"
  },
  "deliveryTime": {
    "value": 8,
    "unit": "weeks"
  }
}
```

**In Tests tab:**
```javascript
if (pm.response.code === 201) {
    const jsonData = pm.response.json();
    pm.collectionVariables.set("proposalId", jsonData.data._id);
    console.log("✅ Proposal ID saved:", jsonData.data._id);
}
```

**Expected Response:** 201 Created

---

### 🔹 Test 12: Get My Proposals (as Freelancer)

**Request:**
```
GET {{baseUrl}}/api/proposals/my?page=1&limit=10
```

**Headers:**
```
Authorization: Bearer {{token}}
```

**Expected Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "proposals": [
      {
        "_id": "...",
        "jobId": {...},
        "coverLetter": "...",
        "status": "pending",
        "proposedBudget": {...}
      }
    ],
    "pagination": {...}
  },
  "message": "Proposals retrieved successfully"
}
```

---

### 🔹 Test 13: Get Job Proposals (as Client)

**Request:**
```
GET {{baseUrl}}/api/proposals/job/{{jobId}}
```

**Headers:**
```
Authorization: Bearer {{clientToken}}
```

**Expected Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "data": [
    {
      "_id": "...",
      "freelancerId": {
        "email": "testuser@example.com",
        "profile": {
          "fullName": "John Doe",
          "title": "Full Stack Developer",
          "skills": [...],
          "rating": 0
        }
      },
      "coverLetter": "...",
      "proposedBudget": {...},
      "status": "pending"
    }
  ],
  "message": "Proposals retrieved successfully"
}
```

---

### 🔹 Test 14: Accept Proposal (as Client)

**Request:**
```
PATCH {{baseUrl}}/api/proposals/{{proposalId}}/accept
```

**Headers:**
```
Authorization: Bearer {{clientToken}}
```

**Expected Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "_id": "...",
    "status": "accepted",
    "respondedAt": "2024-02-03T15:00:00.000Z",
    ...
  },
  "message": "Proposal accepted successfully"
}
```

---

### 🔹 Test 15: Get My Posted Jobs (as Client)

**Request:**
```
GET {{baseUrl}}/api/jobs/my/posted?page=1&limit=10
```

**Headers:**
```
Authorization: Bearer {{clientToken}}
```

**Expected Response:** List of client's posted jobs

---

## Part 8: Testing File Upload

### 🔹 Test 16: Upload Resume (as Freelancer)

**Request:**
```
POST {{baseUrl}}/api/upload
```

**Headers:**
```
Authorization: Bearer {{token}}
```

**Body:**
- Select **form-data**
- Add fields:
  - `file`: [Select File] - Choose a PDF file
  - `fileType`: `resume` (text)

**Expected Response:**
```json
{
  "success": true,
  "statusCode": 201,
  "data": {
    "_id": "...",
    "userId": "...",
    "fileType": "resume",
    "originalName": "resume.pdf",
    "fileName": "uuid-resume.pdf",
    "url": "https://res.cloudinary.com/...",
    "fileSize": 245678,
    "mimeType": "application/pdf"
  },
  "message": "File uploaded successfully"
}
```

**In Tests tab:**
```javascript
if (pm.response.code === 201) {
    const jsonData = pm.response.json();
    pm.collectionVariables.set("fileId", jsonData.data._id);
    console.log("✅ File uploaded:", jsonData.data.url);
}
```

---

### 🔹 Test 17: Get My Files

**Request:**
```
GET {{baseUrl}}/api/upload/my?fileType=resume
```

**Headers:**
```
Authorization: Bearer {{token}}
```

**Expected Response:** List of uploaded files

---

## Part 9: Advanced Testing Scenarios

### 🔹 Test 18: Filter Jobs by Skills

**Request:**
```
GET {{baseUrl}}/api/jobs?skills=React,JavaScript&experienceLevel=intermediate&page=1&limit=10
```

**Expected Response:** Filtered job list

---

### 🔹 Test 19: Search Jobs

**Request:**
```
GET {{baseUrl}}/api/jobs?search=dashboard&category=Web Development
```

**Expected Response:** Search results

---

### 🔹 Test 20: Update Job (as Client)

**Request:**
```
PUT {{baseUrl}}/api/jobs/{{jobId}}
```

**Headers:**
```
Authorization: Bearer {{clientToken}}
Content-Type: application/json
```

**Body:**
```json
{
  "title": "Build a React Dashboard with Real-time Analytics (Updated)",
  "budget": {
    "type": "fixed",
    "min": 2500,
    "max": 3500,
    "currency": "USD"
  }
}
```

**Expected Response:** 200 OK with updated job

---

### 🔹 Test 21: Withdraw Proposal (as Freelancer)

**First, create another proposal, then:**

**Request:**
```
PATCH {{baseUrl}}/api/proposals/{{proposalId}}/withdraw
```

**Headers:**
```
Authorization: Bearer {{token}}
```

**Expected Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "status": "withdrawn",
    ...
  },
  "message": "Proposal withdrawn successfully"
}
```

---

## Part 10: Error Testing

### 🔹 Test 22: Try Creating Job Without Client Role

**Request:**
```
POST {{baseUrl}}/api/jobs
```

**Headers:**
```
Authorization: Bearer {{token}}  (freelancer token)
Content-Type: application/json
```

**Body:** (any job data)

**Expected Response:**
```json
{
  "success": false,
  "statusCode": 403,
  "message": "Access denied. Required role: client"
}
```

✅ This confirms RBAC is working!

---

### 🔹 Test 23: Try Accessing Protected Route Without Token

**Request:**
```
GET {{baseUrl}}/api/profile/me
```

**No Authorization header**

**Expected Response:**
```json
{
  "success": false,
  "statusCode": 401,
  "message": "No token provided"
}
```

---

### 🔹 Test 24: Invalid Data Validation

**Request:**
```
POST {{baseUrl}}/api/profile/freelancer
```

**Headers:**
```
Authorization: Bearer {{token}}
```

**Body (invalid - missing required fields):**
```json
{
  "fullName": "J"
}
```

**Expected Response:**
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "fullName",
      "message": "Full name must be at least 2 characters"
    },
    {
      "field": "title",
      "message": "Required"
    },
    {
      "field": "skills",
      "message": "At least one skill is required"
    }
  ]
}
```

✅ Validation is working!

---

## 📋 Complete Postman Collection Structure

```
SkillKart API/
├── 📁 Authentication
│   ├── Get Supabase Token (Freelancer)
│   ├── Get Supabase Token (Client)
│   ├── Sync User
│   ├── Select Role
│   └── Get Current User
│
├── 📁 Profile
│   ├── Create Freelancer Profile
│   ├── Create Client Profile
│   ├── Get My Profile
│   ├── Update My Profile
│   └── Get Public Profile
│
├── 📁 Jobs
│   ├── Create Job
│   ├── Get All Jobs
│   ├── Get Job by ID
│   ├── Update Job
│   ├── Delete Job
│   ├── Get My Posted Jobs
│   └── Filter/Search Jobs
│
├── 📁 Proposals
│   ├── Submit Proposal
│   ├── Get My Proposals
│   ├── Get Job Proposals
│   ├── Accept Proposal
│   ├── Reject Proposal
│   └── Withdraw Proposal
│
└── 📁 File Upload
    ├── Upload File
    ├── Get My Files
    └── Delete File
```

---

## 🔄 Complete Testing Workflow

### As Freelancer:
1. ✅ Create Supabase user
2. ✅ Get JWT token
3. ✅ Sync to MongoDB
4. ✅ Select freelancer role
5. ✅ Create profile
6. ✅ Upload resume
7. ✅ Browse jobs
8. ✅ Submit proposal
9. ✅ Track proposal status

### As Client:
1. ✅ Create Supabase user
2. ✅ Get JWT token
3. ✅ Sync to MongoDB
4. ✅ Select client role
5. ✅ Create profile
6. ✅ Post job
7. ✅ Review proposals
8. ✅ Accept proposal
9. ✅ Manage jobs

---

## 🎯 Quick Reference: Collection Variables

After completing all tests, your variables should look like:

| Variable | Example Value |
|----------|--------------|
| `baseUrl` | `http://localhost:5000` |
| `supabaseUrl` | `https://xxxxx.supabase.co` |
| `anonKey` | `eyJhbGci...` |
| `token` | `eyJhbGci...` (freelancer) |
| `supabaseId` | `123e4567...` |
| `userId` | `65abc123...` |
| `clientToken` | `eyJhbGci...` (client) |
| `clientSupabaseId` | `987e6543...` |
| `clientUserId` | `65def456...` |
| `jobId` | `65xyz789...` |
| `proposalId` | `65abc012...` |
| `fileId` | `65file34...` |

---

## 🐛 Common Issues & Solutions

### Issue 1: "User not found in database"
**Solution:** Make sure you called `/api/auth/sync` first!

### Issue 2: "Invalid or expired token"
**Solutions:**
1. Generate fresh token (tokens expire in 1 hour)
2. Verify you're using correct Supabase URL
3. Check backend is using service_role key

### Issue 3: "Access denied. Required role: client"
**Solution:** You're using freelancer token for client-only endpoint. Switch to `{{clientToken}}`

### Issue 4: "Profile already exists"
**Solution:** You already created a profile. Use UPDATE endpoint instead.

### Issue 5: "Validation failed"
**Solution:** Check request body matches the schema exactly. Common issues:
- Missing required fields
- Wrong data types (string vs number)
- Values outside allowed range

### Issue 6: "Job not found or unauthorized"
**Solution:** 
1. Check jobId is correct
2. Ensure you're the owner (for update/delete)
3. Use correct token

---

## 📥 Import Postman Collection

Want to skip manual setup? Import this collection:

### Collection JSON (save as `SkillKart-API.postman_collection.json`)

```json
{
  "info": {
    "name": "SkillKart API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:5000"
    },
    {
      "key": "supabaseUrl",
      "value": "https://your-project.supabase.co"
    },
    {
      "key": "anonKey",
      "value": "your-anon-key"
    },
    {
      "key": "token",
      "value": ""
    },
    {
      "key": "clientToken",
      "value": ""
    }
  ]
}
```

**To import:**
1. Postman → Import → Upload file
2. Update collection variables with your values
3. Start testing!

---

## 🎓 Pro Tips

### Tip 1: Use Environment Variables
Create separate environments for:
- **Local Development** (`http://localhost:5000`)
- **Staging** (`https://staging.yourdomain.com`)
- **Production** (`https://api.yourdomain.com`)

### Tip 2: Organize Requests in Folders
Group related requests for better organization

### Tip 3: Use Pre-request Scripts
Auto-refresh tokens before requests:
```javascript
// Check if token is expired, refresh if needed
const tokenExpiry = pm.collectionVariables.get("tokenExpiry");
if (Date.now() > tokenExpiry) {
    // Refresh token logic here
}
```

### Tip 4: Save Common Test Scripts
Create snippets for common operations

### Tip 5: Use Collection Runner
Test entire flow automatically:
1. Collection → Run
2. Select all requests
3. Click "Run SkillKart API"

---

## 📊 Expected Test Results

After running all tests, you should have:

- ✅ 2 users created (1 freelancer, 1 client)
- ✅ 2 profiles created
- ✅ 1 job posted
- ✅ 1 proposal submitted
- ✅ 1 file uploaded
- ✅ All API endpoints tested
- ✅ Authentication working
- ✅ RBAC working
- ✅ Validation working

---

## 🚀 Next Steps After Testing

1. **Frontend Integration**: Connect your React frontend
2. **Production Database**: Switch to MongoDB Atlas
3. **Deploy Backend**: Use Railway, Render, or Heroku
4. **Production Supabase**: Configure for production
5. **Add Monitoring**: Set up error tracking
6. **Enable Rate Limiting**: Protect your API
7. **Add Tests**: Write automated tests

---

## 📞 Need Help?

### Token Issues?
- Tokens expire in 1 hour
- Generate fresh tokens when needed
- Check Supabase dashboard for user sessions

### Database Issues?
- Verify MongoDB is running: `brew services list` or `sudo systemctl status mongod`
- Check connection string in .env
- Look at backend console for errors

### API Errors?
- Check backend console logs
- Verify request headers
- Ensure JSON syntax is valid
- Check collection variables are set

---

## ✅ Testing Checklist

- [ ] Health check endpoint works
- [ ] Can get Supabase JWT token
- [ ] User sync creates MongoDB record
- [ ] Role selection works
- [ ] Profile creation works for both roles
- [ ] Job creation works (client)
- [ ] Job listing and filtering works
- [ ] Proposal submission works (freelancer)
- [ ] Proposal viewing works (client)
- [ ] Proposal acceptance works
- [ ] File upload works
- [ ] RBAC blocks unauthorized access
- [ ] Validation catches invalid data
- [ ] Error responses are consistent

---

**Happy Testing! 🧪**

You now have everything you need to fully test the SkillKart backend with Postman and Supabase.
