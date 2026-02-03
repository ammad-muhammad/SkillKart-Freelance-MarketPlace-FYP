# SkillKart API Documentation

Base URL: `http://localhost:5000` (Development)

## Authentication

All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <supabase_jwt_token>
```

---

## 🔐 Authentication Endpoints

### 1. Sync User
Syncs Supabase user to MongoDB database.

**Endpoint:** `POST /api/auth/sync`

**Access:** Public

**Request Body:**
```json
{
  "supabaseId": "string (required)",
  "email": "string (required, email format)",
  "authProvider": "email | google (required)"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "_id": "65abc123def456789012",
    "supabaseId": "123e4567-e89b-12d3-a456-426614174000",
    "email": "john@example.com",
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

---

### 2. Select Role
Set user role (client or freelancer). Can only be set once.

**Endpoint:** `POST /api/auth/role`

**Access:** Protected (Authenticated users)

**Request Body:**
```json
{
  "role": "client | freelancer (required)"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "_id": "65abc123def456789012",
    "email": "john@example.com",
    "role": "freelancer",
    "isProfileComplete": false
  },
  "message": "Role selected successfully"
}
```

---

### 3. Get Current User
Get authenticated user details.

**Endpoint:** `GET /api/auth/me`

**Access:** Protected

**Response:** `200 OK`
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "_id": "65abc123def456789012",
    "email": "john@example.com",
    "role": "freelancer",
    "isProfileComplete": true,
    "profile": { /* profile data */ }
  },
  "message": "User retrieved successfully"
}
```

---

## 👤 Profile Endpoints

### 4. Create Client Profile
Create profile for client user.

**Endpoint:** `POST /api/profile/client`

**Access:** Protected (Client role required)

**Request Body:**
```json
{
  "companyName": "string (required, min 2 chars)",
  "fullName": "string (required, min 2 chars)",
  "phoneNumber": "string (optional)",
  "location": {
    "country": "string (optional)",
    "city": "string (optional)",
    "timezone": "string (optional)"
  },
  "bio": "string (optional, max 1000 chars)",
  "website": "string (optional, valid URL)",
  "companySize": "1-10 | 11-50 | 51-200 | 201-500 | 500+ (optional)",
  "industry": "string (optional)"
}
```

**Response:** `201 Created`

---

### 5. Create Freelancer Profile
Create profile for freelancer user.

**Endpoint:** `POST /api/profile/freelancer`

**Access:** Protected (Freelancer role required)

**Request Body:**
```json
{
  "fullName": "string (required, min 2 chars)",
  "title": "string (required, min 2 chars)",
  "phoneNumber": "string (optional)",
  "location": {
    "country": "string (optional)",
    "city": "string (optional)",
    "timezone": "string (optional)"
  },
  "bio": "string (optional, max 2000 chars)",
  "hourlyRate": "number (optional, min 0)",
  "skills": [
    {
      "name": "string (required)",
      "level": "beginner | intermediate | expert"
    }
  ],
  "availability": "full-time | part-time | contract | hourly (optional)"
}
```

**Response:** `201 Created`

---

### 6. Get Own Profile
Get authenticated user's profile.

**Endpoint:** `GET /api/profile/me`

**Access:** Protected

**Response:** `200 OK`

---

### 7. Update Own Profile
Update authenticated user's profile.

**Endpoint:** `PUT /api/profile/me`

**Access:** Protected

**Request Body:** Same as create profile (all fields optional)

**Response:** `200 OK`

---

### 8. Get Public Profile
Get public profile by user ID.

**Endpoint:** `GET /api/profile/:userId`

**Access:** Protected

**Response:** `200 OK`

---

## 💼 Job Endpoints

### 9. Create Job
Create new job posting (clients only).

**Endpoint:** `POST /api/jobs`

**Access:** Protected (Client role + Complete profile required)

**Request Body:**
```json
{
  "title": "string (required, 10-200 chars)",
  "description": "string (required, 50-5000 chars)",
  "category": "string (required, min 2 chars)",
  "skills": ["string (required, 1-15 items)"],
  "budget": {
    "type": "fixed | hourly (required)",
    "min": "number (optional, min 0)",
    "max": "number (optional, min 0)",
    "currency": "string (default: USD)"
  },
  "duration": "less-than-week | 1-4-weeks | 1-3-months | 3-6-months | 6-months-plus (optional)",
  "experienceLevel": "entry | intermediate | expert (required)",
  "projectType": "one-time | ongoing (default: one-time)",
  "deadline": "ISO 8601 datetime (optional)"
}
```

**Response:** `201 Created`

---

### 10. Get All Jobs
Get all active jobs with filters.

**Endpoint:** `GET /api/jobs`

**Access:** Public

**Query Parameters:**
- `page`: number (default: 1)
- `limit`: number (default: 10, max: 100)
- `category`: string (optional)
- `skills`: comma-separated string (optional)
- `budgetType`: "fixed" | "hourly" (optional)
- `minBudget`: number (optional)
- `maxBudget`: number (optional)
- `experienceLevel`: "entry" | "intermediate" | "expert" (optional)
- `search`: string (optional, full-text search)
- `sort`: "newest" | "oldest" | "budget-high" | "budget-low" (default: newest)

**Example:**
```
GET /api/jobs?page=1&limit=10&category=Web%20Development&sort=newest
```

**Response:** `200 OK`
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "jobs": [ /* array of jobs */ ],
    "pagination": {
      "total": 45,
      "page": 1,
      "limit": 10,
      "totalPages": 5
    }
  },
  "message": "Jobs retrieved successfully"
}
```

