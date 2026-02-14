# 🚀 Freelance Platform API Documentation

## Base URL
```
http://localhost:5000/api/v1
```

## Authentication
Most endpoints require Bearer token authentication:
```
Authorization: Bearer <your-jwt-token>
```

---

## 📁 API Endpoints Overview

### 🔐 Authentication (`/api/v1/auth`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/register/user` | Send OTP for registration | ❌ |
| POST | `/register/step2` | Complete registration with OTP | ❌ |
| POST | `/login/step1` | Send OTP for login | ❌ |
| POST | `/login/step2` | Complete login with OTP | ❌ |
| POST | `/login` | Direct login (no OTP) | ❌ |
| POST | `/superadmin/login` | SuperAdmin login | ❌ |
| POST | `/password/reset/request` | Request password reset | ❌ |
| POST | `/password/reset` | Reset password with OTP | ❌ |
| POST | `/email/verify` | Verify email with OTP | ❌ |
| POST | `/otp/resend` | Resend OTP | ❌ |
| POST | `/refresh` | Refresh access token | ❌ |
| GET | `/me` | Get current user | ✅ |
| POST | `/password/change` | Change password | ✅ |
| POST | `/logout` | Logout | ✅ |

### 👥 Users (`/api/v1/users`)
| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/` | List all users | Admin |
| GET | `/search` | Search users | Admin |
| GET | `/stats` | User statistics | Admin |
| GET | `/:id` | Get user by ID | Admin |
| POST | `/` | Create user | Admin |
| PUT | `/:id` | Update user | Admin |
| DELETE | `/:id` | Delete user | SuperAdmin |
| PUT | `/:id/block` | Block user | Admin |
| PUT | `/:id/unblock` | Unblock user | Admin |
| PUT | `/:id/role` | Update user role | Admin |

### 💼 Freelancers (`/api/v1/freelancers`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/search` | Search freelancers | Public |
| GET | `/:id` | Get freelancer profile | Public |
| GET | `/stats/overview` | Freelancer stats | Public |
| GET | `/profile/me` | Get own profile | Freelancer |
| PUT | `/profile/me` | Update profile | Freelancer |
| POST | `/portfolio` | Add portfolio item | Freelancer |
| PUT | `/portfolio/:itemId` | Update portfolio | Freelancer |
| DELETE | `/portfolio/:itemId` | Delete portfolio | Freelancer |

### 🏢 Clients (`/api/v1/clients`)
| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/profile/me` | Get own profile | Client |
| PUT | `/profile/me` | Update profile | Client |
| POST | `/verification/submit` | Submit verification | Client |
| GET | `/:id` | Get client by ID | Admin |
| POST | `/:id/verification/approve` | Approve verification | Admin |
| POST | `/:id/verification/reject` | Reject verification | Admin |
| GET | `/stats/overview` | Client statistics | Admin |

### 🛠️ Admin (`/api/v1/admin`)
| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| POST | `/create-admin` | Create admin user | SuperAdmin |
| PUT | `/users/:id/password` | Reset user password | Admin |
| GET | `/stats/system` | System statistics | Admin |

### 👑 SuperAdmin (`/api/v1/superadmin`)
| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/dashboard` | SuperAdmin dashboard | SuperAdmin |
| GET | `/health` | System health check | SuperAdmin |

### 📝 CMS (`/api/v1/cms`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/public/:pageId` | Get published page | Public |
| GET | `/public` | List published pages | Public |
| GET | `/search` | Search content | Public |
| POST | `/` | Create page | Content Editor |
| GET | `/` | List pages (admin) | Content Editor |
| GET | `/:pageId` | Get page for edit | Content Editor |
| PUT | `/:pageId` | Update page | Content Editor |
| POST | `/:pageId/publish` | Publish page | Content Editor |
| POST | `/:pageId/unpublish` | Unpublish page | Content Editor |
| POST | `/:pageId/schedule` | Schedule publish | Content Editor |
| POST | `/:pageId/restore` | Restore version | Content Editor |
| GET | `/:pageId/export` | Export as JSON | Content Editor |
| DELETE | `/:pageId` | Delete page | Content Editor |

