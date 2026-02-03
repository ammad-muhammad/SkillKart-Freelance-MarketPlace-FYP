# Deployment Guide - SkillKart Backend

## 🚀 Deployment Options

1. [Railway](#railway-deployment)
2. [Render](#render-deployment)
3. [Heroku](#heroku-deployment)
4. [Docker](#docker-deployment)
5. [AWS EC2](#aws-ec2-deployment)
6. [DigitalOcean](#digitalocean-deployment)

---

## Railway Deployment

### Prerequisites
- Railway account ([Sign up](https://railway.app/))
- GitHub repository

### Steps

1. **Install Railway CLI**
```bash
npm install -g @railway/cli
```

2. **Login to Railway**
```bash
railway login
```

3. **Initialize Project**
```bash
railway init
```

4. **Link to Existing Project (Optional)**
```bash
railway link
```

5. **Set Environment Variables**
```bash
railway variables set NODE_ENV=production
railway variables set MONGODB_URI="your-mongodb-uri"
railway variables set SUPABASE_URL="your-supabase-url"
railway variables set SUPABASE_SERVICE_KEY="your-service-key"
railway variables set CLOUDINARY_CLOUD_NAME="your-cloud-name"
railway variables set CLOUDINARY_API_KEY="your-api-key"
railway variables set CLOUDINARY_API_SECRET="your-api-secret"
railway variables set CORS_ORIGIN="https://your-frontend-domain.com"
railway variables set PORT=5000
```

6. **Deploy**
```bash
railway up
```

7. **Get Domain**
```bash
railway domain
```

### Using Railway Dashboard

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Add environment variables in Settings → Variables
5. Railway will auto-deploy on every push to main branch

---

## Render Deployment

### Prerequisites
- Render account ([Sign up](https://render.com/))
- GitHub repository

### Steps

1. **Create `render.yaml`** (Already included in project)

2. **Push to GitHub**
```bash
git add .
git commit -m "Deploy to Render"
git push origin main
```

3. **Connect to Render**
- Go to [Render Dashboard](https://dashboard.render.com/)
- Click "New +" → "Blueprint"
- Connect your GitHub repository
- Render will detect `render.yaml`

4. **Add Environment Variables**
- Go to your service → Environment
- Add all required variables:
  - `NODE_ENV`: production
  - `MONGODB_URI`: your MongoDB connection string
  - `SUPABASE_URL`: your Supabase URL
  - `SUPABASE_SERVICE_KEY`: your service key
  - `CLOUDINARY_CLOUD_NAME`: your cloud name
  - `CLOUDINARY_API_KEY`: your API key
  - `CLOUDINARY_API_SECRET`: your API secret
  - `CORS_ORIGIN`: your frontend URL
  - `PORT`: 5000

5. **Deploy**
- Click "Manual Deploy" → "Deploy latest commit"
- Or enable auto-deploy from GitHub

### Manual Render Setup

1. Go to Render Dashboard
2. Click "New +" → "Web Service"
3. Connect repository
4. Configure:
   - **Name**: skillkart-backend
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free (or paid)
5. Add environment variables
6. Click "Create Web Service"

---

## Heroku Deployment

### Prerequisites
- Heroku account ([Sign up](https://heroku.com/))
- Heroku CLI ([Install](https://devcenter.heroku.com/articles/heroku-cli))

### Steps

1. **Login to Heroku**
```bash
heroku login
```

2. **Create Heroku App**
```bash
heroku create skillkart-backend
```

3. **Set Environment Variables**
```bash
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI="your-mongodb-uri"
heroku config:set SUPABASE_URL="your-supabase-url"
heroku config:set SUPABASE_SERVICE_KEY="your-service-key"
heroku config:set CLOUDINARY_CLOUD_NAME="your-cloud-name"
heroku config:set CLOUDINARY_API_KEY="your-api-key"
heroku config:set CLOUDINARY_API_SECRET="your-api-secret"
heroku config:set CORS_ORIGIN="https://your-frontend-domain.com"
```

4. **Deploy**
```bash
git push heroku main
```

5. **Open App**
```bash
heroku open
```

6. **View Logs**
```bash
heroku logs --tail
```

### Using Heroku Dashboard

1. Go to [Heroku Dashboard](https://dashboard.heroku.com/)
2. Create new app
3. Connect to GitHub (Deploy tab)
4. Set environment variables (Settings → Config Vars)
5. Enable automatic deploys

---

## Docker Deployment

### Local Docker Setup

1. **Install Docker**
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

2. **Build Image**
```bash
docker build -t skillkart-backend .
```

3. **Run Container**
```bash
docker run -p 5000:5000 \
  -e NODE_ENV=production \
  -e MONGODB_URI="your-mongodb-uri" \
  -e SUPABASE_URL="your-supabase-url" \
  -e SUPABASE_SERVICE_KEY="your-service-key" \
  -e CLOUDINARY_CLOUD_NAME="your-cloud-name" \
  -e CLOUDINARY_API_KEY="your-api-key" \
  -e CLOUDINARY_API_SECRET="your-api-secret" \
  -e CORS_ORIGIN="your-frontend-url" \
  skillkart-backend
```

### Using Docker Compose

1. **Start Services**
```bash
docker-compose up -d
```

2. **Stop Services**
```bash
docker-compose down
```

3. **View Logs**
```bash
docker-compose logs -f backend
```

### Docker Hub Deployment

1. **Login to Docker Hub**
```bash
docker login
```

2. **Tag Image**
```bash
docker tag skillkart-backend your-username/skillkart-backend:latest
```

3. **Push to Docker Hub**
```bash
docker push your-username/skillkart-backend:latest
```

---

## AWS EC2 Deployment

### Prerequisites
- AWS account
- EC2 instance (Ubuntu 22.04 recommended)
- SSH key pair

### Steps

1. **Connect to EC2**
```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

2. **Install Node.js**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

3. **Install MongoDB (Optional - if not using Atlas)**
```bash
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

4. **Clone Repository**
```bash
git clone https://github.com/your-username/skillkart-backend.git
cd skillkart-backend
```

5. **Install Dependencies**
```bash
npm install
```

6. **Create .env File**
```bash
nano .env
# Add all environment variables
```

7. **Install PM2**
```bash
sudo npm install -g pm2
```

8. **Start Application**
```bash
pm2 start src/server.js --name skillkart-backend
pm2 save
pm2 startup
```

9. **Configure Nginx (Optional)**
```bash
sudo apt-get install nginx
sudo nano /etc/nginx/sites-available/skillkart
```

Add configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/skillkart /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

10. **Set Up SSL (Optional - Let's Encrypt)**
```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## DigitalOcean Deployment

### Using App Platform

1. **Go to DigitalOcean Dashboard**
2. Click "Create" → "Apps"
3. Connect GitHub repository
4. Configure:
   - **Type**: Web Service
   - **Environment**: Node.js
   - **Build Command**: `npm install`
   - **Run Command**: `npm start`
   - **HTTP Port**: 5000
5. Add environment variables
6. Click "Create Resources"

### Using Droplet (Same as EC2)

Follow the AWS EC2 guide but use DigitalOcean Droplet

---

## Post-Deployment Checklist

- [ ] All environment variables set
- [ ] MongoDB connection working
- [ ] Supabase authentication working
- [ ] Cloudinary uploads working
- [ ] CORS configured correctly
- [ ] Health check endpoint responding
- [ ] HTTPS/SSL enabled
- [ ] Monitoring set up
- [ ] Error tracking configured
- [ ] Backups enabled
- [ ] Domain configured
- [ ] Rate limiting enabled (production)

---

## Environment Variables Checklist

### Required Variables
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://...
SUPABASE_URL=https://...
SUPABASE_SERVICE_KEY=eyJhbGc...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
CORS_ORIGIN=https://your-frontend.com
```

### Optional Variables
```env
JWT_SECRET=your-secret-key
```

---

## Monitoring & Logging

### Recommended Tools

1. **Error Tracking**
   - [Sentry](https://sentry.io/)
   - [Rollbar](https://rollbar.com/)

2. **Performance Monitoring**
   - [New Relic](https://newrelic.com/)
   - [Datadog](https://www.datadoghq.com/)

3. **Logging**
   - [Logtail](https://logtail.com/)
   - [Papertrail](https://www.papertrail.com/)

4. **Uptime Monitoring**
   - [UptimeRobot](https://uptimerobot.com/)
   - [Pingdom](https://www.pingdom.com/)

---

## Troubleshooting Deployment Issues

### Application Won't Start

1. Check logs:
```bash
# Railway
railway logs

# Heroku
heroku logs --tail

# PM2
pm2 logs skillkart-backend
```

2. Verify environment variables
3. Check MongoDB connection
4. Ensure correct Node.js version

### MongoDB Connection Failed

1. Check connection string format
2. Verify IP whitelist (MongoDB Atlas)
3. Check network access rules
4. Ensure correct credentials

### 502 Bad Gateway

1. Check if application is running
2. Verify port configuration
3. Check firewall rules
4. Review proxy configuration

---

## Continuous Deployment

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Railway
        run: |
          npm install -g @railway/cli
          railway link ${{ secrets.RAILWAY_PROJECT_ID }}
          railway up
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

---

## Scaling Considerations

1. **Horizontal Scaling**
   - Use load balancer
   - Multiple server instances
   - Session management

2. **Database Scaling**
   - MongoDB Atlas auto-scaling
   - Read replicas
   - Sharding for large datasets

3. **Caching**
   - Redis for sessions
   - Cache frequent queries
   - CDN for static assets

4. **Performance**
   - Enable compression
   - Optimize database queries
   - Use connection pooling
   - Implement rate limiting

---

## Support

For deployment issues:
1. Check platform-specific documentation
2. Review application logs
3. Verify environment configuration
4. Test locally with production settings
5. Contact platform support if needed

---

**Happy deploying! 🚀**
