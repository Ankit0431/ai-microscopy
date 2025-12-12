import { getConfig } from '../config/config.js';

const config = getConfig();
const BASE_URL = `${config.API_BASE_URL}/appointments`;

class AppointmentService {
  async getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  async handleResponse(response) {
    if (!response.ok) {
      // Handle authentication errors
      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        throw new Error('Session expired. Please login again.');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  async getDoctors() {
    try {
      const response = await fetch(`${BASE_URL}/doctors`, {
        method: 'GET',
        headers: await this.getAuthHeaders(),
        credentials: 'include'
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      throw error;
    }
  }

  async getDoctorAvailability(doctorId, date) {
    try {
      const response = await fetch(`${BASE_URL}/doctors/${doctorId}/availability?date=${date}`, {
        method: 'GET',
        headers: await this.getAuthHeaders(),
        credentials: 'include'
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error fetching doctor availability:', error);
      throw error;
    }
  }

  async bookAppointment(appointmentData) {
    try {
      const response = await fetch(`${BASE_URL}/book`, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(appointmentData)
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error booking appointment:', error);
      throw error;
    }
  }

  async getMyAppointments(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          queryParams.append(key, params[key]);
        }
      });

      const response = await fetch(`${BASE_URL}/patient/my-appointments?${queryParams}`, {
        method: 'GET',
        headers: await this.getAuthHeaders(),
        credentials: 'include'
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error fetching patient appointments:', error);
      throw error;
    }
  }

  async getDoctorAppointments(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          queryParams.append(key, params[key]);
        }
      });

      const response = await fetch(`${BASE_URL}/doctor/my-appointments?${queryParams}`, {
        method: 'GET',
        headers: await this.getAuthHeaders(),
        credentials: 'include'
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error fetching doctor appointments:', error);
      throw error;
    }
  }

  async cancelAppointment(appointmentId, reason = '') {
    try {
      const response = await fetch(`${BASE_URL}/${appointmentId}/cancel`, {
        method: 'PATCH',
        headers: await this.getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ reason })
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      throw error;
    }
  }

  async updateAppointment(appointmentId, updateData) {
    try {
      const response = await fetch(`${BASE_URL}/${appointmentId}`, {
        method: 'PATCH',
        headers: await this.getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(updateData)
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error updating appointment:', error);
      throw error;
    }
  }

  formatDate(date) {
    return new Date(date).toISOString().split('T')[0];
  }

  formatDateTime(date) {
    return new Date(date).toISOString();
  }

  formatTimeSlot(timeSlot) {
    return timeSlot.replace('-', ' - ');
  }

  getNext30Days() {
    const days = [];
    const today = new Date();

    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      if (date.getDay() !== 0) {
        const day = date.getDate();
        const month = date.toLocaleDateString('en-US', { month: 'long' });
        const year = date.getFullYear();
        const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });

        days.push({
          date: this.formatDate(date),
          displayDate: `${dayOfWeek}, ${day} ${month} ${year}`,
          dayOfWeek: dayOfWeek.toLowerCase(),
          isToday: this.formatDate(date) === this.formatDate(today),
          isTomorrow: this.formatDate(date) === this.formatDate(new Date(today.getTime() + 24 * 60 * 60 * 1000))
        });
      }
    }

    return days;
  }

  isUpcoming(appointmentDate) {
    return new Date(appointmentDate) > new Date();
  }

  isToday(appointmentDate) {
    const today = new Date();
    const appointment = new Date(appointmentDate);
    return appointment.toDateString() === today.toDateString();
  }

  getStatusColor(status) {
    const colors = {
      scheduled: 'text-blue-400',
      confirmed: 'text-green-400',
      completed: 'text-gray-400',
      cancelled: 'text-red-400',
      'no-show': 'text-orange-400'
    };
    return colors[status] || 'text-gray-400';
  }

  getStatusText(status) {
    const texts = {
      scheduled: 'Scheduled',
      confirmed: 'Confirmed',
      completed: 'Completed',
      cancelled: 'Cancelled',
      'no-show': 'No Show'
    };
    return texts[status] || status;
  }
}

export default new AppointmentService();
