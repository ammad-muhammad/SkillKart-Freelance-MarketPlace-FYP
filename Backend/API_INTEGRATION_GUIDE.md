# API Integration Guide

## Base Configuration

**Base URL**: `http://localhost:5000/api/v1`
**Production**: `https://your-domain.com/api/v1`

---

## Authentication Flow

### 1. Register User
```javascript
// Step 1: Request OTP
POST /auth/register/user
Body: { "email": "user@example.com" }

// Step 2: Complete registration
POST /auth/register/step2
Body: {
  "email": "user@example.com",
  "otp": "123456",
  "password": "SecurePass123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "freelancer"
}
```

### 2. Login User
```javascript
// Direct login (recommended)
POST /auth/login
Body: {
  "email": "user@example.com",
  "password": "SecurePass123"
}
Response: {
  "accessToken": "eyJhbG...",
  "refreshToken": "eyJhbG...",
  "user": { ... }
}

// Store tokens
localStorage.setItem('accessToken', response.accessToken);
localStorage.setItem('refreshToken', response.refreshToken);
```

### 3. Use Protected Endpoints
```javascript
// Add token to all requests
headers: {
  'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
  'Content-Type': 'application/json'
}
```

### 4. Refresh Token
```javascript
POST /auth/refresh
Body: {
  "refreshToken": localStorage.getItem('refreshToken')
}
Response: {
  "accessToken": "new_token"
}
```

---

## Frontend Integration Examples

### React/Next.js

```javascript
// api/client.js
import axios from 'axios';

const API_URL = 'http://localhost:5000/api/v1';

const client = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle token refresh
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const refreshToken = localStorage.getItem('refreshToken');
      const { data } = await axios.post(`${API_URL}/auth/refresh`, {
        refreshToken
      });
      
      localStorage.setItem('accessToken', data.accessToken);
      originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
      
      return client(originalRequest);
    }
    
    return Promise.reject(error);
  }
);

export default client;
```

### Usage Examples

```javascript
// Login
import api from './api/client';

async function login(email, password) {
  const { data } = await api.post('/auth/login', { email, password });
  localStorage.setItem('accessToken', data.data.tokens.accessToken);
  localStorage.setItem('refreshToken', data.data.tokens.refreshToken);
  return data.data.user;
}

// Get current user
async function getCurrentUser() {
  const { data } = await api.get('/auth/me');
  return data.data.user;
}

// Search freelancers
async function searchFreelancers(params) {
  const { data } = await api.get('/freelancers/search', { params });
  return data.data;
}

// Create job
async function createJob(jobData) {
  const { data } = await api.post('/jobs', jobData);
  return data.data.job;
}

// Submit proposal
async function submitProposal(proposalData) {
  const { data } = await api.post('/proposals', proposalData);
  return data.data.proposal;
}
```

---

## File Upload

```javascript
// Upload profile picture
async function uploadProfilePicture(file) {
  const formData = new FormData();
  formData.append('image', file);
  
  const { data } = await api.post('/profile/picture', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  
  return data.data.url;
}
```

---

## Error Handling

```javascript
try {
  const response = await api.post('/jobs', jobData);
  return response.data;
} catch (error) {
  if (error.response) {
    // Server responded with error
    const { status, data } = error.response;
    
    switch (status) {
      case 400:
        console.error('Bad request:', data.message);
        break;
      case 401:
        console.error('Unauthorized:', data.message);
        // Redirect to login
        break;
      case 403:
        console.error('Forbidden:', data.message);
        break;
      case 404:
        console.error('Not found:', data.message);
        break;
      case 422:
        console.error('Validation errors:', data.errors);
        break;
      default:
        console.error('Error:', data.message);
    }
  } else if (error.request) {
    // No response from server
    console.error('Network error');
  } else {
    console.error('Error:', error.message);
  }
}
```

---

## Role-Based UI

```javascript
// Check user role
const user = await getCurrentUser();

if (user.role === 'freelancer') {
  // Show freelancer UI
} else if (user.role === 'client') {
  // Show client UI
} else if (user.role === 'admin') {
  // Show admin panel
}

// Or use component
function ProtectedRoute({ allowedRoles, children }) {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/forbidden" />;
  }
  
  return children;
}

// Usage
<ProtectedRoute allowedRoles={['client']}>
  <CreateJob />
</ProtectedRoute>
```

