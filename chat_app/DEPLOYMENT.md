# 🚀 Deployment Guide - Render.com

This guide walks you through deploying the Secure Chat app on Render.com.

## Architecture
- **Backend**: Node.js + Express + Socket.io
- **Frontend**: React + Vite  
- **Deployment**: Two separate Render services

---

## Part 1: Deploy Backend Server

### Step 1: Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up/login with GitHub

### Step 2: Create New Web Service
1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository
3. Select the repository and branch

### Step 3: Configure Backend Service
Fill in the following settings:

| Setting | Value |
|---------|-------|
| **Name** | `secure-chat-backend` |
| **Root Directory** | `server` |
| **Environment** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `node index.js` |
| **Instance Type** | Starter (free tier) |

### Step 4: Add Environment Variables
Click **"Advanced"** → **"Add Environment Variable"**

Add these variables:

1. **JWT_SECRET** (Required!)
   ```bash
   # Generate a secure random key:
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   Copy the output and paste as JWT_SECRET value

2. **FRONTEND_URL**
   - Leave empty for now, you'll update it after deploying the frontend
   - Format: `https://your-frontend-domain.onrender.com`

3. **NODE_ENV**
   - Value: `production`

### Step 5: Deploy
1. Click **"Create Web Service"**
2. Wait for deployment (2-3 minutes)
3. Note the backend URL (e.g., `https://secure-chat-backend.onrender.com`)

---

## Part 2: Deploy Frontend

### Step 1: Create New Static Site
1. Click **"New +"** → **"Static Site"**
2. Connect your GitHub repository (same repo)
3. Select the repository and branch

### Step 2: Configure Frontend Service
Fill in the following settings:

| Setting | Value |
|---------|-------|
| **Name** | `secure-chat-frontend` |
| **Root Directory** | `client` |
| **Build Command** | `npm install && npm run build` |
| **Publish Directory** | `dist` |

### Step 3: Add Environment Variables
1. Go to **Settings** → **Environment**
2. Add these build-time variables:

```
VITE_API_URL=https://secure-chat-backend.onrender.com/api
VITE_SOCKET_URL=https://secure-chat-backend.onrender.com
```

### Step 4: Deploy
1. Click **"Create Static Site"**
2. Wait for deployment (2-3 minutes)
3. Note the frontend URL (e.g., `https://secure-chat-frontend.onrender.com`)

---

## Part 3: Update Backend CORS

### Step 1: Get Frontend URL
After frontend deploys, note its URL from Render dashboard.

### Step 2: Update Backend Environment
1. Go to backend service settings on Render
2. Go to **Environment** section
3. Update `FRONTEND_URL`:
   ```
   https://secure-chat-frontend.onrender.com
   ```
4. Click **"Save"** → Service will auto-redeploy

---

## Security Checklist ✅

Before going live:

- [x] JWT_SECRET is a random 64-character hex string (not default)
- [x] FRONTEND_URL matches your actual frontend domain
- [x] NODE_ENV is set to `production`
- [x] Messages are RSA-2048 encrypted end-to-end
- [x] Passwords hashed with bcrypt (12 rounds)
- [x] Private keys encrypted with AES-256
- [x] Rate limiting enabled on auth endpoints
- [x] CORS restricted to frontend domain only
- [x] Tokens in httpOnly secure cookies
- [x] Message size limited to 50KB

---

## Testing Deployment

### Test Backend Health
```bash
curl https://your-backend.onrender.com
# Should return: {"status":"Secure Chat Backend running"}
```

### Test in Browser
1. Visit frontend URL
2. Sign up with a test account
3. Log in
4. Send test messages
5. Verify encryption works (ciphertext should look random)

---

## Troubleshooting

### Backend Deploy Fails
- Check build logs in Render dashboard
- Verify `package.json` exists in `server/` directory
- Ensure `npm install` can download all dependencies

### Connection Errors ("Cannot connect to server")
- Check FRONTEND_URL matches your frontend domain exactly
- Verify Socket.io is listening (check backend logs)
- Ensure both services are fully deployed

### Messages Not Sending
- Check browser console for errors
- Verify JWT_SECRET is set (should be 64+ chars)
- Check that users exist on server

### Blank Page on Frontend
- Check browser console for errors
- Verify VITE_API_URL and VITE_SOCKET_URL are correct
- Clear browser cache and reload

---

## Local Development

To test locally before deploying:

### Backend
```bash
cd server
npm install
NODE_ENV=development JWT_SECRET=test-secret FRONTEND_URL=http://localhost:5173 node index.js
```

### Frontend
```bash
cd client
npm install
npm run dev
# Visit http://localhost:5173
```

---

## Updating After Deployment

### Update Backend
```bash
git push origin main
# Render auto-deploys on push
```

### Update Frontend  
```bash
git push origin main
# Render auto-deploys on push
```

---

## Performance Tips

- **Starter Plan**: ~$7/month per service (recommended for small deployments)
- **Pro Plan**: ~$12/month per service (recommended for production)
- Messages queue in memory if recipient offline (lost on server restart)
- Consider upgrading to persistent database for production use

---

## Support

For issues:
1. Check Render dashboard logs
2. Review browser console errors
3. Verify all environment variables are set
4. Ensure JWT_SECRET is never hardcoded in files

