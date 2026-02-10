# Postman API Testing Guide

Base URL: `http://localhost:5000`

---

## 1. AUTH - Registration (2-Step)

### 1.1 Register Step 1 - Send OTP
```
POST /api/v1/auth/register/step1
Headers: Content-Type: application/json
Body:
{
  "email": "john@example.com"
}
```

### 1.2 Register Step 2 - Complete Registration
```
POST /api/v1/auth/register/step2
Headers: Content-Type: application/json
Body:
{
  "email": "john@example.com",
  "otp": "123456",
  "password": "SecurePass123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "freelancer"
}
```

---

## 2. AUTH - Login

### 2.1 Login Direct (No OTP)
```
POST /api/v1/auth/login
Headers: Content-Type: application/json
Body:
{
  "email": "john@example.com",
  "password": "SecurePass123"
}
Response: { accessToken, refreshToken, user }
```

### 2.2 Login Step 1 - Send OTP
```
POST /api/v1/auth/login/step1
Headers: Content-Type: application/json
Body:
{
  "email": "john@example.com"
}
```

### 2.3 Login Step 2 - Verify OTP
```
POST /api/v1/auth/login/step2
Headers: Content-Type: application/json
Body:
{
  "email": "john@example.com",
  "otp": "123456",
  "password": "SecurePass123"
}
```

### 2.4 SuperAdmin Login
```
POST /api/v1/auth/superadmin/login
Headers: Content-Type: application/json
Body:
{
  "username": "admin",
  "password": "your-superadmin-password"
}
```

### 2.5 Get Current User
```
GET /api/v1/auth/me
Headers: 
  Content-Type: application/json
  Authorization: Bearer YOUR_ACCESS_TOKEN
```

### 2.6 Refresh Token
```
POST /api/v1/auth/refresh
Headers: Content-Type: application/json
Body:
{
  "refreshToken": "YOUR_REFRESH_TOKEN"
}
```

### 2.7 Change Password
```
POST /api/v1/auth/password/change
Headers: 
  Content-Type: application/json
  Authorization: Bearer YOUR_ACCESS_TOKEN
Body:
{
  "currentPassword": "SecurePass123",
  "newPassword": "NewSecurePass456",
  "confirmPassword": "NewSecurePass456"
}
```

### 2.8 Request Password Reset
```
POST /api/v1/auth/password/reset/request
Headers: Content-Type: application/json
Body:
{
  "email": "john@example.com"
}
```

### 2.9 Reset Password with OTP
```
POST /api/v1/auth/password/reset
Headers: Content-Type: application/json
Body:
{
  "email": "john@example.com",
  "otp": "123456",
  "newPassword": "NewPassword123"
}
```

### 2.10 Verify Email
```
POST /api/v1/auth/email/verify
Headers: Content-Type: application/json
Body:
{
  "email": "john@example.com",
  "otp": "123456"
}
```

### 2.11 Resend OTP
```
POST /api/v1/auth/otp/resend
Headers: Content-Type: application/json
Body:
{
  "email": "john@example.com",
  "purpose": "email_verification"
}
```

### 2.12 Logout
```
POST /api/v1/auth/logout
Headers: 
  Content-Type: application/json
  Authorization: Bearer YOUR_ACCESS_TOKEN
Body: {}
```

---

## 3. USERS (Admin Only)

### 3.1 List Users
```
GET /api/v1/users?page=1&limit=10&role=freelancer&status=active
Headers: 
  Content-Type: application/json
  Authorization: Bearer ADMIN_TOKEN
```

### 3.2 Get User by ID
```
GET /api/v1/users/{userId}
Headers: 
  Content-Type: application/json
  Authorization: Bearer ADMIN_TOKEN
```

### 3.3 Create User
```
POST /api/v1/users
Headers: 
  Content-Type: application/json
  Authorization: Bearer ADMIN_TOKEN
Body:
{
  "email": "newuser@example.com",
  "password": "Password123",
  "firstName": "Jane",
  "lastName": "Smith",
  "role": "client"
}
```

