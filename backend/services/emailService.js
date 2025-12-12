import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import pdfService from './pdfService.js';

dotenv.config();

const createTransporter = () => {
  // Validate SMTP configuration
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    throw new Error('SMTP configuration is incomplete. Please check environment variables: SMTP_HOST, SMTP_USER, SMTP_PASSWORD');
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    },
    tls: {
      rejectUnauthorized: false
    },
    pool: true, // Use pooled connections for better performance
    maxConnections: 5,
    maxMessages: 10
  });
};

const getAppointmentConfirmationTemplate = (appointmentData) => {
  const { patient, doctor, date, timeSlot, reason } = appointmentData;
  const appointmentDate = new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return {
    subject: `Your Appointment is Confirmed for ${appointmentDate}`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Confirmed Appointment</title>
        <style>
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            background-color: #e9f7f7;
            margin: 0;
            padding: 20px;
            color: #2c3e50;
          }
          .wrapper {
            max-width: 650px;
            margin: 0 auto;
            background-color: #ffffff;
            border: 1px solid #d1e8e8;
            border-radius: 12px;
            overflow: hidden;
          }
          .top-section {
            background-color: #17a2b8;
            padding: 40px 30px;
            text-align: center;
            color: #ffffff;
          }
          .top-section h2 {
            font-size: 26px;
            margin: 0;
            font-weight: bold;
          }
          .top-section p {
            font-size: 16px;
            margin: 8px 0 0;
            opacity: 0.95;
          }
          .main-body {
            padding: 35px 30px;
          }
          .info-box {
            background-color: #f0f9fa;
            border: 2px dashed #17a2b8;
            padding: 20px;
            margin: 20px 0;
            border-radius: 10px;
          }
          .info-list {
            list-style: none;
            padding: 0;
            margin: 0;
          }
          .info-item {
            display: flex;
            justify-content: space-between;
            padding: 12px 0;
            border-bottom: 1px dashed #d1e8e8;
          }
          .info-item:last-child {
            border-bottom: none;
          }
          .info-key {
            font-weight: bold;
            color: #17a2b8;
            flex-basis: 40%;
          }
          .info-value {
            color: #2c3e50;
            flex-basis: 60%;
            text-align: left;
          }
          .guidelines {
            background-color: #e9f7f7;
            padding: 20px;
            margin: 20px 0;
            border-radius: 10px;
          }
          .guidelines h3 {
            color: #17a2b8;
            font-size: 18px;
            margin: 0 0 12px;
          }
          .guidelines ul {
            padding-left: 25px;
            color: #2c3e50;
          }
          .guidelines li {
            margin-bottom: 10px;
          }
          .support-section {
            background-color: #f0f9fa;
            padding: 20px;
            margin: 20px 0;
            border-radius: 10px;
          }
          .support-section h3 {
            color: #17a2b8;
            font-size: 18px;
            margin: 0 0 12px;
          }
          .bottom {
            background-color: #17a2b8;
            color: #ffffff;
            padding: 25px;
            text-align: center;
            font-size: 13px;
          }
          .bottom p {
            margin: 4px 0;
          }
          .action-button {
            display: inline-block;
            background-color: #ffffff;
            color: #17a2b8;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            margin-top: 15px;
          }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="top-section">
            <h2>Appointment Successfully Confirmed</h2>
            <p>We appreciate your trust in our healthcare services</p>
          </div>

          <div class="main-body">
            <p>Hello <strong>${patient.fullName}</strong>,</p>

            <p>Your upcoming visit has been scheduled. Here are the key details:</p>

            <div class="info-box">
              <ul class="info-list">
                <li class="info-item">
                  <span class="info-key">Physician:</span>
                  <span class="info-value"> Dr. ${doctor.fullName}</span>
                </li>
                <li class="info-item">
                  <span class="info-key">Scheduled Date:</span>
                  <span class="info-value"> ${appointmentDate}</span>
                </li>
                <li class="info-item">
                  <span class="info-key">Time Slot:</span>
                  <span class="info-value"> ${timeSlot.replace('-', ' to ')}</span>
                </li>
                <li class="info-item">
                  <span class="info-key">Purpose:</span>
                  <span class="info-value"> ${reason}</span>
                </li>
              </ul>
            </div>

            <div class="guidelines">
              <h3>Preparation Guidelines</h3>
              <ul>
                <li>Plan to arrive at least 10 minutes prior to your time</li>
                <li>Remember to carry your identification and any health insurance documents</li>
                <li>Prepare any previous medical history or reports</li>
                <li>For changes, notify us 48 hours ahead</li>
                <li>Dress in easy-to-remove attire if needed for checks</li>
              </ul>
            </div>

            <p>Should you require further information, reach out anytime. We're here to help.</p>

            <p>Warm regards,<br>
            <strong>AI Microscopy Staff</strong><br>
            Dedicated to Your Well-being</p>
          </div>

          <div class="bottom">
            <p>&copy; ${new Date().getFullYear()} AI Microscopy. Rights Reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Confirmed Appointment

      Hello ${patient.fullName},

      Your visit details:

      Physician: Dr. ${doctor.fullName}
      Scheduled Date: ${appointmentDate}
      Time Slot: ${timeSlot.replace('-', ' to ')}
      Purpose: ${reason}

      Preparation Guidelines:
      - Arrive 10 minutes prior
      - Carry ID and insurance
      - Prepare medical history
      - Notify 48 hours for changes

      Warm regards,
      AI Microscopy Staff
    `
  };
};

const getAppointmentCancellationTemplate = (appointmentData) => {
  const { patient, doctor, date, timeSlot } = appointmentData;
  const appointmentDate = new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return {
    subject: `Cancellation Notice for ${appointmentDate}`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Cancelled Appointment</title>
        <style>
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            background-color: #f4e9e9;
            margin: 0;
            padding: 20px;
            color: #4a4a4a;
          }
          .wrapper {
            max-width: 650px;
            margin: 0 auto;
            background-color: #ffffff;
            border: 1px solid #e8d1d1;
            border-radius: 12px;
            overflow: hidden;
          }
          .top-section {
            background-color: #dc3545;
            padding: 40px 30px;
            text-align: center;
            color: #ffffff;
          }
          .top-section h2 {
            font-size: 26px;
            margin: 0;
            font-weight: bold;
          }
          .main-body {
            padding: 35px 30px;
          }
          .info-box {
            background-color: #faf0f0;
            border: 2px dashed #dc3545;
            padding: 20px;
            margin: 20px 0;
            border-radius: 10px;
          }
          .bottom {
            background-color: #dc3545;
            color: #ffffff;
            padding: 25px;
            text-align: center;
            font-size: 13px;
          }
          .action-button {
            display: inline-block;
            background-color: #ffffff;
            color: #dc3545;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            margin-top: 15px;
          }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="top-section">
            <h2>Appointment Has Been Cancelled</h2>
          </div>

          <div class="main-body">
            <p>Hello <strong>${patient.fullName}</strong>,</p>

            <p>We regret to inform you that your scheduled visit on <strong>${appointmentDate}</strong> during <strong>${timeSlot.replace('-', ' to ')}</strong> with Dr. ${doctor.fullName} is now cancelled.</p>

            <div class="info-box">
              <p>To book a new slot, please use our online portal.</p>
            </div>

            <p>We apologize for any inconvenience caused.</p>

            <p>Sincerely,<br>
            <strong>AI Microscopy Staff</strong></p>
          </div>

          <div class="bottom">
            <p>&copy; ${new Date().getFullYear()} AI Microscopy. Rights Reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Cancellation Notice

      Hello ${patient.fullName},

      Your visit on ${appointmentDate} during ${timeSlot.replace('-', ' to ')} with Dr. ${doctor.fullName} is cancelled.

      Sincerely,
      AI Microscopy Staff
    `
  };
};