---

### 11. Get Job by ID
Get single job details.

**Endpoint:** `GET /api/jobs/:id`

**Access:** Public

**Response:** `200 OK`

---

### 12. Update Job
Update job posting (clients only, own jobs).

**Endpoint:** `PUT /api/jobs/:id`

**Access:** Protected (Client role + Complete profile)

**Request Body:** Same as create job (all fields optional)

**Response:** `200 OK`

---

### 13. Cancel Job
Cancel job posting (clients only, own jobs).

**Endpoint:** `DELETE /api/jobs/:id`

**Access:** Protected (Client role + Complete profile)

**Response:** `200 OK`

---

### 14. Get My Posted Jobs
Get all jobs posted by authenticated client.

**Endpoint:** `GET /api/jobs/my/posted`

**Access:** Protected (Client role + Complete profile)

**Query Parameters:**
- `page`: number (default: 1)
- `limit`: number (default: 10)
- `status`: string (optional)

**Response:** `200 OK`

---

## 📝 Proposal Endpoints

### 15. Submit Proposal
Submit proposal for a job (freelancers only).

**Endpoint:** `POST /api/proposals`

**Access:** Protected (Freelancer role + Complete profile)

**Request Body:**
```json
{
  "jobId": "string (required)",
  "coverLetter": "string (required, 100-3000 chars)",
  "proposedBudget": {
    "amount": "number (required, min 0)",
    "type": "fixed | hourly (required)",
    "currency": "string (default: USD)"
  },
  "deliveryTime": {
    "value": "number (required, min 1)",
    "unit": "days | weeks | months (required)"
  }
}
```

**Response:** `201 Created`

---

### 16. Get Job Proposals
Get all proposals for a specific job (clients only, own jobs).

**Endpoint:** `GET /api/proposals/job/:jobId`

**Access:** Protected (Client role + Complete profile)

**Response:** `200 OK`

---

### 17. Get My Proposals
Get all proposals submitted by authenticated freelancer.

**Endpoint:** `GET /api/proposals/my`

**Access:** Protected (Freelancer role + Complete profile)

**Query Parameters:**
- `status`: "pending" | "accepted" | "rejected" | "withdrawn" (optional)
- `page`: number (default: 1)
- `limit`: number (default: 10)