### 3.4 Update User
```
PUT /api/v1/users/{userId}
Headers: 
  Content-Type: application/json
  Authorization: Bearer ADMIN_TOKEN
Body:
{
  "firstName": "Updated",
  "isActive": true
}
```

### 3.5 Delete User (SuperAdmin Only)
```
DELETE /api/v1/users/{userId}
Headers: 
  Content-Type: application/json
  Authorization: Bearer SUPERADMIN_TOKEN
```

### 3.6 Block User
```
PUT /api/v1/users/{userId}/block
Headers: 
  Content-Type: application/json
  Authorization: Bearer ADMIN_TOKEN
Body:
{
  "reason": "Policy violation"
}
```

### 3.7 Unblock User
```
PUT /api/v1/users/{userId}/unblock
Headers: 
  Content-Type: application/json
  Authorization: Bearer ADMIN_TOKEN
Body: {}
```

### 3.8 Update User Role
```
PUT /api/v1/users/{userId}/role
Headers: 
  Content-Type: application/json
  Authorization: Bearer ADMIN_TOKEN
Body:
{
  "role": "admin"
}
```

### 3.9 Search Users
```
GET /api/v1/users/search?q=john&page=1&limit=10
Headers: 
  Content-Type: application/json
  Authorization: Bearer ADMIN_TOKEN
```

### 3.10 Get User Statistics
```
GET /api/v1/users/stats
Headers: 
  Content-Type: application/json
  Authorization: Bearer ADMIN_TOKEN
```

---

## 4. FREELANCERS

### 4.1 Search Freelancers (Public)
```
GET /api/v1/freelancers/search?skills=React,Node.js&minRate=50&maxRate=150&availability=full-time
Headers: Content-Type: application/json
```

### 4.2 Get Freelancer by ID (Public)
```
GET /api/v1/freelancers/{userId}
Headers: Content-Type: application/json
```

### 4.3 Get Own Profile
```
GET /api/v1/freelancers/profile/me
Headers: 
  Content-Type: application/json
  Authorization: Bearer FREELANCER_TOKEN
```

### 4.4 Update Profile
```
PUT /api/v1/freelancers/profile/me
Headers: 
  Content-Type: application/json
  Authorization: Bearer FREELANCER_TOKEN
Body:
{
  "bio": "Full-stack developer with 5 years experience",
  "title": "Senior Full-Stack Developer",
  "hourlyRate": 75,
  "skills": ["React", "Node.js", "MongoDB"],
  "availability": "full-time"
}
```

### 4.5 Add Portfolio Item
```
POST /api/v1/freelancers/portfolio
Headers: 
  Content-Type: application/json
  Authorization: Bearer FREELANCER_TOKEN
Body:
{
  "title": "E-commerce Platform",
  "description": "Built a full e-commerce solution",
  "url": "https://example.com",
  "images": ["https://cloudinary.com/image1.jpg"]
}
```

### 4.6 Update Portfolio Item
```
PUT /api/v1/freelancers/portfolio/{itemId}
Headers: 
  Content-Type: application/json
  Authorization: Bearer FREELANCER_TOKEN
Body:
{
  "title": "Updated Title",
  "description": "Updated description"
}
```

### 4.7 Delete Portfolio Item
```
DELETE /api/v1/freelancers/portfolio/{itemId}
Headers: 
  Content-Type: application/json
  Authorization: Bearer FREELANCER_TOKEN
```

### 4.8 Get Freelancer Statistics
```
GET /api/v1/freelancers/stats/overview
Headers: Content-Type: application/json
```

---

## 5. CLIENTS

### 5.1 Get Own Profile
```
GET /api/v1/clients/profile/me
Headers: 
  Content-Type: application/json
  Authorization: Bearer CLIENT_TOKEN
```

### 5.2 Update Profile
```
PUT /api/v1/clients/profile/me
Headers: 
  Content-Type: application/json
  Authorization: Bearer CLIENT_TOKEN
Body:
{
  "companyName": "Tech Corp",
  "companySize": "50-100",
  "industry": "Technology",
  "website": "https://techcorp.com"
}
```

