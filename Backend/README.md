# SkillKart Backend

Production-ready Node.js backend for SkillKart - A two-sided freelance marketplace platform.

## 🚀 Features

- **Supabase Authentication** (Email/Password + Google OAuth)
- **MongoDB** for data persistence
- **Role-Based Access Control** (Client & Freelancer)
- **File Upload** (Cloudinary integration)
- **RESTful API** with proper validation
- **Production-ready** error handling & security

## 📋 Prerequisites

- Node.js >= 18.0.0
- MongoDB (local or Atlas)
- Supabase account
- Cloudinary account

## 🛠️ Installation

1. Clone the repository
```bash
git clone <repository-url>
cd skillkart-backend
```

2. Install dependencies
```bash
npm install
```

3. Configure environment variables
```bash
cp .env.example .env
# Edit .env with your actual credentials
```

4. Start the server
```bash
# Development
npm run dev

# Production
npm start
```

## 🔐 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Environment (development/production) | Yes |
| `PORT` | Server port | Yes |
| `MONGODB_URI` | MongoDB connection string | Yes |
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_SERVICE_KEY` | Supabase service role key | Yes |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | Yes |
| `CLOUDINARY_API_KEY` | Cloudinary API key | Yes |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | Yes |
| `CORS_ORIGIN` | Allowed CORS origin | Yes |
| `JWT_SECRET` | JWT secret key | Optional |

## 📁 Project Structure

```
skillkart-backend/
├── src/
│   ├── config/           # Configuration files
│   ├── models/           # Mongoose models
│   ├── middleware/       # Express middleware
│   ├── validators/       # Zod validation schemas
│   ├── routes/           # API routes
│   ├── controllers/      # Route controllers
│   ├── services/         # Business logic
│   ├── utils/            # Utility functions
│   ├── app.js            # Express app setup
│   └── server.js         # Server entry point
├── .env.example          # Environment variables template
├── .gitignore
├── package.json
└── README.md
```

## 🔑 API Endpoints

### Authentication
- `POST /api/auth/sync` - Sync Supabase user to MongoDB
- `POST /api/auth/role` - Select user role (client/freelancer)
- `GET /api/auth/me` - Get current user

### Profile
- `POST /api/profile/client` - Create client profile
- `POST /api/profile/freelancer` - Create freelancer profile
- `GET /api/profile/me` - Get own profile
- `PUT /api/profile/me` - Update own profile
- `GET /api/profile/:userId` - Get public profile

### Jobs (Client)
- `POST /api/jobs` - Create job
- `GET /api/jobs` - Get all jobs (with filters)
- `GET /api/jobs/:id` - Get job by ID
- `PUT /api/jobs/:id` - Update job
- `DELETE /api/jobs/:id` - Cancel job
- `GET /api/jobs/my/posted` - Get my posted jobs

### Proposals (Freelancer)
- `POST /api/proposals` - Submit proposal
- `GET /api/proposals/my` - Get my proposals
- `PATCH /api/proposals/:id/withdraw` - Withdraw proposal

### Proposals (Client)
- `GET /api/proposals/job/:jobId` - Get job proposals
- `PATCH /api/proposals/:id/accept` - Accept proposal
- `PATCH /api/proposals/:id/reject` - Reject proposal

### File Upload
- `POST /api/upload` - Upload file
- `GET /api/upload/my` - Get my files
- `DELETE /api/upload/:id` - Delete file

## 🔒 Authentication Flow

1. User signs up/logs in via Supabase (frontend)
2. Frontend calls `/api/auth/sync` to create MongoDB user
3. User selects role via `/api/auth/role`
4. User completes profile via `/api/profile/client` or `/api/profile/freelancer`
5. All subsequent requests include Supabase JWT in Authorization header

## 🛡️ Security Features

- Helmet.js for security headers
- CORS protection
- NoSQL injection prevention
- Input validation with Zod
- JWT verification via Supabase
- Role-based access control
- File upload restrictions
- Rate limiting ready

## 📝 Database Models

- **User** - Core user data (linked to Supabase)
- **ClientProfile** - Client-specific profile data
- **FreelancerProfile** - Freelancer-specific profile data
- **Job** - Job postings
- **Proposal** - Freelancer proposals
- **FileUpload** - File metadata

## 🚀 Deployment

1. Set all environment variables in production
2. Use MongoDB Atlas for database
3. Enable Supabase production mode
4. Configure Cloudinary production account
5. Add rate limiting (express-rate-limit)
6. Enable HTTPS/SSL
7. Set up logging and monitoring
8. Configure CI/CD pipeline

## 📦 Additional Recommendations

- Add Redis caching for performance
- Implement rate limiting
- Add API documentation (Swagger)
- Set up error tracking (Sentry)
- Add comprehensive logging (Winston)
- Implement database backup strategy
- Add health check monitoring

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

MIT

## 👥 Support

For support, email support@skillkart.com or join our Slack channel.