export const sendAppointmentConfirmation = async (appointmentData) => {
  try {
    // Validate required data
    if (!appointmentData.patient || !appointmentData.patient.email) {
      throw new Error('Patient email is required');
    }

    const transporter = createTransporter();

    // Verify transporter connection before sending
    await transporter.verify();
    console.log('SMTP connection verified successfully');

    const template = getAppointmentConfirmationTemplate(appointmentData);

    const mailOptions = {
      from: `"AI Microscopy" <${process.env.SMTP_USER}>`,
      to: appointmentData.patient.email,
      subject: template.subject,
      html: template.html,
      text: template.text
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Appointment confirmation email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending appointment confirmation email:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      command: error.command
    });
    return { success: false, error: error.message, code: error.code };
  }
};

export const sendAppointmentCancellation = async (appointmentData) => {
  try {
    const transporter = createTransporter();
    const template = getAppointmentCancellationTemplate(appointmentData);

    const mailOptions = {
      from: `"AI Microscopy" <${process.env.SMTP_USER}>`,
      to: appointmentData.patient.email,
      subject: template.subject,
      html: template.html,
      text: template.text
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Appointment cancellation email sent:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending appointment cancellation email:', error);
    return { success: false, error: error.message };
  }
};

export const sendAppointmentReminder = async (appointmentData) => {
  try {
    const transporter = createTransporter();
    const { patient, doctor, date, timeSlot } = appointmentData;
    const appointmentDate = new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const mailOptions = {
      from: `"AI Microscopy" <${process.env.SMTP_USER}>`,
      to: patient.email,
      subject: `Reminder: Appointment Tomorrow at ${timeSlot.split('-')[0]}`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Appointment Reminder</title>
          <style>
            body {
              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
              background-color: #fff8e9;
              margin: 0;
              padding: 20px;
              color: #4a4a4a;
            }
            .wrapper {
              max-width: 650px;
              margin: 0 auto;
              background-color: #ffffff;
              border: 1px solid #ffe8d1;
              border-radius: 12px;
              overflow: hidden;
            }
            .top-section {
              background-color: #ffc107;
              padding: 40px 30px;
              text-align: center;
              color: #2c3e50;
            }
            .top-section h2 {
              font-size: 26px;
              margin: 0;
              font-weight: bold;
            }
            .main-body {
              padding: 35px 30px;
            }
            .info-box {
              background-color: #fffdf0;
              border: 2px dashed #ffc107;
              padding: 20px;
              margin: 20px 0;
              border-radius: 10px;
            }
            .info-list {
              list-style: none;
              padding: 0;
              margin: 0;
            }
            .info-item {
              display: flex;
              justify-content: space-between;
              padding: 12px 0;
              border-bottom: 1px dashed #ffe8d1;
            }
            .info-item:last-child {
              border-bottom: none;
            }
            .info-key {
              font-weight: bold;
              color: #ffc107;
              flex-basis: 40%;
            }
            .info-value {
              color: #2c3e50;
              flex-basis: 60%;
              text-align: left;
            }
            .bottom {
              background-color: #ffc107;
              color: #2c3e50;
              padding: 25px;
              text-align: center;
              font-size: 13px;
            }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="top-section">
              <h2>Upcoming Appointment Reminder</h2>
            </div>

            <div class="main-body">
              <p>Hello <strong>${patient.fullName}</strong>,</p>

              <p>Just a quick note about your visit tomorrow:</p>

              <div class="info-box">
                <ul class="info-list">
                  <li class="info-item">
                    <span class="info-key">Physician:</span>
                    <span class="info-value">Dr. ${doctor.fullName}</span>
                  </li>
                  <li class="info-item">
                    <span class="info-key">Date:</span>
                    <span class="info-value">${appointmentDate}</span>
                  </li>
                  <li class="info-item">
                    <span class="info-key">Time:</span>
                    <span class="info-value">${timeSlot.replace('-', ' to ')}</span>
                  </li>
                </ul>
              </div>

              <p>Kindly be on time. For any adjustments, get in touch right away.</p>

              <p>Regards,<br>AI Microscopy Staff</p>
            </div>

            <div class="bottom">
              <p>&copy; ${new Date().getFullYear()} AI Microscopy.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Reminder: Appointment

        Hello ${patient.fullName},

        Visit details:
        Physician: Dr. ${doctor.fullName}
        Date: ${appointmentDate}
        Time: ${timeSlot.replace('-', ' to ')}

        Be on time.

        Regards,
        AI Microscopy Staff
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Appointment reminder email sent:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending appointment reminder email:', error);
    return { success: false, error: error.message };
  }
};

export const testEmailConfiguration = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('Email configuration is valid');
    return { success: true, message: 'Email configuration is valid' };
  } catch (error) {
    console.error('Email configuration test failed:', error);
    return { success: false, error: error.message };
  }
};