### 5.3 Submit Verification
```
POST /api/v1/clients/verification/submit
Headers: 
  Content-Type: application/json
  Authorization: Bearer CLIENT_TOKEN
Body:
{
  "documents": [
    "https://cloudinary.com/doc1.pdf",
    "https://cloudinary.com/doc2.pdf"
  ]
}
```

### 5.4 Get Client by ID (Admin)
```
GET /api/v1/clients/{userId}
Headers: 
  Content-Type: application/json
  Authorization: Bearer ADMIN_TOKEN
```

### 5.5 Approve Verification (Admin)
```
POST /api/v1/clients/{userId}/verification/approve
Headers: 
  Content-Type: application/json
  Authorization: Bearer ADMIN_TOKEN
Body: {}
```

### 5.6 Reject Verification (Admin)
```
POST /api/v1/clients/{userId}/verification/reject
Headers: 
  Content-Type: application/json
  Authorization: Bearer ADMIN_TOKEN
Body:
{
  "reason": "Invalid documents"
}
```

---

## 6. JOBS

### 6.1 Search Jobs (Public)
```
GET /api/v1/jobs/search?q=react&page=1&limit=10
Headers: Content-Type: application/json
```

### 6.2 List Jobs (Public)
```
GET /api/v1/jobs?status=open&category=development&skills=React,Node.js
Headers: Content-Type: application/json
```

### 6.3 Get Job by ID (Public)
```
GET /api/v1/jobs/{jobId}
Headers: Content-Type: application/json
```

### 6.4 Create Job (Client)
```
POST /api/v1/jobs
Headers: 
  Content-Type: application/json
  Authorization: Bearer CLIENT_TOKEN
Body:
{
  "title": "Need React Developer",
  "description": "Looking for experienced React developer...",
  "budget": {
    "min": 1000,
    "max": 5000,
    "type": "fixed"
  },
  "skills": ["React", "JavaScript", "CSS"],
  "category": "Web Development",
  "experienceLevel": "intermediate",
  "duration": "2-3 weeks",
  "deadline": "2026-03-01T00:00:00.000Z"
}
```

### 6.5 Update Job (Client)
```
PUT /api/v1/jobs/{jobId}
Headers: 
  Content-Type: application/json
  Authorization: Bearer CLIENT_TOKEN
Body:
{
  "title": "Updated Title",
  "status": "open"
}
```

### 6.6 Close Job (Client)
```
POST /api/v1/jobs/{jobId}/close
Headers: 
  Content-Type: application/json
  Authorization: Bearer CLIENT_TOKEN
Body: {}
```

### 6.7 Delete Job (Client/Admin)
```
DELETE /api/v1/jobs/{jobId}
Headers: 
  Content-Type: application/json
  Authorization: Bearer CLIENT_TOKEN
```

---

## 7. PROPOSALS

### 7.1 List Proposals
```
GET /api/v1/proposals?jobId={jobId}&status=pending
Headers: 
  Content-Type: application/json
  Authorization: Bearer YOUR_TOKEN
```

### 7.2 Get Proposal by ID
```
GET /api/v1/proposals/{proposalId}
Headers: 
  Content-Type: application/json
  Authorization: Bearer YOUR_TOKEN
```

### 7.3 Create Proposal (Freelancer)
```
POST /api/v1/proposals
Headers: 
  Content-Type: application/json
  Authorization: Bearer FREELANCER_TOKEN
Body:
{
  "jobId": "JOB_ID_HERE",
  "coverLetter": "I am very interested in this project...",
  "proposedRate": 3500,
  "estimatedDuration": "2 weeks",
  "attachments": ["https://cloudinary.com/portfolio.pdf"]
}
```

### 7.4 Update Proposal (Freelancer)
```
PUT /api/v1/proposals/{proposalId}
Headers: 
  Content-Type: application/json
  Authorization: Bearer FREELANCER_TOKEN
Body:
{
  "coverLetter": "Updated cover letter",
  "proposedRate": 4000
}
```

### 7.5 Withdraw Proposal (Freelancer)
```
POST /api/v1/proposals/{proposalId}/withdraw
Headers: 
  Content-Type: application/json
  Authorization: Bearer FREELANCER_TOKEN
Body: {}
```

