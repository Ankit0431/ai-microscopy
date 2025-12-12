import { getConfig } from '../config/config.js';

const config = getConfig();
const API_BASE_URL = config.API_BASE_URL;

class AuthService {
  getToken() {
    return localStorage.getItem('token');
  }

  getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  isAuthenticated() {
    const token = this.getToken();
    const user = this.getUser();

    if (!token || !user) {
      console.log('Auth check failed:', { hasToken: !!token, hasUser: !!user });
      return false;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      if (payload.exp && payload.exp < currentTime) {
        console.log('Token expired, clearing auth data');
        this.logout();
        return false;
      }
    } catch (error) {
      console.log('Invalid token, clearing auth data:', error);
      this.logout();
      return false;
    }

    console.log('Auth check passed for user:', user.email, 'role:', user.role);
    return true;
  }

  hasRole(role) {
    const user = this.getUser();
    return user && user.role === role;
  }

  isDoctor() {
    return this.hasRole('doctor');
  }

  isPatient() {
    return this.hasRole('patient');
  }

  async signup(userData) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (data.success) {
        this.setAuthData(data.data.token, data.data.user);
        return { success: true, data: data.data };
      } else {
        return { success: false, message: data.message };
      }
    } catch (error) {
      return { success: false, message: 'Network error. Please try again.' };
    }
  }

  async login(credentials) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (data.success) {
        this.setAuthData(data.data.token, data.data.user);
        return { success: true, data: data.data };
      } else {
        return { success: false, message: data.message };
      }
    } catch (error) {
      return { success: false, message: 'Network error. Please try again.' };
    }
  }

  async completeGoogleSignup(userId, role) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/google/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ userId, role }),
      });

      const data = await response.json();

      if (data.success) {
        this.setAuthData(data.data.token, data.data.user);
        return { success: true, data: data.data };
      } else {
        return { success: false, message: data.message };
      }
    } catch (error) {
      return { success: false, message: 'Network error. Please try again.' };
    }
  }

  async getProfile() {
    try {
      const token = this.getToken();
      if (!token) {
        return { success: false, message: 'No authentication token' };
      }

      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('user', JSON.stringify(data.data.user));
        return { success: true, data: data.data };
      } else {
        return { success: false, message: data.message };
      }
    } catch (error) {
      return { success: false, message: 'Network error. Please try again.' };
    }
  }

  async updateProfile(profileData) {
    try {
      const token = this.getToken();
      if (!token) {
        return { success: false, message: 'No authentication token' };
      }

      const response = await fetch(`${API_BASE_URL}/users/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(profileData),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('user', JSON.stringify(data.data.user));
        return { success: true, data: data.data };
      } else {
        return { success: false, message: data.message };
      }
    } catch (error) {
      return { success: false, message: 'Network error. Please try again.' };
    }
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('authStateChanged'));
    }
  }

  setAuthData(token, user) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  }

  getAuthHeader() {
    const token = this.getToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  redirectByRole() {
    const user = this.getUser();
    if (!user) {
      window.location.href = '/login';
      return;
    }

    if (user.role === 'doctor') {
      window.location.href = '/doctor-dashboard';
    } else if (user.role === 'patient') {
      window.location.href = '/patient-dashboard';
    } else {
      window.location.href = '/';
    }
  }

  requireAuth(requiredRole = null) {
    if (!this.isAuthenticated()) {
      window.location.href = '/login';
      return false;
    }

    if (requiredRole && !this.hasRole(requiredRole)) {
      this.redirectByRole();
      return false;
    }

    return true;
  }

  async refreshUserData() {
    try {
      const result = await this.getProfile();
      if (result.success) {
        this.setAuthData(this.getToken(), result.data.user);
        return result.data.user;
      }
      return null;
    } catch (error) {
      console.error('Error refreshing user data:', error);
      return null;
    }
  }

  init() {
    setInterval(() => {
      if (this.isAuthenticated()) {
        this.isAuthenticated();
      }
    }, 5 * 60 * 1000);
  }

  async getAllPatients() {
    try {
      const token = this.getToken();
      if (!token) {
        return { success: false, message: 'No authentication token' };
      }

      const response = await fetch(`${API_BASE_URL}/users/patients`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        return { success: true, patients: data.data.patients };
      } else {
        return { success: false, message: data.message };
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  }
}

export default new AuthService();