const getBloodCountReportTemplate = (reportData) => {
  const { patient, doctor, bloodCounts, imageAnalysis, clinicalNotes, recommendations, generatedAt } = reportData;
  const reportDate = new Date(generatedAt).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const getStatusColor = (status) => {
    switch(status) {
      case 'normal': return '#28a745';
      case 'low': return '#ffc107';
      case 'high': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'normal': return '';
      case 'low': return '↓';
      case 'high': return '↑';
      default: return '•';
    }
  };

  return {
    subject: `Blood Count Analysis Report - ${reportDate}`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Blood Count Report</title>
        <style>
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            background-color: #f8f9fa;
            margin: 0;
            padding: 20px;
            color: #2c3e50;
          }
          .wrapper {
            max-width: 700px;
            margin: 0 auto;
            background-color: #ffffff;
            border: 1px solid #dee2e6;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            background: linear-gradient(135deg, #17a2b8, #138496);
            padding: 30px;
            text-align: center;
            color: #ffffff;
          }
          .header h1 {
            font-size: 28px;
            margin: 0;
            font-weight: bold;
          }
          .header p {
            font-size: 16px;
            margin: 8px 0 0;
            opacity: 0.9;
          }
          .main-content {
            padding: 30px;
          }
          .patient-info {
            background-color: #f8f9fa;
            border-left: 4px solid #17a2b8;
            padding: 20px;
            margin-bottom: 25px;
            border-radius: 0 8px 8px 0;
          }
          .patient-info h3 {
            color: #17a2b8;
            margin: 0 0 15px 0;
            font-size: 18px;
          }
          .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 10px;
          }
          .info-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e9ecef;
          }
          .info-item:last-child {
            border-bottom: none;
          }
          .info-label {
            font-weight: 600;
            color: #495057;
          }
          .info-value {
            color: #212529;
          }
          .results-section {
            margin: 25px 0;
          }
          .results-section h3 {
            color: #17a2b8;
            font-size: 20px;
            margin-bottom: 20px;
            border-bottom: 2px solid #17a2b8;
            padding-bottom: 10px;
          }
          .blood-count-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
          }
          .blood-count-item {
            background-color: #ffffff;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          }
          .count-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
          }
          .count-name {
            font-weight: bold;
            font-size: 16px;
            color: #212529;
          }
          .count-status {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
            color: white;
          }
          .count-value {
            font-size: 24px;
            font-weight: bold;
            margin: 5px 0;
          }
          .count-unit {
            font-size: 14px;
            color: #6c757d;
            margin-left: 5px;
          }
          .count-range {
            font-size: 12px;
            color: #6c757d;
            margin-top: 5px;
          }
          .analysis-section {
            background-color: #e7f3ff;
            border: 1px solid #b8daff;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
          }
          .analysis-section h4 {
            color: #004085;
            margin: 0 0 10px 0;
          }
          .notes-section {
            margin: 20px 0;
          }
          .notes-section h4 {
            color: #17a2b8;
            margin-bottom: 10px;
          }
          .notes-content {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 6px;
            border-left: 4px solid #17a2b8;
            line-height: 1.6;
          }
          .footer {
            background-color: #343a40;
            color: #ffffff;
            padding: 20px;
            text-align: center;
            font-size: 13px;
          }
          .footer p {
            margin: 5px 0;
          }
          .disclaimer {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="header">
            <h1>Blood Count Analysis Report</h1>
            <p>AI-Powered Microscopy Analysis</p>
          </div>

          <div class="main-content">
            <div class="patient-info">
              <h3>Patient Information</h3>
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">Patient Name:</span>
                  <span class="info-value">${patient.fullName}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Report Date:</span>
                  <span class="info-value">${reportDate}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Analyzed by:</span>
                  <span class="info-value">Dr. ${doctor.fullName}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Analysis Confidence:</span>
                  <span class="info-value">${imageAnalysis.confidence}%</span>
                </div>
              </div>
            </div>

            <div class="results-section">
              <h3>Blood Count Results</h3>
              <div class="blood-count-grid">
                <div class="blood-count-item">
                  <div class="count-header">
                    <span class="count-name">Red Blood Cells (RBC)</span>
                    <span class="count-status" style="background-color: ${getStatusColor(bloodCounts.rbc.status)}">
                      ${getStatusIcon(bloodCounts.rbc.status)} ${bloodCounts.rbc.status}
                    </span>
                  </div>
                  <div class="count-value">
                    ${bloodCounts.rbc.value}<span class="count-unit">${bloodCounts.rbc.unit}</span>
                  </div>
                  <div class="count-range">Normal: ${bloodCounts.rbc.normalRange}</div>
                </div>

                <div class="blood-count-item">
                  <div class="count-header">
                    <span class="count-name">White Blood Cells (WBC)</span>
                    <span class="count-status" style="background-color: ${getStatusColor(bloodCounts.wbc.status)}">
                      ${getStatusIcon(bloodCounts.wbc.status)} ${bloodCounts.wbc.status}
                    </span>
                  </div>
                  <div class="count-value">
                    ${bloodCounts.wbc.value}<span class="count-unit">${bloodCounts.wbc.unit}</span>
                  </div>
                  <div class="count-range">Normal: ${bloodCounts.wbc.normalRange}</div>
                </div>

                <div class="blood-count-item">
                  <div class="count-header">
                    <span class="count-name">Platelets</span>
                    <span class="count-status" style="background-color: ${getStatusColor(bloodCounts.platelets.status)}">
                      ${getStatusIcon(bloodCounts.platelets.status)} ${bloodCounts.platelets.status}
                    </span>
                  </div>
                  <div class="count-value">
                    ${bloodCounts.platelets.value}<span class="count-unit">${bloodCounts.platelets.unit}</span>
                  </div>
                  <div class="count-range">Normal: ${bloodCounts.platelets.normalRange}</div>
                </div>


              </div>
            </div>

            ${imageAnalysis.analysisNotes ? `
            <div class="analysis-section">
              <h4>AI Analysis Notes</h4>
              <p>${imageAnalysis.analysisNotes}</p>
              <p><strong>Cells Detected:</strong> ${imageAnalysis.cellsDetected}</p>
            </div>
            ` : ''}

            ${clinicalNotes ? `
            <div class="notes-section">
              <h4>Clinical Notes</h4>
              <div class="notes-content">${clinicalNotes}</div>
            </div>
            ` : ''}

            ${recommendations ? `
            <div class="notes-section">
              <h4>Recommendations</h4>
              <div class="notes-content">${recommendations}</div>
            </div>
            ` : ''}

                         <div style="background-color: #e7f3ff; border: 1px solid #b8daff; color: #004085; padding: 15px; border-radius: 6px; margin: 20px 0; font-size: 14px;">
               <strong>PDF Report Attached:</strong> A detailed PDF report has been attached to this email for your records.
               You can download and save this report for future reference or print it if needed.
             </div>

             <div class="disclaimer">
               <strong>Disclaimer:</strong> This report is generated using AI-powered microscopy analysis.
               Please consult with your healthcare provider for proper interpretation and follow-up care.
               This report should not be used as the sole basis for medical decisions.
             </div>
          </div>

          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} AI Microscopy. All Rights Reserved.</p>
            <p>This is an automated report. Please do not reply to this email.</p>
            <p>For questions, contact: support@aimicroscopy.org</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Blood Count Analysis Report
      Generated: ${reportDate}

      Patient: ${patient.fullName}
      Analyzed by: Dr. ${doctor.fullName}
      Analysis Confidence: ${imageAnalysis.confidence}%

      BLOOD COUNT RESULTS:

      Red Blood Cells (RBC): ${bloodCounts.rbc.value} ${bloodCounts.rbc.unit} [${bloodCounts.rbc.status.toUpperCase()}]
      Normal Range: ${bloodCounts.rbc.normalRange}

      White Blood Cells (WBC): ${bloodCounts.wbc.value} ${bloodCounts.wbc.unit} [${bloodCounts.wbc.status.toUpperCase()}]
      Normal Range: ${bloodCounts.wbc.normalRange}

      Platelets: ${bloodCounts.platelets.value} ${bloodCounts.platelets.unit} [${bloodCounts.platelets.status.toUpperCase()}]
      Normal Range: ${bloodCounts.platelets.normalRange}



      AI ANALYSIS:
      ${imageAnalysis.analysisNotes}
      Cells Detected: ${imageAnalysis.cellsDetected}

      ${clinicalNotes ? `
      CLINICAL NOTES:
      ${clinicalNotes}
      ` : ''}

      ${recommendations ? `
      RECOMMENDATIONS:
      ${recommendations}
      ` : ''}

      DISCLAIMER: This report is generated using AI-powered microscopy analysis.
      Please consult with your healthcare provider for proper interpretation and follow-up care.

      AI Microscopy System
      © ${new Date().getFullYear()} - All Rights Reserved
    `
  };
};

export const sendBloodCountReport = async (reportData) => {
  try {
    const transporter = createTransporter();
    const template = getBloodCountReportTemplate(reportData);

    const pdfBuffer = await pdfService.generateBloodCountReportPDF(reportData);
    const pdfFilename = pdfService.getPDFFilename(reportData);

    const mailOptions = {
      from: `"AI Microscopy" <${process.env.SMTP_USER}>`,
      to: reportData.patient.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
      attachments: [
        {
          filename: pdfFilename,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Blood count report email with PDF sent:', result.messageId);
    return { success: true, messageId: result.messageId, pdfAttached: true };
  } catch (error) {
    console.error('Error sending blood count report email:', error);
    return { success: false, error: error.message };
  }
};

const getMalariaReportTemplate = (reportData) => {
  const { patient, doctor, diagnosis, confidence, imageAnalysis, clinicalNotes, recommendations, generatedAt } = reportData;
  const reportDate = new Date(generatedAt).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const isInfected = diagnosis === 'parasitized';
  const statusText = isInfected ? 'POSITIVE - INFECTED' : 'NEGATIVE - UNINFECTED';
  const statusColor = isInfected ? '#c62828' : '#2e7d32';
  const bgColor = isInfected ? '#ffebee' : '#e8f5e9';

  const parasitizedProb = imageAnalysis?.parasitizedProbability || confidence;
  const uninfectedProb = imageAnalysis?.uninfectedProbability || (100 - confidence);

  return {
    subject: `Malaria Detection Report - ${reportDate}`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Malaria Detection Report</title>
        <style>
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            background-color: #f8f9fa;
            margin: 0;
            padding: 20px;
            color: #2c3e50;
          }
          .wrapper {
            max-width: 700px;
            margin: 0 auto;
            background-color: #ffffff;
            border: 1px solid #dee2e6;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            background: linear-gradient(135deg, #2e7d32, #1b5e20);
            padding: 30px;
            text-align: center;
            color: #ffffff;
          }
          .header h1 {
            font-size: 28px;
            margin: 0;
            font-weight: bold;
          }
          .header p {
            font-size: 16px;
            margin: 8px 0 0;
            opacity: 0.9;
          }
          .main-content {
            padding: 30px;
          }
          .patient-info {
            background-color: #f8f9fa;
            border-left: 4px solid #2e7d32;
            padding: 20px;
            margin-bottom: 25px;
            border-radius: 0 8px 8px 0;
          }
          .patient-info h3 {
            color: #2e7d32;
            margin: 0 0 15px 0;
            font-size: 18px;
          }
          .info-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e9ecef;
          }
          .info-item:last-child {
            border-bottom: none;
          }
          .info-label {
            font-weight: 600;
            color: #495057;
          }
          .info-value {
            color: #212529;
          }
          .result-box {
            background-color: ${bgColor};
            border: 3px solid ${statusColor};
            border-radius: 12px;
            padding: 30px;
            text-align: center;
            margin: 25px 0;
          }
          .result-title {
            font-size: 16px;
            color: #2e7d32;
            margin-bottom: 15px;
            font-weight: bold;
          }
          .result-status {
            font-size: 32px;
            font-weight: bold;
            color: ${statusColor};
            margin: 10px 0;
          }
          .result-details {
            display: flex;
            justify-content: space-around;
            margin-top: 20px;
          }
          .result-detail-item {
            text-align: center;
          }
          .result-detail-label {
            font-size: 12px;
            color: #6c757d;
            text-transform: uppercase;
          }
          .result-detail-value {
            font-size: 20px;
            font-weight: bold;
            color: #212529;
            margin-top: 5px;
          }
          .probability-section {
            margin: 25px 0;
          }
          .probability-section h4 {
            color: #2e7d32;
            margin-bottom: 15px;
          }
          .probability-bar {
            margin: 15px 0;
          }
          .probability-label {
            font-weight: 600;
            margin-bottom: 5px;
            display: flex;
            justify-content: space-between;
          }
          .bar-container {
            background-color: #e9ecef;
            height: 30px;
            border-radius: 15px;
            overflow: hidden;
            position: relative;
          }
          .bar-fill {
            height: 100%;
            display: flex;
            align-items: center;
            padding-left: 10px;
            color: white;
            font-weight: bold;
            font-size: 14px;
          }
          .bar-parasitized {
            background-color: #c62828;
          }
          .bar-uninfected {
            background-color: #2e7d32;
          }
          .notes-section {
            margin: 20px 0;
          }
          .notes-section h4 {
            color: #2e7d32;
            margin-bottom: 10px;
          }
          .notes-content {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 6px;
            border-left: 4px solid #2e7d32;
            line-height: 1.6;
          }
          .recommendations-list {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
          }
          .recommendations-list h4 {
            color: #856404;
            margin-top: 0;
          }
          .recommendations-list ol {
            margin: 10px 0;
            padding-left: 20px;
          }
          .recommendations-list li {
            margin: 8px 0;
            color: #856404;
          }
          .footer {
            background-color: #343a40;
            color: #ffffff;
            padding: 20px;
            text-align: center;
            font-size: 13px;
          }
          .footer p {
            margin: 5px 0;
          }
          .disclaimer {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="header">
            <h1>🦟 Malaria Detection Report</h1>
            <p>AI-Powered Microscopy Analysis</p>
          </div>

          <div class="main-content">
            <div class="patient-info">
              <h3>Patient Information</h3>
              <div class="info-item">
                <span class="info-label">Patient Name:</span>
                <span class="info-value">${patient.fullName}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Report Date:</span>
                <span class="info-value">${reportDate}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Analyzed by:</span>
                <span class="info-value">Dr. ${doctor.fullName}</span>
              </div>
            </div>

            <div class="result-box">
              <div class="result-title">AI-Based Malaria Parasite Detection</div>
              <div class="result-status">${statusText}</div>
              <div class="result-details">
                <div class="result-detail-item">
                  <div class="result-detail-label">Prediction</div>
                  <div class="result-detail-value">${diagnosis.charAt(0).toUpperCase() + diagnosis.slice(1)}</div>
                </div>
                <div class="result-detail-item">
                  <div class="result-detail-label">Confidence</div>
                  <div class="result-detail-value">${confidence.toFixed(2)}%</div>
                </div>
              </div>
            </div>

            <div class="probability-section">
              <h4>Probability Breakdown:</h4>

              <div class="probability-bar">
                <div class="probability-label">
                  <span>Parasitized:</span>
                  <span>${parasitizedProb.toFixed(2)}%</span>
                </div>
                <div class="bar-container">
                  <div class="bar-fill bar-parasitized" style="width: ${parasitizedProb}%">
                    ${parasitizedProb.toFixed(2)}%
                  </div>
                </div>
              </div>

              <div class="probability-bar">
                <div class="probability-label">
                  <span>Uninfected:</span>
                  <span>${uninfectedProb.toFixed(2)}%</span>
                </div>
                <div class="bar-container">
                  <div class="bar-fill bar-uninfected" style="width: ${uninfectedProb}%">
                    ${uninfectedProb.toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>

            ${clinicalNotes ? `
            <div class="notes-section">
              <h4>Clinical Interpretation</h4>
              <div class="notes-content">${clinicalNotes}</div>
            </div>
            ` : ''}

            ${recommendations || isInfected ? `
            <div class="recommendations-list">
              <h4>⚠️ Recommendations</h4>
              <ol>
                ${recommendations ? recommendations.split('\n').filter(line => line.trim()).map(line => `<li>${line.replace(/^\d+\.\s*/, '')}</li>`).join('') : `
                <li>Start antimalarial therapy immediately as per WHO guidelines</li>
                <li>Confirm parasite species through expert microscopy</li>
                <li>Monitor patient response to treatment</li>
                <li>Follow-up blood smear in 24-48 hours</li>
                <li>Consider hospitalization if severe symptoms present</li>
                `}
              </ol>
            </div>
            ` : ''}

            <div style="background-color: #e7f3ff; border: 1px solid #b8daff; color: #004085; padding: 15px; border-radius: 6px; margin: 20px 0; font-size: 14px;">
              <strong>📄 PDF Report Attached:</strong> A detailed PDF report has been attached to this email for your records.
              You can download and save this report for future reference or print it if needed.
            </div>

            <div class="disclaimer">
              <strong>⚕️ Disclaimer:</strong> This report is generated using AI-powered microscopy analysis.
              Please consult with your healthcare provider for proper interpretation and follow-up care.
              This report should not be used as the sole basis for medical decisions. Further microscopic examination
              and species identification should be performed by a qualified parasitologist.
            </div>
          </div>

          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} AI Microscopy. All Rights Reserved.</p>
            <p>This is an automated report. Please do not reply to this email.</p>
            <p>For questions, contact: support@aimicroscopy.org</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Malaria Detection Report
      Generated: ${reportDate}

      Patient: ${patient.fullName}
      Analyzed by: Dr. ${doctor.fullName}

      RESULT: ${statusText}

      Prediction: ${diagnosis.charAt(0).toUpperCase() + diagnosis.slice(1)}
      Confidence: ${confidence.toFixed(2)}%

      PROBABILITY BREAKDOWN:
      Parasitized: ${parasitizedProb.toFixed(2)}%
      Uninfected: ${uninfectedProb.toFixed(2)}%

      ${clinicalNotes ? `
      CLINICAL INTERPRETATION:
      ${clinicalNotes}
      ` : ''}

      ${recommendations ? `
      RECOMMENDATIONS:
      ${recommendations}
      ` : ''}

      DISCLAIMER: This report is generated using AI-powered microscopy analysis.
      Please consult with your healthcare provider for proper interpretation and follow-up care.

      AI Microscopy System
      © ${new Date().getFullYear()} - All Rights Reserved
    `
  };
};

export const sendMalariaReport = async (reportData) => {
  try {
    const transporter = createTransporter();
    const template = getMalariaReportTemplate(reportData);

    const pdfBuffer = await pdfService.generateMalariaReportPDF(reportData);
    const pdfFilename = pdfService.getMalariaReportFilename(reportData);

    const mailOptions = {
      from: `"AI Microscopy" <${process.env.SMTP_USER}>`,
      to: reportData.patient.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
      attachments: [
        {
          filename: pdfFilename,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Malaria report email with PDF sent:', result.messageId);
    return { success: true, messageId: result.messageId, pdfAttached: true };
  } catch (error) {
    console.error('Error sending malaria report email:', error);
    return { success: false, error: error.message };
  }
};

export default {
  sendAppointmentConfirmation,
  sendAppointmentCancellation,
  sendAppointmentReminder,
  sendBloodCountReport,
  sendMalariaReport,
  testEmailConfiguration
};