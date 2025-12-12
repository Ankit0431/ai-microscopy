# Backend API Documentation

## Overview
This is the backend API for the medical application with authentication, user management, and role-based access control.

## Features
- User authentication (signup/login)
- Google OAuth integration
- Role-based access control (Patient/Doctor)
- JWT token authentication
- MongoDB database integration
- Input validation and sanitization
- Security middleware (Helmet, CORS, Rate limiting)

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud)
- Google OAuth credentials

### Installation
1. Install dependencies:
```bash
npm install
```

2. Create environment file:
```bash
cp env.example .env
```

3. Configure environment variables in `.env`:
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/medical_app

# JWT Configuration
JWT_SECRET=your_secure_jwt_secret_here
JWT_EXPIRE=7d

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Session Configuration
SESSION_SECRET=your_session_secret

# Frontend URL for CORS
FRONTEND_URL=http://localhost:5173
```

4. Start the server:
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## API Endpoints

### Authentication Routes

#### POST /api/auth/signup
Register a new user with role selection.

**Request Body:**
```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "patient"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "_id": "user_id",
      "fullName": "John Doe",
      "email": "john@example.com",
      "role": "patient",
      "profilePicture": "",
      "isEmailVerified": false,
      "lastLogin": "2024-01-01T00:00:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "token": "jwt_token_here"
  }
}
```

#### POST /api/auth/login
Authenticate user and get JWT token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "user_id",
      "fullName": "John Doe",
      "email": "john@example.com",
      "role": "patient",
      "profilePicture": "",
      "isEmailVerified": false,
      "lastLogin": "2024-01-01T00:00:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "token": "jwt_token_here"
  }
}
```

#### GET /api/auth/google
Initiate Google OAuth authentication.

#### GET /api/auth/google/callback
Google OAuth callback (handles role selection).

#### POST /api/auth/google/complete
Complete Google OAuth signup by setting user role.

**Request Body:**
```json
{
  "userId": "user_id",
  "role": "doctor"
}
```

#### GET /api/auth/me
Get current user information (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

#### POST /api/auth/logout
Logout user (destroys session).

### User Routes

#### GET /api/users/profile
Get user profile (requires authentication).

#### PUT /api/users/profile
Update user profile (requires authentication).

**Request Body:**
```json
{
  "fullName": "John Smith",
  "profilePicture": "https://example.com/avatar.jpg"
}
```

#### GET /api/users/doctors
Get all active doctors (public endpoint).

#### GET /api/users/patients
Get all active patients (doctor access only).

#### DELETE /api/users/profile
Deactivate user account (requires authentication).

## Authentication

### JWT Token
Include the JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

### Role-Based Access
- **Patient**: Can access patient-specific features
- **Doctor**: Can access doctor-specific features and patient lists

## Error Handling

All API responses follow a consistent format:

**Success Response:**
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Error description",
  "errors": [ ... ] // Validation errors
}
```

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- Input validation and sanitization
- CORS protection
- Rate limiting
- Helmet security headers
- Session management

## Database Schema

### User Model
```javascript
{
  fullName: String (required),
  email: String (required, unique),
  password: String (required for local auth),
  role: String (enum: ['patient', 'doctor'], required),
  googleId: String (unique, sparse),
  googleEmail: String,
  profilePicture: String,
  isEmailVerified: Boolean,
  lastLogin: Date,
  isActive: Boolean,
  timestamps: true
}
```

## Development

### Running Tests
```bash
npm test
```

### Code Linting
```bash
npm run lint
```

### Environment Variables
- Copy `env.example` to `.env`
- Update values according to your setup
- Never commit `.env` file to version control

## Deployment

1. Set `NODE_ENV=production`
2. Use strong, unique secrets for JWT and sessions
3. Enable HTTPS in production
4. Set up proper MongoDB connection with authentication
5. Configure Google OAuth for production domain 