### 7.6 Delete Proposal (Freelancer)
```
DELETE /api/v1/proposals/{proposalId}
Headers: 
  Content-Type: application/json
  Authorization: Bearer FREELANCER_TOKEN
```

### 7.7 Accept Proposal (Client)
```
POST /api/v1/proposals/{proposalId}/accept
Headers: 
  Content-Type: application/json
  Authorization: Bearer CLIENT_TOKEN
Body:
{
  "message": "Congratulations! You are hired."
}
```

### 7.8 Reject Proposal (Client)
```
POST /api/v1/proposals/{proposalId}/reject
Headers: 
  Content-Type: application/json
  Authorization: Bearer CLIENT_TOKEN
Body:
{
  "reason": "Looking for different skills"
}
```

---

## 8. CMS

### 8.1 Get Published Page (Public)
```
GET /api/v1/cms/public/{pageId}
Headers: Content-Type: application/json
```

### 8.2 List Published Pages (Public)
```
GET /api/v1/cms/public
Headers: Content-Type: application/json
```

### 8.3 Search Content (Public)
```
GET /api/v1/cms/search?q=keyword&status=published
Headers: Content-Type: application/json
```

### 8.4 Create Page (Content Editor)
```
POST /api/v1/cms
Headers: 
  Content-Type: application/json
  Authorization: Bearer EDITOR_TOKEN
Body:
{
  "pageId": "about-us",
  "pageName": "About Us",
  "pageType": "about",
  "content": {
    "hero": {
      "title": "About Our Platform",
      "subtitle": "Connecting talent with opportunity"
    },
    "sections": []
  }
}
```

### 8.5 Update Page (Content Editor)
```
PUT /api/v1/cms/{pageId}
Headers: 
  Content-Type: application/json
  Authorization: Bearer EDITOR_TOKEN
Body:
{
  "pageName": "Updated Name",
  "content": {}
}
```

### 8.6 Publish Page (Content Editor)
```
POST /api/v1/cms/{pageId}/publish
Headers: 
  Content-Type: application/json
  Authorization: Bearer EDITOR_TOKEN
Body:
{
  "comment": "Ready for launch"
}
```

### 8.7 Unpublish Page (Content Editor)
```
POST /api/v1/cms/{pageId}/unpublish
Headers: 
  Content-Type: application/json
  Authorization: Bearer EDITOR_TOKEN
Body: {}
```

### 8.8 Delete Page (Content Editor)
```
DELETE /api/v1/cms/{pageId}
Headers: 
  Content-Type: application/json
  Authorization: Bearer EDITOR_TOKEN
```

---

## 9. ADMIN

### 9.1 Create Admin (SuperAdmin)
```
POST /api/v1/admin/create-admin
Headers: 
  Content-Type: application/json
  Authorization: Bearer SUPERADMIN_TOKEN
Body:
{
  "email": "admin@example.com",
  "password": "AdminPass123",
  "firstName": "Admin",
  "lastName": "User"
}
```

### 9.2 Reset User Password (Admin)
```
PUT /api/v1/admin/users/{userId}/password
Headers: 
  Content-Type: application/json
  Authorization: Bearer ADMIN_TOKEN
Body:
{
  "newPassword": "NewPassword123"
}
```

### 9.3 Get System Stats (Admin)
```
GET /api/v1/admin/stats/system
Headers: 
  Content-Type: application/json
  Authorization: Bearer ADMIN_TOKEN
```

---

## 10. PUBLIC

### 10.1 Health Check
```
GET /health
Headers: Content-Type: application/json
```

### 10.2 API Status
```
GET /api/v1/status
Headers: Content-Type: application/json
```

### 10.3 Public Health
```
GET /api/v1/public/health
Headers: Content-Type: application/json
```

---

## 11. WEBHOOKS

### 11.1 Supabase Webhook
```
POST /webhooks/supabase
Headers: 
  Content-Type: application/json
  x-webhook-signature: YOUR_SIGNATURE
Body:
{
  "type": "INSERT",
  "table": "users",
  "record": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

---

## Common Response Formats

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

### Paginated Response
```json
{
  "success": true,
  "data": [],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "totalPages": 10,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```