### 💼 Jobs (`/api/v1/jobs`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/search` | Search jobs | Public |
| GET | `/` | List jobs | Public |
| GET | `/:id` | Get job details | Public |
| POST | `/` | Create job | Client |
| PUT | `/:id` | Update job | Client |
| POST | `/:id/close` | Close job | Client |
| DELETE | `/:id` | Delete job | Client/Admin |

### 📨 Proposals (`/api/v1/proposals`)
| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/` | List proposals | Auth |
| GET | `/:id` | Get proposal details | Auth |
| POST | `/` | Create proposal | Freelancer |
| PUT | `/:id` | Update proposal | Freelancer |
| POST | `/:id/withdraw` | Withdraw proposal | Freelancer |
| DELETE | `/:id` | Delete proposal | Freelancer |
| POST | `/:id/accept` | Accept proposal | Client |
| POST | `/:id/reject` | Reject proposal | Client |

### 🌐 Public (`/api/v1/public`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/cms/:pageId` | Get CMS page | ❌ |
| GET | `/cms` | List CMS pages | ❌ |
| GET | `/freelancers/search` | Search freelancers | ❌ |
| GET | `/freelancers/:id` | Get freelancer | ❌ |
| GET | `/jobs/search` | Search jobs | ❌ |
| GET | `/jobs/:id` | Get job | ❌ |
| GET | `/jobs` | List jobs | ❌ |
| GET | `/health` | Health check | ❌ |

### 🔗 Webhooks
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/webhooks/supabase` | Supabase user sync |

---

## 📋 Example Requests

### Register User (Step 1)
```bash
curl -X POST http://localhost:5000/api/v1/auth/register/user \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}'
```

### Register User (Step 2)
```bash
curl -X POST http://localhost:5000/api/v1/auth/register/step2 \
  -H "Content-Type: application/json" \
  -d '{
    "email":"user@example.com",
    "otp":"123456",
    "password":"SecurePass123",
    "firstName":"John",
    "lastName":"Doe",
    "role":"freelancer"
  }'
```

### Login (Direct)
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"user@example.com",
    "password":"SecurePass123"
  }'
```

### Get Current User
```bash
curl -X GET http://localhost:5000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Create Job (Client)
```bash
curl -X POST http://localhost:5000/api/v1/jobs \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Full-stack Developer Needed",
    "description":"We need an experienced developer...",
    "budget":{"min":1000,"max":5000,"type":"fixed"},
    "skills":["React","Node.js","MongoDB"],
    "experienceLevel":"intermediate"
  }'
```

### Submit Proposal (Freelancer)
```bash
curl -X POST http://localhost:5000/api/v1/proposals \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jobId":"JOB_ID_HERE",
    "coverLetter":"I am interested in this position...",
    "proposedRate":3500,
    "estimatedDuration":"2 weeks"
  }'
```

### Search Freelancers
```bash
curl "http://localhost:5000/api/v1/freelancers/search?skills=React,Node.js&minRate=50&maxRate=150"
```

---

## 🔒 Role-Based Access

### Roles Hierarchy:
1. **SuperAdmin** (Level 100) - Full system access
2. **Admin** (Level 90) - User & content management
3. **Content Editor** (Level 50) - CMS only
4. **Freelancer** (Level 30) - Profile, proposals
5. **Client** (Level 30) - Jobs, hiring
6. **Public Viewer** (Level 10) - Read-only public content

---

## ⚠️ Error Responses

All errors follow this format:
```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

### Common Status Codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Validation Error
- `429` - Too Many Requests
- `500` - Server Error

---

## 📊 Pagination

List endpoints support pagination:
```bash
GET /api/v1/jobs?page=1&limit=10&sortBy=createdAt&sortOrder=desc
```

Response includes:
```json
{
  "success": true,
  "data": [...],
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

---

## 🎯 Quick Start

1. **Setup SuperAdmin:**
```bash
npm run setup:superadmin
```

2. **Start Server:**
```bash
npm run dev
```

3. **Test Health:**
```bash
curl http://localhost:5000/health
```

4. **Login as SuperAdmin:**
```bash
curl -X POST http://localhost:5000/api/v1/auth/superadmin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}'
```

---

**Total Endpoints: 80+**
