import { getConfig } from '../config/config.js';

const config = getConfig();
const BASE_URL = `${config.API_BASE_URL}/reports`;

class ReportService {
  async getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`
    };
  }

  async getAuthHeadersWithContentType() {
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

  async analyzeBloodImage(imageFile, patientId, appointmentId = null) {
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('patientId', patientId);
      if (appointmentId) {
        formData.append('appointmentId', appointmentId);
      }

      const response = await fetch(`${BASE_URL}/analyze-blood-image`, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
        body: formData
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error analyzing blood image:', error);
      throw error;
    }
  }

  // Call local BCCD model server directly
  async analyzeWithBCCD(imageFile) {
    const base = 'http://127.0.0.1:5001';
    try {
      // quick health check to provide a clearer error when the service isn't running
      try {
        const health = await fetch(`${base}/health`, { method: 'GET' });
        if (!health.ok) {
          // continue — we'll still try the analyse endpoint but include health status
          console.warn('BCCD health check responded with status', health.status);
        }
      } catch (hErr) {
        throw new Error(`BCCD service not reachable at ${base}. Make sure the model server is running and CORS is enabled. (${hErr.message})`);
      }

      const formData = new FormData();
      formData.append('image', imageFile);

      const response = await fetch(`${base}/analyse-bccd`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        // attempt to parse json error, fall back to text
        let errorMessage = `BCCD server returned ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || JSON.stringify(errorData);
        } catch (parseErr) {
          try {
            const txt = await response.text();
            if (txt) errorMessage = txt;
          } catch (_) {}
        }
        throw new Error(errorMessage + ` (POST ${base}/analyse-bccd)`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error calling BCCD analysis endpoint:', error);
      throw error;
    }
  }

  // Call local Malaria model server directly
  async analyzeWithMalaria(imageFile) {
    const base = 'http://127.0.0.1:5002';
    try {
      // quick health check to provide a clearer error when the service isn't running
      try {
        const health = await fetch(`${base}/health`, { method: 'GET' });
        if (!health.ok) {
          console.warn('Malaria health check responded with status', health.status);
        }
      } catch (hErr) {
        throw new Error(`Malaria service not reachable at ${base}. Make sure the model server is running and CORS is enabled. (${hErr.message})`);
      }

      const formData = new FormData();
      formData.append('image', imageFile);

      const response = await fetch(`${base}/analyse-malaria`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        // attempt to parse json error, fall back to text
        let errorMessage = `Malaria server returned ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || JSON.stringify(errorData);
        } catch (parseErr) {
          try {
            const txt = await response.text();
            if (txt) errorMessage = txt;
          } catch (_) {}
        }
        throw new Error(errorMessage + ` (POST ${base}/analyse-malaria)`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error calling Malaria analysis endpoint:', error);
      throw error;
    }
  }

  async createReportFromBCCD(imageFile, patientId, analysis, appointmentId = null) {
    try {
      const formData = new FormData();
      if (imageFile) formData.append('image', imageFile);
      formData.append('patientId', patientId);
      if (appointmentId) formData.append('appointmentId', appointmentId);
      formData.append('analysis', typeof analysis === 'string' ? analysis : JSON.stringify(analysis));

      const response = await fetch(`${BASE_URL}/from-bccd`, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
        body: formData
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error creating report from BCCD:', error);
      throw error;
    }
  }

  async createReportFromMalaria(imageFile, patientId, analysis, appointmentId = null) {
    try {
      const formData = new FormData();
      if (imageFile) formData.append('image', imageFile);
      formData.append('patientId', patientId);
      if (appointmentId) formData.append('appointmentId', appointmentId);
      formData.append('analysis', typeof analysis === 'string' ? analysis : JSON.stringify(analysis));

      const response = await fetch(`${BASE_URL}/from-malaria`, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
        body: formData
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error creating report from Malaria:', error);
      throw error;
    }
  }

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
      console.error('Error fetching doctor reports:', error);
      throw error;
    }
  }

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
      console.error('Error fetching patient reports:', error);
      throw error;
    }
  }

  async getReport(reportId) {
    try {
      const response = await fetch(`${BASE_URL}/${reportId}`, {
        method: 'GET',
        headers: await this.getAuthHeadersWithContentType()
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error fetching report:', error);
      throw error;
    }
  }

  async updateReport(reportId, updateData) {
    try {
      const response = await fetch(`${BASE_URL}/${reportId}`, {
        method: 'PUT',
        headers: await this.getAuthHeadersWithContentType(),
        body: JSON.stringify(updateData)
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error updating report:', error);
      throw error;
    }
  }

  async sendReportEmail(reportId) {
    try {
      const response = await fetch(`${BASE_URL}/${reportId}/send-email`, {
        method: 'POST',
        headers: await this.getAuthHeadersWithContentType()
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error sending report email:', error);
      throw error;
    }
  }

  async deleteReport(reportId) {
    try {
      const response = await fetch(`${BASE_URL}/${reportId}`, {
        method: 'DELETE',
        headers: await this.getAuthHeadersWithContentType()
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error deleting report:', error);
      throw error;
    }
  }

  getStatusColor(status) {
    switch (status) {
      case 'normal':
        return 'bg-green-600';
      case 'low':
        return 'bg-yellow-600';
      case 'high':
        return 'bg-red-600';
      default:
        return 'bg-gray-600';
    }
  }

  getStatusIcon(status) {
    switch (status) {
      case 'normal':
        return '✓';
      case 'low':
        return '↓';
      case 'high':
        return '↑';
      default:
        return '•';
    }
  }

  getOverallStatusColor(report) {
    const { rbc, wbc, platelets } = report.bloodCounts;
    const abnormalCounts = [rbc.status, wbc.status, platelets.status].filter(
      status => status !== 'normal'
    );

    if (abnormalCounts.length === 0) return 'bg-green-600';
    if (abnormalCounts.length <= 1) return 'bg-yellow-600';
    return 'bg-red-600';
  }

  formatReportDate(dateString) {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'long' });
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day} ${month} ${year}, ${hours}:${minutes}`;
  }

  getFlaggedValues(report) {
    const flagged = [];
    const { rbc, wbc, platelets, hemoglobin, hematocrit } = report.bloodCounts;

    if (rbc.status !== 'normal') {
      flagged.push({ type: 'RBC', value: rbc.value, unit: rbc.unit, status: rbc.status });
    }
    if (wbc.status !== 'normal') {
      flagged.push({ type: 'WBC', value: wbc.value, unit: wbc.unit, status: wbc.status });
    }
    if (platelets.status !== 'normal') {
      flagged.push({ type: 'Platelets', value: platelets.value, unit: platelets.unit, status: platelets.status });
    }
    if (hemoglobin && hemoglobin.status !== 'normal') {
      flagged.push({ type: 'Hemoglobin', value: hemoglobin.value, unit: hemoglobin.unit, status: hemoglobin.status });
    }
    if (hematocrit && hematocrit.status !== 'normal') {
      flagged.push({ type: 'Hematocrit', value: hematocrit.value, unit: hematocrit.unit, status: hematocrit.status });
    }

    return flagged;
  }

  validateImageFile(file) {
    const maxSize = 10 * 1024 * 1024;
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/bmp', 'image/tiff'];

    if (!file) {
      throw new Error('Please select an image file');
    }

    if (file.size > maxSize) {
      throw new Error('Image file size must be less than 10MB');
    }

    if (!allowedTypes.includes(file.type)) {
      throw new Error('Please upload a valid image file (JPEG, PNG, BMP, or TIFF)');
    }

    return true;
  }

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
      let filename = 'blood_count_report.pdf';
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
      console.error('Error downloading PDF report:', error);
      throw error;
    }
  }

  async viewPDFReport(reportId) {
    try {
      const url = `${BASE_URL}/${reportId}/pdf/view`;
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
      console.error('Error viewing PDF report:', error);
      throw error;
    }
  }

  getPDFViewUrl(reportId) {
    const token = localStorage.getItem('token');
    return `${BASE_URL}/${reportId}/pdf/view?token=${encodeURIComponent(token)}`;
  }

  getReportSummary(report) {
    const { rbc, wbc, platelets } = report.bloodCounts;
    return `RBC: ${rbc.value} ${rbc.unit}, WBC: ${wbc.value} ${wbc.unit}, Platelets: ${platelets.value} ${platelets.unit}`;
  }
}

const reportService = new ReportService();
export default reportService;
