export const config = {
  BACKEND_URL: import.meta.env.VITE_BACKEND_URL || 'https://apiproject.mayankjaiswal.in',
  
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'https://apiproject.mayankjaiswal.in/api',
  
  GOOGLE_AUTH_URL: (import.meta.env.VITE_API_BASE_URL || 'https://apiproject.mayankjaiswal.in/api') + '/auth/google',
  GOOGLE_TOKEN_URL: (import.meta.env.VITE_API_BASE_URL || 'https://apiproject.mayankjaiswal.in/api') + '/auth/google/token',
  GOOGLE_COMPLETE_URL: (import.meta.env.VITE_API_BASE_URL || 'https://apiproject.mayankjaiswal.in/api') + '/auth/google/complete',
  
  LOGIN_URL: (import.meta.env.VITE_API_BASE_URL || 'https://apiproject.mayankjaiswal.in/api') + '/auth/login',
  SIGNUP_URL: (import.meta.env.VITE_API_BASE_URL || 'https://apiproject.mayankjaiswal.in/api') + '/auth/signup',
  PROFILE_URL: (import.meta.env.VITE_API_BASE_URL || 'https://apiproject.mayankjaiswal.in/api') + '/auth/me',
  
  USER_PROFILE_URL: (import.meta.env.VITE_API_BASE_URL || 'https://apiproject.mayankjaiswal.in/api') + '/users/profile',
};

export const getConfig = () => {
  if (import.meta.env.DEV) {
    return {
      BACKEND_URL: import.meta.env.VITE_DEV_BACKEND_URL || 'http://localhost:5000',
      API_BASE_URL: import.meta.env.VITE_DEV_API_BASE_URL || 'http://localhost:5000/api',
      GOOGLE_AUTH_URL: (import.meta.env.VITE_DEV_API_BASE_URL || 'http://localhost:5000/api') + '/auth/google',
      GOOGLE_TOKEN_URL: (import.meta.env.VITE_DEV_API_BASE_URL || 'http://localhost:5000/api') + '/auth/google/token',
      GOOGLE_COMPLETE_URL: (import.meta.env.VITE_DEV_API_BASE_URL || 'http://localhost:5000/api') + '/auth/google/complete',
      LOGIN_URL: (import.meta.env.VITE_DEV_API_BASE_URL || 'http://localhost:5000/api') + '/auth/login',
      SIGNUP_URL: (import.meta.env.VITE_DEV_API_BASE_URL || 'http://localhost:5000/api') + '/auth/signup',
      PROFILE_URL: (import.meta.env.VITE_DEV_API_BASE_URL || 'http://localhost:5000/api') + '/auth/me',
      USER_PROFILE_URL: (import.meta.env.VITE_DEV_API_BASE_URL || 'http://localhost:5000/api') + '/users/profile',
    };
  }
  
  return config;
}; 