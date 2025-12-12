import authService from './authService';

const BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/malaria-reports`;

class MalariaReportService {
  async getAuthHeaders() {
    const token = authService.getToken();
    return {
      'Authorization': `Bearer ${token}`
    };
  }

  async getAuthHeadersWithContentType() {
    return {
      ...(await this.getAuthHeaders()),
      'Content-Type': 'application/json'
    };
  }

  async handleResponse(response) {
    // Handle authentication errors
    if (!response.ok && response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      throw new Error('Session expired. Please login again.');
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Request failed');
    }

    return data;
  }

  // Create malaria report from ML analysis
  async createReport(imageFile, patientId, analysis, appointmentId = null) {
    try {
      const formData = new FormData();
      if (imageFile) formData.append('image', imageFile);
      formData.append('patientId', patientId);
      if (appointmentId) formData.append('appointmentId', appointmentId);
      formData.append('analysis', typeof analysis === 'string' ? analysis : JSON.stringify(analysis));

      const response = await fetch(`${BASE_URL}/create`, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
        body: formData
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error creating malaria report:', error);
      throw error;
    }
  }

  // Get all malaria reports for doctor
  async getDoctorReports(params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const url = queryParams ? `${BASE_URL}/doctor?${queryParams}` : `${BASE_URL}/doctor`;

      const response = await fetch(url, {
        method: 'GET',
        headers: await this.getAuthHeadersWithContentType(),
        credentials: 'include'
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error fetching doctor malaria reports:', error);
      throw error;
    }
  }

  // Get all malaria reports for patient
  async getPatientReports(params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const url = queryParams ? `${BASE_URL}/patient?${queryParams}` : `${BASE_URL}/patient`;

      const response = await fetch(url, {
        method: 'GET',
        headers: await this.getAuthHeadersWithContentType()
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error fetching patient malaria reports:', error);
      throw error;
    }
  }

  // Get specific malaria report by ID
  async getReportById(reportId) {
    try {
      const response = await fetch(`${BASE_URL}/${reportId}`, {
        method: 'GET',
        headers: await this.getAuthHeadersWithContentType()
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error fetching malaria report:', error);
      throw error;
    }
  }

  // Update malaria report
  async updateReport(reportId, updates) {
    try {
      const response = await fetch(`${BASE_URL}/${reportId}`, {
        method: 'PUT',
        headers: await this.getAuthHeadersWithContentType(),
        body: JSON.stringify(updates)
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error updating malaria report:', error);
      throw error;
    }
  }

  // Delete malaria report
  async deleteReport(reportId) {
    try {
      const response = await fetch(`${BASE_URL}/${reportId}`, {
        method: 'DELETE',
        headers: await this.getAuthHeadersWithContentType()
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error deleting malaria report:', error);
      throw error;
    }
  }

  // Get malaria report statistics
  async getStats() {
    try {
      const response = await fetch(`${BASE_URL}/stats/overview`, {
        method: 'GET',
        headers: await this.getAuthHeadersWithContentType()
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error fetching malaria report stats:', error);
      throw error;
    }
  }

  // Send malaria report via email
  async sendEmail(reportId) {
    try {
      const response = await fetch(`${BASE_URL}/${reportId}/send-email`, {
        method: 'POST',
        headers: await this.getAuthHeadersWithContentType()
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error sending malaria report email:', error);
      throw error;
    }
  }

  // Download malaria report PDF
  async downloadPDFReport(reportId) {
    try {
      const response = await fetch(`${BASE_URL}/${reportId}/pdf`, {
        method: 'GET',
        headers: await this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to download PDF');
      }

      const contentDisposition = response.headers.get('content-disposition');
      let filename = 'malaria_report.pdf';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      return { success: true };
    } catch (error) {
      console.error('Error downloading malaria PDF report:', error);
      throw error;
    }
  }

  // View malaria report PDF in new window
  async viewPDFReport(reportId) {
    try {
      const url = `${BASE_URL}/${reportId}/pdf`;
      const newWindow = window.open();
      const response = await fetch(url, {
        method: 'GET',
        headers: await this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to view PDF');
      }

      const blob = await response.blob();
      const pdfUrl = window.URL.createObjectURL(blob);

      if (newWindow) {
        newWindow.location.href = pdfUrl;
      } else {
        window.open(pdfUrl, '_blank');
      }

      return { success: true };
    } catch (error) {
      console.error('Error viewing malaria PDF report:', error);
      throw error;
    }
  }
}

const malariaReportService = new MalariaReportService();
export default malariaReportService;
