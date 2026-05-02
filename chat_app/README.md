# 🔐 Secure Web Chat (E2EE)

A production-ready, end-to-end encrypted web chat application with strong security features.

## ✨ Features

- **End-to-End Encryption (E2EE)**: RSA-2048 message encryption
- **Password Security**: Bcrypt hashing (12 rounds) + strong password validation
- **Private Key Protection**: AES-256-GCM with PBKDF2 key derivation (100k iterations)
- **Secure Authentication**: JWT tokens in httpOnly cookies
- **Rate Limiting**: Protection against brute force attacks
- **Input Validation**: Username and message size validation
- **CORS Protection**: Restricted to whitelisted frontend domain
- **Real-time Messaging**: WebSocket communication via Socket.IO
- **Offline Message Queue**: Messages queued for offline users

## 🔒 Security Architecture

### Encryption Flow
1. **User Authentication**
   - Password hashed with bcrypt (12 salt rounds)
   - JWT tokens stored in httpOnly secure cookies
   - Token expires after 24 hours

2. **Key Management**
   - RSA-2048 key pair generated per user
   - Private key encrypted locally with user's password
   - Public key uploaded to server (server cannot decrypt messages)
   - Keys stored in browser localStorage

3. **Message Encryption**
   - Messages encrypted with recipient's public key (RSA-OAEP)
   - Encrypted message sent through server
   - Only recipient can decrypt with their private key

### Protected Endpoints
- `/api/signup` - Rate limited (5 attempts/15min)
- `/api/login` - Rate limited (10 attempts/15min)
- `/api/public-key/*` - Requires JWT authentication
- Socket.IO events - Message size limited to 50KB

## 🚀 Quick Start

### Local Development

**Prerequisites**: Node.js 16+, npm 8+

**Backend**:
```bash
cd server
npm install
NODE_ENV=development JWT_SECRET=dev-secret FRONTEND_URL=http://localhost:5173 node index.js
```

**Frontend**:
```bash
cd client
npm install
npm run dev
# Visit http://localhost:5173
```

**Credentials for Testing**:
- Username: Must be 3-32 characters (alphanumeric + underscore)
- Password: 12+ chars, uppercase, lowercase, number, symbol
  - Example: `TestPass1!@#`

## 📦 Production Deployment

### Deploy to Render.com
See [DEPLOYMENT.md](DEPLOYMENT.md) for step-by-step instructions.

**Summary**:
1. Deploy backend as Web Service
2. Deploy frontend as Static Site
3. Configure environment variables
4. Update CORS settings

### Environment Variables

**Server** (server/.env):
```
JWT_SECRET=<64-char random hex string>
FRONTEND_URL=https://your-frontend-domain.com
NODE_ENV=production
PORT=3001
```

**Client** (client/.env):
```
VITE_API_URL=https://your-api-domain.com/api
VITE_SOCKET_URL=https://your-api-domain.com
```

## 🛡️ Security Features

| Feature | Implementation |
|---------|-----------------|
| **Message Encryption** | RSA-OAEP 2048-bit |
| **Key Derivation** | PBKDF2 with 100k iterations |
| **Password Hashing** | bcrypt 12 rounds |
| **Authentication** | JWT (24h expiry) in httpOnly cookies |
| **Transport Security** | HTTPS/TLS (with CORS validation) |
| **Rate Limiting** | Auth endpoints + message throttling |
| **Input Validation** | Username format, message size limits |
| **CORS** | Restricted to frontend domain |
| **Private Key Security** | AES-256-GCM encryption at rest |

## ⚙️ Tech Stack

- **Frontend**: React 19 + Vite + Web Crypto API
- **Backend**: Express 5 + Socket.IO 4 + Node.js
- **Security**: bcrypt, jsonwebtoken, helmet, cors
- **Styling**: Tailwind CSS

## 📋 Project Structure

```
chat_app/
├── server/                 # Backend (Node.js + Express)
│   ├── index.js           # Main server
│   ├── socket.js          # WebSocket handling
│   ├── db.js              # In-memory user storage
│   ├── middleware/        # Authentication middleware
│   ├── routes/            # API endpoints
│   ├── utils/             # Password validation
│   ├── package.json
│   └── .env.example       # Environment template
│
├── client/                # Frontend (React + Vite)
│   ├── src/
│   │   ├── App.jsx        # Main chat component
│   │   ├── crypto.js      # Encryption utilities
│   │   ├── socket.js      # Socket.IO client
│   │   ├── api.js         # API requests
│   │   └── main.jsx       # App entry point
│   ├── package.json
│   ├── vite.config.js
│   └── .env.example       # Environment template
│
├── DEPLOYMENT.md          # Detailed deployment guide
└── README.md              # This file
```

## 🧪 Testing

### Manual Testing Checklist
- [ ] Create account with weak password (should fail)
- [ ] Create account with strong password (should succeed)
- [ ] Login with wrong password (should fail)
- [ ] Login successfully and keys generate
- [ ] Send message to non-existent user (shows error)
- [ ] Send message to existing user (receives encrypted)
- [ ] Logout and login again (keys decrypt correctly)
- [ ] Send message > 50KB (should be rejected)

### Browser Console Verification
- No sensitive data logged to console
- Socket errors properly caught
- Encryption/decryption times reasonable (< 500ms)

## ⚠️ Known Limitations

1. **In-Memory Storage**: Messages queue and user data stored in RAM
   - Lost on server restart
   - Not suitable for production without persistent database
   - Upgrade to MongoDB/PostgreSQL for production

2. **No Message Persistence**: Historical messages not saved
   - Users must be online or messages are queued temporarily
   - Consider adding message storage for production

3. **Browser Local Storage**: Private key + public key stored in localStorage
   - Secure against network eavesdropping
   - Vulnerable to XSS attacks (use CSP headers in production)

## 🔄 Future Improvements

- [ ] Persistent message storage (MongoDB)
- [ ] User profile management
- [ ] Group chats with key exchange
- [ ] Message deletion / edit
- [ ] Read receipts
- [ ] Typing indicators
- [ ] File sharing (encrypted)
- [ ] Perfect forward secrecy
- [ ] Key rotation mechanism

## 📝 License

University Assessment Project

## 🤝 Support

For deployment issues, see [DEPLOYMENT.md](DEPLOYMENT.md) troubleshooting section.