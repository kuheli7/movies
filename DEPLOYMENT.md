# 🚀 Render Deployment Guide

## 📋 Prerequisites
- GitHub repository with your code
- Render account (free tier available)

## 🔧 Deployment Steps

### 1. **Push Code to GitHub**
```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

### 2. **Create PostgreSQL Database on Render**
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New" → "PostgreSQL"
3. Fill in details:
   - **Name**: `movie-catalog-db`
   - **Database**: `movie_catalog`
   - **User**: `movie_user` 
   - **Plan**: Free
4. Click "Create Database"
5. **Save the connection details** (you'll need the DATABASE_URL)

### 3. **Deploy Web Service**
1. Click "New" → "Web Service"
2. Connect your GitHub repository
3. Fill in details:
   - **Name**: `movie-catalog-system`
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free

### 4. **Configure Environment Variables**
In the web service settings, add:
```
NODE_ENV=production
DB_TYPE=postgresql
DATABASE_URL=<your_postgresql_connection_string>
```

### 5. **Deploy**
- Click "Create Web Service"
- Render will automatically build and deploy your app
- Your app will be available at: `https://your-app-name.onrender.com`

## 🔗 **Features Ready for Production:**
✅ **Dual Database Support**: MySQL (local) + PostgreSQL (production)
✅ **Auto Table Creation**: Creates tables and sample data automatically
✅ **Health Check**: `/health` endpoint for monitoring
✅ **Environment Detection**: Automatically switches between databases
✅ **CORS Enabled**: Ready for frontend consumption
✅ **Static File Serving**: Serves your HTML/CSS/JS files
✅ **Error Handling**: Comprehensive error responses

## 📊 **API Endpoints:**
- `GET /api/movies` - Get all movies
- `POST /api/movies` - Add new movie  
- `PUT /api/movies/:id` - Update movie
- `DELETE /api/movies/:id` - Delete movie
- `GET /health` - Health check

## 🛠 **Local Development:**
```bash
# Install dependencies
npm install

# Start development server (MySQL)
npm run dev

# Test production server locally (requires PostgreSQL)
npm run dev-render
```

## 🐛 **Troubleshooting:**
- Check Render logs for any errors
- Ensure DATABASE_URL is correctly set
- Verify PostgreSQL database is running
- Check that all environment variables are configured

## 📝 **Notes:**
- Free tier may have cold starts (initial delay)
- Database will persist data between deployments
- Logs available in Render dashboard