---

## Pagination

```javascript
async function getJobs(page = 1, limit = 10) {
  const { data } = await api.get('/jobs', {
    params: { page, limit }
  });
  
  return {
    jobs: data.data,
    pagination: data.meta.pagination
  };
}

// Usage
const { jobs, pagination } = await getJobs(1, 10);

// Next page
if (pagination.hasNextPage) {
  const nextPage = await getJobs(pagination.page + 1, 10);
}
```

---

## WebSocket Integration (Future)

```javascript
// Connect to real-time updates
import io from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: {
    token: localStorage.getItem('accessToken')
  }
});

// Listen for new proposals
socket.on('proposal:new', (proposal) => {
  console.log('New proposal received:', proposal);
});

// Listen for job updates
socket.on('job:updated', (job) => {
  console.log('Job updated:', job);
});
```

---

## Common Integrations

### Search with Filters
```javascript
const filters = {
  skills: 'React,Node.js',
  minRate: 50,
  maxRate: 150,
  availability: 'full-time',
  page: 1,
  limit: 10
};

const { data } = await api.get('/freelancers/search', { params: filters });
```

### Create Job
```javascript
const jobData = {
  title: 'React Developer Needed',
  description: 'Looking for experienced React developer...',
  budget: {
    min: 1000,
    max: 5000,
    type: 'fixed'
  },
  skills: ['React', 'JavaScript', 'CSS'],
  experienceLevel: 'intermediate',
  deadline: '2026-03-01T00:00:00.000Z'
};

const { data } = await api.post('/jobs', jobData);
```

### Submit Proposal
```javascript
const proposalData = {
  jobId: 'JOB_ID',
  coverLetter: 'I am interested...',
  proposedRate: 3500,
  estimatedDuration: '2 weeks'
};

const { data } = await api.post('/proposals', proposalData);
```

### Accept Proposal
```javascript
const { data } = await api.post(`/proposals/${proposalId}/accept`, {
  message: 'Congratulations! You are hired.'
});
```

---

## Environment Variables (Frontend)

```env
VITE_API_URL=http://localhost:5000/api/v1
VITE_WS_URL=http://localhost:5000

# Or for Next.js
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
```

---

## Testing with cURL

```bash
# Login
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePass123"}'

# Get user
curl -X GET http://localhost:5000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"

# Create job
curl -X POST http://localhost:5000/api/v1/jobs \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Developer Needed","description":"...","budget":{"min":1000,"max":5000,"type":"fixed"}}'
```

---

## Rate Limiting

- **Default**: 100 requests per 15 minutes
- **Auth endpoints**: 5 requests per 15 minutes
- **Response header**: `X-RateLimit-Remaining`

Handle rate limit:
```javascript
if (error.response?.status === 429) {
  const retryAfter = error.response.headers['retry-after'];
  console.log(`Rate limited. Retry after ${retryAfter} seconds`);
}
```

---

## CORS Configuration

Backend allows requests from configured origins in `.env`:
```env
CORS_ORIGIN=http://localhost:3000,https://yourdomain.com
```

If you get CORS errors:
1. Check backend `.env` file
2. Ensure your frontend URL is in `CORS_ORIGIN`
3. Restart backend after changes

---

## Security Best Practices

1. **Never expose tokens in URL**
   - Use headers for authentication
   - Don't log tokens

2. **Store tokens securely**
   - Use httpOnly cookies (recommended)
   - Or localStorage with XSS protection

3. **Refresh tokens before expiry**
   - Implement token refresh logic
   - Handle 401 errors gracefully

4. **Validate all user input**
   - Backend validates, but validate frontend too
   - Show user-friendly error messages

5. **Handle errors properly**
   - Don't expose sensitive info
   - Log errors for debugging

---

## Support

For issues or questions:
- Check API documentation
- Review error messages
- Test with Postman first
- Check network tab in browser