**Response:** `200 OK`

---

### 18. Accept Proposal
Accept a proposal (clients only).

**Endpoint:** `PATCH /api/proposals/:id/accept`

**Access:** Protected (Client role + Complete profile)

**Response:** `200 OK`

---

### 19. Reject Proposal
Reject a proposal (clients only).

**Endpoint:** `PATCH /api/proposals/:id/reject`

**Access:** Protected (Client role + Complete profile)

**Response:** `200 OK`

---

### 20. Withdraw Proposal
Withdraw a proposal (freelancers only, pending proposals).

**Endpoint:** `PATCH /api/proposals/:id/withdraw`

**Access:** Protected (Freelancer role + Complete profile)

**Response:** `200 OK`

---

## 📁 File Upload Endpoints

### 21. Upload File
Upload file to Cloudinary.

**Endpoint:** `POST /api/upload`

**Access:** Protected

**Request:** `multipart/form-data`
- `file`: File (required, max 10MB)
- `fileType`: "resume" | "portfolio" | "job-attachment" | "proposal-attachment" | "avatar" (required)

**Allowed MIME Types:**
- `application/pdf`
- `application/msword`
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- `image/jpeg`
- `image/png`
- `image/jpg`

**Example (curl):**
```bash
curl -X POST http://localhost:5000/api/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/resume.pdf" \
  -F "fileType=resume"
```

**Response:** `201 Created`
```json
{
  "success": true,
  "statusCode": 201,
  "data": {
    "_id": "65abcbbbccc111222333",
    "userId": "65abc123def456789012",
    "fileType": "resume",
    "originalName": "john_doe_resume.pdf",
    "fileName": "uuid-john_doe_resume.pdf",
    "mimeType": "application/pdf",
    "fileSize": 245678,
    "url": "https://res.cloudinary.com/...",
    "cloudinaryPublicId": "skillkart/resume/...",
    "uploadedAt": "2024-02-03T13:00:00.000Z"
  },
  "message": "File uploaded successfully"
}
```

---

### 22. Get My Files
Get all files uploaded by authenticated user.

**Endpoint:** `GET /api/upload/my`

**Access:** Protected

**Query Parameters:**
- `fileType`: "resume" | "portfolio" | "job-attachment" | "proposal-attachment" | "avatar" (optional)

**Response:** `200 OK`

---

### 23. Delete File
Delete uploaded file.

**Endpoint:** `DELETE /api/upload/:id`

**Access:** Protected (Own files only)

**Response:** `200 OK`

---

## ❌ Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Error message here",
  "errors": [ /* optional validation errors */ ]
}
```

### Common Error Codes

- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

### Example Validation Error

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    },
    {
      "field": "skills",
      "message": "At least one skill is required"
    }
  ]
}
```

---

## 🔒 Authentication Flow

1. **User signs up/logs in via Supabase** (frontend handles this)
2. **Frontend receives Supabase JWT token**
3. **Frontend calls `/api/auth/sync`** to create MongoDB user
4. **Frontend calls `/api/auth/role`** to set user role
5. **Frontend calls profile creation endpoint** to complete profile
6. **All subsequent requests** include JWT token in Authorization header

---

## 📊 Rate Limiting

**Note:** Rate limiting is not currently implemented but recommended for production.

Suggested limits:
- Authentication endpoints: 5 requests per minute
- File upload: 10 requests per hour
- General API: 100 requests per minute

---

## 🧪 Testing

Use tools like:
- **Postman** - GUI for API testing
- **curl** - Command-line testing
- **Thunder Client** - VS Code extension

### Example Postman Setup

1. Create environment with:
   - `baseUrl`: `http://localhost:5000`
   - `token`: Your Supabase JWT token

2. Set Authorization header in collection:
   - Type: Bearer Token
   - Token: `{{token}}`

---

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)

---

**Last Updated:** February 2024
