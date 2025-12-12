import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Lenis from "@studio-freight/lenis";
import { io } from "socket.io-client";
import useToast from "../hooks/useToast";
import authService from "../services/authService";
import appointmentService from "../services/appointmentService";
import reportService from "../services/reportService";
import malariaReportService from "../services/malariaReportService";
import { useNavigate } from "react-router-dom";
import { getConfig } from "../config/config.js";

const DoctorDashboard = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const socketRef = useRef(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [appointmentNotes, setAppointmentNotes] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [prescription, setPrescription] = useState('');
  const [appointmentStatus, setAppointmentStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState([]);
  const [showBloodAnalysisModal, setShowBloodAnalysisModal] = useState(false);
  const [showAnalysisTypeModal, setShowAnalysisTypeModal] = useState(false);
  const [selectedAnalysisType, setSelectedAnalysisType] = useState(null); // 'bccd' | 'malaria'
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [selectedPatientForAnalysis, setSelectedPatientForAnalysis] = useState(null);
  const [bccdResult, setBccdResult] = useState(null);
  const [malariaResult, setMalariaResult] = useState(null);
  const [createdReport, setCreatedReport] = useState(null);
  const [reportTypeFilter, setReportTypeFilter] = useState('all'); // 'all' | 'bccd' | 'malaria'
  const [allPatients, setAllPatients] = useState([]);

  useEffect(() => {
    const user = authService.getUser();
    const isAuth = authService.isAuthenticated();

    console.log('DoctorDashboard - Auth check:', { isAuth, user });

    if (!isAuth || !user) {
      toast.error('Please login to access the dashboard');
      navigate('/login');
      return;
    }

    if (user.role !== 'doctor') {
      toast.error('Access denied. Doctor role required.');
      navigate('/');
      return;
    }

    setCurrentUser(user);
    toast.success(`Welcome back, Dr. ${user.fullName || 'Doctor'}!`, 3000);

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smooth: true,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []); // Empty dependency array to run only once on mount

  useEffect(() => {
    if (currentUser) {
      loadAppointments();
      loadTodayAppointments();
      loadReports();

      // Initialize Socket.IO connection
      const appConfig = getConfig();
      const SOCKET_URL = appConfig.BACKEND_URL;
      
      socketRef.current = io(SOCKET_URL, {
        withCredentials: true,
        transports: ['websocket', 'polling']
      });

      // Join doctor's room
      socketRef.current.emit('join-doctor-room', currentUser._id);

      // Listen for new appointment events
      socketRef.current.on('new-appointment', (data) => {
        console.log('New appointment received:', data);
        toast.success(`New appointment booked by ${data.appointment.patient.fullName}!`, 5000);
        
        // Refresh appointments lists
        loadAppointments();
        loadTodayAppointments();
      });

      // Listen for appointment cancellation events
      socketRef.current.on('appointment-cancelled', (data) => {
        console.log('Appointment cancelled:', data);
        const cancelledBy = data.appointment.cancelledBy === 'patient' ? 'Patient' : 'Doctor';
        toast.info(`Appointment with ${data.appointment.patient.fullName} has been cancelled by ${cancelledBy}`, 5000);
        
        // Refresh appointments lists
        loadAppointments();
        loadTodayAppointments();
      });

      socketRef.current.on('connect', () => {
        console.log('✅ Socket connected:', socketRef.current.id);
      });

      socketRef.current.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error);
      });

      // Cleanup on unmount
      return () => {
        if (socketRef.current) {
          socketRef.current.disconnect();
        }
      };
    }
  }, [currentUser]);

  const loadAppointments = async () => {
    try {
      const response = await appointmentService.getDoctorAppointments({ limit: 10 });
      setAppointments(response.appointments || []);
    } catch (error) {
      console.error('Error loading appointments:', error);
      toast.error('Failed to load appointments');
    }
  };

  const loadTodayAppointments = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await appointmentService.getDoctorAppointments({ date: today });
      setTodayAppointments(response.appointments || []);
    } catch (error) {
      console.error('Error loading today\'s appointments:', error);
      toast.error('Failed to load today\'s appointments');
    }
  };

  const loadReports = async () => {
    try {
      // Fetch both blood count reports and malaria reports
      const [bloodReportsResponse, malariaReportsResponse] = await Promise.all([
        reportService.getDoctorReports({ limit: 5 }),
        malariaReportService.getDoctorReports({ limit: 5 })
      ]);

      const bloodReports = (bloodReportsResponse.reports || []).map(report => ({
        ...report,
        reportCategory: 'blood_count'
      }));

      const malariaReports = (malariaReportsResponse.reports || []).map(report => ({
        ...report,
        reportCategory: 'malaria'
      }));

      // Merge and sort by createdAt
      const allReports = [...bloodReports, ...malariaReports].sort((a, b) => {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      // Take only the 5 most recent
      setReports(allReports.slice(0, 5));
    } catch (error) {
      console.error('Error loading reports:', error);
      toast.error('Failed to load reports');
    }
  };

  const loadAllPatients = async () => {
    try {
      const response = await authService.getAllPatients();
      if (response.success) {
        setAllPatients(response.patients || []);
      } else {
        console.error('Failed to load patients:', response.message);
      }
    } catch (error) {
      console.error('Error loading patients:', error);
    }
  };

  const handleAppointmentClick = (appointment) => {
    setSelectedAppointment(appointment);
    setAppointmentNotes(appointment.notes || '');
    setDiagnosis(appointment.diagnosis || '');
    setPrescription(appointment.prescription || '');
    setAppointmentStatus(appointment.status);
    setShowAppointmentModal(true);
  };

  const handleUpdateAppointment = async () => {
    if (!selectedAppointment) return;

    try {
      setLoading(true);
      await appointmentService.updateAppointment(selectedAppointment._id, {
        status: appointmentStatus,
        notes: appointmentNotes,
        diagnosis: diagnosis,
        prescription: prescription
      });

      toast.success('Appointment updated successfully');
      setShowAppointmentModal(false);
      loadAppointments();
      loadTodayAppointments();
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast.error('Failed to update appointment');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAppointment = async (appointmentId) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;

    try {
      await appointmentService.cancelAppointment(appointmentId, 'Cancelled by doctor');
      toast.success('Appointment cancelled successfully');
      loadAppointments();
      loadTodayAppointments();
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast.error('Failed to cancel appointment');
    }
  };

  const resetModal = () => {
    setSelectedAppointment(null);
    setAppointmentNotes('');
    setDiagnosis('');
    setPrescription('');
    setAppointmentStatus('');
  };

  const handleBloodAnalysis = (patient) => {
    // Open analysis type selector first
    setSelectedPatientForAnalysis(patient);
    setSelectedAnalysisType(null);
    setShowAnalysisTypeModal(true);
    // Load all patients for the change patient option
    loadAllPatients();
  };

  const handleSelectAnalysisType = (type) => {
    // type: 'bccd' | 'malaria'
    setSelectedAnalysisType(type);
    setShowAnalysisTypeModal(false);
    setShowBloodAnalysisModal(true);
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      try {
        reportService.validateImageFile(file);
        setSelectedImageFile(file);
      } catch (error) {
        toast.error(error.message);
        event.target.value = '';
      }
    }
  };

  const handleAnalyzeImage = async () => {
    if (!selectedImageFile || !selectedPatientForAnalysis) {
      toast.error('Please select an image and patient');
      return;
    }

    try {
      setAnalysisLoading(true);
      if (selectedAnalysisType === 'bccd') {
        // Call local BCCD model first and show results to doctor
        const bccd = await reportService.analyzeWithBCCD(selectedImageFile);
        setBccdResult(bccd);
        // keep modal open so doctor can review
      } else if (selectedAnalysisType === 'malaria') {
        // Call local Malaria model first and show results to doctor
        const malaria = await reportService.analyzeWithMalaria(selectedImageFile);
        setMalariaResult(malaria);
        // keep modal open so doctor can review
      } else {
        // Default behavior - send to backend analyze which creates a report
        const result = await reportService.analyzeBloodImage(
          selectedImageFile,
          selectedPatientForAnalysis._id
        );

        toast.success('Blood analysis completed successfully!');
        setShowBloodAnalysisModal(false);
        setSelectedImageFile(null);
        setSelectedPatientForAnalysis(null);
        loadReports();
      }
    } catch (error) {
      console.error('Error analyzing blood image:', error);
      toast.error(error.message || 'Failed to analyze blood image');
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleCreateReportFromBCCD = async () => {
    if (!bccdResult || !selectedImageFile || !selectedPatientForAnalysis) {
      toast.error('Missing data to create report');
      return;
    }

    try {
      setAnalysisLoading(true);
      // Upload image + BCCD analysis JSON to backend to create a Report using BCCD data
      const created = await reportService.createReportFromBCCD(
        selectedImageFile,
        selectedPatientForAnalysis._id,
        bccdResult
      );

      // API returns { message, report }
      setCreatedReport(created.report || null);
      toast.success('Report saved successfully');
      // Refresh doctor's report list
      loadReports();
      // Optionally close modal or keep open so doctor can send email
      // We'll keep it open so doctor may click send (Send PDF button appears in report list)
    } catch (error) {
      console.error('Error creating report from BCCD result:', error);
      toast.error(error.message || 'Failed to save report');
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleCreateReportFromMalaria = async () => {
    if (!malariaResult || !selectedImageFile || !selectedPatientForAnalysis) {
      toast.error('Missing data to create report');
      return;
    }

    try {
      setAnalysisLoading(true);
      // Upload image + Malaria analysis JSON to backend to create a MalariaReport
      const created = await malariaReportService.createReport(
        selectedImageFile,
        selectedPatientForAnalysis._id,
        malariaResult
      );

      // API returns { message, report }
      setCreatedReport(created.report || null);
      toast.success('Malaria report saved successfully');
      // Refresh doctor's report list
      loadReports();
    } catch (error) {
      console.error('Error creating report from Malaria result:', error);
      toast.error(error.message || 'Failed to save malaria report');
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleSendReport = async (reportId) => {
    try {
      setLoading(true);
      await reportService.sendReportEmail(reportId);
      toast.success('Report sent to patient successfully!');
      loadReports();
    } catch (error) {
      console.error('Error sending report:', error);
      toast.error(error.message || 'Failed to send report');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMalariaReport = async (reportId) => {
    try {
      setLoading(true);
      const token = authService.getToken();
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/malaria-reports/${reportId}/send-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Malaria report sent to patient successfully!');
        loadReports();
      } else {
        throw new Error(data.message || 'Failed to send malaria report');
      }
    } catch (error) {
      console.error('Error sending malaria report:', error);
      toast.error(error.message || 'Failed to send malaria report');
    } finally {
      setLoading(false);
    }
  };

  const resetBloodAnalysisModal = () => {
    setSelectedImageFile(null);
    setSelectedPatientForAnalysis(null);
    setShowBloodAnalysisModal(false);
    setSelectedAnalysisType(null);
    setBccdResult(null);
    setMalariaResult(null);
    setCreatedReport(null);
  };

  const Card = ({ title, children, className = "" }) => (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className={`bg-[#15151f] rounded-2xl p-6 border border-red-900/40 shadow-lg hover:border-red-600 transition-all ${className}`}
    >
      <h3 className="text-xl font-semibold text-red-400 mb-4">{title}</h3>
      <div className="text-red-100">{children}</div>
    </motion.div>
  );

  const getPatientAge = (dateOfBirth) => {
    if (!dateOfBirth) return 'N/A';
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Format date as "1 November 2025"
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'long' });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-sans overflow-hidden pt-24">
      <header className="bg-[#15151f] border-b border-red-900/40 p-6 flex justify-between items-center rounded-2xl mb-10 mx-6">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600">
          Doctor Dashboard
        </h1>
        <div className="text-right">
          <p className="text-sm text-gray-400">Today's Date</p>
          <p className="text-lg font-medium">{formatDate(new Date())}</p>
        </div>
      </header>

      <main className="container mx-auto px-6 pb-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

        <Card title="Doctor Information">
          <ul className="space-y-2">
            <li><span className="text-red-300">Name:</span> Dr. {currentUser?.fullName || 'Loading...'}</li>
            <li><span className="text-red-300">Specialization:</span> {currentUser?.specialization || 'Not set'}</li>
            <li><span className="text-red-300">ID:</span> D-{currentUser?._id?.slice(-6).toUpperCase() || '------'}</li>
            <li><span className="text-red-300">Experience:</span> {currentUser?.experience || 'Not set'} years</li>
            <li><span className="text-red-300">Max Patients/Slot:</span> {currentUser?.maxPatientsPerSlot || 4}</li>
          </ul>
        </Card>
        <Card title="Today's Appointments" className="md:col-span-2 lg:col-span-2">
          {todayAppointments.length > 0 ? (
            <ul className="space-y-3 max-h-64 overflow-y-auto">
              {todayAppointments.map((appointment) => (
                <li key={appointment._id} className="bg-[#1a1a25] p-3 rounded-lg cursor-pointer hover:bg-[#2a2a35] transition-all"
                    onClick={() => handleAppointmentClick(appointment)}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{appointment.patient.fullName}</p>
                      <p className="text-sm text-gray-400">
                        {appointmentService.formatTimeSlot(appointment.timeSlot)}
                      </p>
                      <span className={`text-xs px-2 py-1 rounded ${appointmentService.getStatusColor(appointment.status)}`}>
                        {appointmentService.getStatusText(appointment.status)}
                      </span>
                    </div>
                    <div className="text-right text-xs text-gray-400">
                      <p>Age: {getPatientAge(appointment.patient.dateOfBirth)}</p>
                      <p>{appointment.patient.bloodGroup || 'N/A'}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400">No appointments scheduled for today</p>
          )}
        </Card>


        <Card title="Recent Medical Reports">
          <div className="mb-4 flex gap-2">
            <button
              onClick={() => setReportTypeFilter('all')}
              className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                reportTypeFilter === 'all'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              All Reports
            </button>
            <button
              onClick={() => setReportTypeFilter('bccd')}
              className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                reportTypeFilter === 'bccd'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              🩸 Blood Count
            </button>
            <button
              onClick={() => setReportTypeFilter('malaria')}
              className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                reportTypeFilter === 'malaria'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              🦟 Malaria
            </button>
          </div>
          {(() => {
            const filteredReports = reportTypeFilter === 'all'
              ? reports
              : reports.filter(r => {
                  if (reportTypeFilter === 'malaria') {
                    return r.reportCategory === 'malaria';
                  } else if (reportTypeFilter === 'bccd') {
                    return r.reportCategory === 'blood_count';
                  }
                  return true;
                });

            return filteredReports.length > 0 ? (
              <ul className="space-y-3 max-h-64 overflow-y-auto">
                {filteredReports.map((report) => (
                  <li key={report._id} className="bg-[#1a1a25] p-3 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium">{report.patient.fullName}</p>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            report.reportCategory === 'malaria' ? 'bg-green-700' : 'bg-red-700'
                          } text-white`}>
                            {report.reportCategory === 'malaria' ? '🦟 Malaria' : '🩸 BCCD'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400">{reportService.formatReportDate(report.createdAt)}</p>
                        <p className="text-xs text-red-300">
                          {report.reportCategory === 'malaria'
                            ? `${report.diagnosis?.toUpperCase() || 'N/A'} (${report.confidence?.toFixed(1) || 0}% confidence)`
                            : reportService.getReportSummary(report)
                          }
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-xs px-2 py-1 rounded ${
                            report.reportCategory === 'malaria'
                              ? (report.diagnosis === 'parasitized' ? 'bg-red-700' : 'bg-green-700')
                              : reportService.getOverallStatusColor(report)
                          } text-white`}>
                            {report.status}
                          </span>
                          {report.emailSent && (
                            <span className="text-xs px-2 py-1 rounded bg-blue-600 text-white">
                              📧 Sent
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={async () => {
                            if (report.reportCategory === 'malaria') {
                              // View malaria PDF with authentication
                              try {
                                const token = authService.getToken();
                                const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/malaria-reports/${report._id}/pdf/view`, {
                                  method: 'GET',
                                  headers: { 'Authorization': `Bearer ${token}` }
                                });

                                if (!response.ok) {
                                  throw new Error('Failed to load PDF');
                                }

                                const blob = await response.blob();
                                const url = window.URL.createObjectURL(blob);
                                window.open(url, '_blank');
                              } catch (error) {
                                console.error('Error viewing malaria PDF:', error);
                                toast.error('Failed to view PDF');
                              }
                            } else {
                              reportService.viewPDFReport(report._id);
                            }
                          }}
                          className="text-xs bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-white"
                        >
                          📄 View PDF
                        </button>
                        <button
                          onClick={async () => {
                            if (report.reportCategory === 'malaria') {
                              // Download malaria PDF
                              try {
                                const token = authService.getToken();
                                const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/malaria-reports/${report._id}/pdf`, {
                                  method: 'GET',
                                  headers: { 'Authorization': `Bearer ${token}` }
                                });

                                if (!response.ok) {
                                  throw new Error('Failed to download PDF');
                                }

                                const blob = await response.blob();
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `Malaria_Report_${report.patient.fullName}_${new Date(report.createdAt).toISOString().split('T')[0]}.pdf`;
                                document.body.appendChild(a);
                                a.click();
                                window.URL.revokeObjectURL(url);
                                document.body.removeChild(a);
                              } catch (error) {
                                console.error('Error downloading malaria PDF:', error);
                                toast.error('Failed to download PDF');
                              }
                            } else {
                              reportService.downloadPDFReport(report._id);
                            }
                          }}
                          className="text-xs bg-purple-600 hover:bg-purple-700 px-2 py-1 rounded text-white"
                        >
                          💾 Download
                        </button>
                        {!report.emailSent && (
                          <button
                            onClick={() => {
                              if (report.reportCategory === 'malaria') {
                                handleSendMalariaReport(report._id);
                              } else {
                                handleSendReport(report._id);
                              }
                            }}
                            disabled={loading}
                            className="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-white disabled:opacity-50"
                          >
                            📧 Send PDF
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-400">
                {reportTypeFilter === 'all'
                  ? 'No blood reports generated yet'
                  : `No ${reportTypeFilter === 'bccd' ? 'BCCD' : 'Malaria'} reports available`}
              </p>
            );
          })()}
        </Card>
        <Card title="Upcoming Appointments" className="md:col-span-2">
          {appointments.length > 0 ? (
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-600">
                    <th className="text-left p-2">Patient</th>
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Time</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.slice(0, 8).map((appointment) => (
                    <tr key={appointment._id} className="border-b border-gray-700 hover:bg-[#1a1a25]">
                      <td className="p-2">{appointment.patient.fullName}</td>
                      <td className="p-2">{formatDate(appointment.date)}</td>
                      <td className="p-2">{appointmentService.formatTimeSlot(appointment.timeSlot)}</td>
                      <td className="p-2">
                        <span className={`text-xs px-2 py-1 rounded ${appointmentService.getStatusColor(appointment.status)}`}>
                          {appointmentService.getStatusText(appointment.status)}
                        </span>
                      </td>
                      <td className="p-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAppointmentClick(appointment);
                          }}
                          className="text-blue-400 hover:text-blue-300 text-xs mr-2"
                        >
                          View
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBloodAnalysis(appointment.patient);
                          }}
                          className="text-green-400 hover:text-green-300 text-xs mr-2"
                        >
                          🩸 Analyze
                        </button>
                        {appointment.status !== 'cancelled' && appointment.status !== 'completed' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelAppointment(appointment._id);
                            }}
                            className="text-red-400 hover:text-red-300 text-xs"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-400">No upcoming appointments</p>
          )}
        </Card>



      </main>


      <AnimatePresence>
        {showAppointmentModal && selectedAppointment && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[#15151f] rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-red-900/40"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-red-400">Appointment Details</h2>
                <button
                  onClick={() => {
                    setShowAppointmentModal(false);
                    resetModal();
                  }}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                <div>
                  <h3 className="text-lg font-semibold text-red-300 mb-4">Patient Information</h3>
                  <div className="bg-[#1a1a25] p-4 rounded-lg space-y-2">
                    <p><span className="text-red-300">Name:</span> {selectedAppointment.patient.fullName}</p>
                    <p><span className="text-red-300">Email:</span> {selectedAppointment.patient.email}</p>
                    {/* <p><span className="text-red-300">Age:</span> {getPatientAge(selectedAppointment.patient.dateOfBirth)}</p>
                    <p><span className="text-red-300">Blood Group:</span> {selectedAppointment.patient.bloodGroup || 'N/A'}</p> */}
                  </div>

                  <h3 className="text-lg font-semibold text-red-300 mb-4 mt-6">Appointment Details</h3>
                  <div className="bg-[#1a1a25] p-4 rounded-lg space-y-2">
                    <p><span className="text-red-300">Date:</span> {formatDate(selectedAppointment.date)}</p>
                    <p><span className="text-red-300">Time:</span> {appointmentService.formatTimeSlot(selectedAppointment.timeSlot)}</p>
                    <p><span className="text-red-300">Reason:</span> {selectedAppointment.reason}</p>
                    <p><span className="text-red-300">Status:</span>
                      <span className={`ml-2 text-xs px-2 py-1 rounded ${appointmentService.getStatusColor(selectedAppointment.status)}`}>
                        {appointmentService.getStatusText(selectedAppointment.status)}
                      </span>
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-red-300 mb-4">Medical Information</h3>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Appointment Status</label>
                    <select
                      value={appointmentStatus}
                      onChange={(e) => setAppointmentStatus(e.target.value)}
                      className="w-full p-3 bg-[#1a1a25] border border-gray-600 rounded-lg focus:border-red-400 focus:outline-none"
                    >
                      <option value="scheduled">Scheduled</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="completed">Completed</option>
                      <option value="no-show">No Show</option>
                    </select>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Diagnosis</label>
                    <textarea
                      value={diagnosis}
                      onChange={(e) => setDiagnosis(e.target.value)}
                      placeholder="Enter diagnosis..."
                      className="w-full p-3 bg-[#1a1a25] border border-gray-600 rounded-lg focus:border-red-400 focus:outline-none resize-none"
                      rows="3"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Prescription</label>
                    <textarea
                      value={prescription}
                      onChange={(e) => setPrescription(e.target.value)}
                      placeholder="Enter prescription details..."
                      className="w-full p-3 bg-[#1a1a25] border border-gray-600 rounded-lg focus:border-red-400 focus:outline-none resize-none"
                      rows="3"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Notes</label>
                    <textarea
                      value={appointmentNotes}
                      onChange={(e) => setAppointmentNotes(e.target.value)}
                      placeholder="Enter additional notes..."
                      className="w-full p-3 bg-[#1a1a25] border border-gray-600 rounded-lg focus:border-red-400 focus:outline-none resize-none"
                      rows="3"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4 mt-6">
                <button
                  onClick={() => {
                    setShowAppointmentModal(false);
                    resetModal();
                  }}
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateAppointment}
                  disabled={loading}
                  className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all"
                >
                  {loading ? 'Updating...' : 'Update Appointment'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAnalysisTypeModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#15151f] rounded-2xl p-8 max-w-lg w-full border border-red-900/40"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-red-400">Select Analysis Type</h2>
                <button
                  onClick={() => {
                    setShowAnalysisTypeModal(false);
                    setSelectedPatientForAnalysis(null);
                  }}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>

              <p className="text-sm text-gray-300 mb-6">Choose the model to use for analyzing the uploaded blood sample.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => handleSelectAnalysisType('bccd')}
                  className="p-4 rounded-lg bg-gradient-to-b from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white text-left"
                >
                  <div className="font-semibold">BCCD Diagnosis</div>
                  <div className="text-xs text-gray-200">Red Blood Cell / WBC / Platelets detection (BCCD model)</div>
                </button>

                <button
                  onClick={() => handleSelectAnalysisType('malaria')}
                  className="p-4 rounded-lg bg-gradient-to-b from-green-700 to-green-600 hover:from-green-600 hover:to-green-500 text-white text-left"
                >
                  <div className="font-semibold">Malaria Diagnosis</div>
                  <div className="text-xs text-gray-200">Malaria parasite detection and parasitemia estimation</div>
                </button>
              </div>

              <div className="flex justify-end gap-4 mt-6">
                <button
                  onClick={() => {
                    setShowAnalysisTypeModal(false);
                    setSelectedPatientForAnalysis(null);
                  }}
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showBloodAnalysisModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[#15151f] rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-red-900/40"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-red-400">🩸 Blood Count Analysis</h2>
                  {selectedAnalysisType && (
                    <div className="text-sm text-gray-300">Mode: {selectedAnalysisType === 'bccd' ? 'BCCD Diagnosis' : 'Malaria Diagnosis'}</div>
                  )}
                </div>
                <button
                  onClick={resetBloodAnalysisModal}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6">
                {!selectedPatientForAnalysis ? (
                  <div>
                    <h3 className="text-lg font-semibold text-red-300 mb-4">Select Patient</h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {allPatients.length > 0 ? (
                        allPatients.map((patient) => (
                          <div
                            key={patient._id}
                            onClick={() => setSelectedPatientForAnalysis(patient)}
                            className="p-3 bg-[#1a1a25] rounded-lg cursor-pointer hover:bg-[#2a2a35] transition-all border border-gray-600 hover:border-red-400"
                          >
                            <p className="font-medium">{patient.fullName}</p>
                            {/* <p className="text-sm text-gray-400">{patient.email || 'No email'}</p> */}
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-400 mx-auto mb-3"></div>
                          <p className="text-gray-400">Loading patients...</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-lg font-semibold text-red-300 mb-2">Selected Patient</h3>
                    <div className="p-3 bg-[#1a1a25] rounded-lg border border-red-400">
                      <p className="font-medium">{selectedPatientForAnalysis.fullName}</p>
                      <p className="text-sm text-gray-400">{selectedPatientForAnalysis.email}</p>
                      <button
                        onClick={() => {
                          setSelectedPatientForAnalysis(null);
                          loadAllPatients(); // Reload patients when changing
                        }}
                        className="text-xs text-red-400 hover:text-red-300 mt-2"
                      >
                        Change Patient
                      </button>
                    </div>
                  </div>
                )}

                {selectedPatientForAnalysis && (
                  <div>
                    <div className="flex justify-end mb-2">
                      <button
                        onClick={() => {
                          // go back to analysis type selector
                          setShowBloodAnalysisModal(false);
                          setShowAnalysisTypeModal(true);
                        }}
                        className="text-xs text-yellow-300 hover:text-yellow-200 mr-2"
                      >
                        ◀ Change Type
                      </button>
                    </div>
                    <h3 className="text-lg font-semibold text-red-300 mb-4">Upload Blood Sample Image</h3>
                    <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-red-400 transition-all">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="blood-image-upload"
                      />
                      <label htmlFor="blood-image-upload" className="cursor-pointer">
                        <div className="space-y-3">
                          {selectedImageFile ? (
                            <>
                              <div className="text-green-400 text-4xl">✓</div>
                              <p className="text-green-400">Image Selected: {selectedImageFile.name}</p>
                              <p className="text-sm text-gray-400">
                                Size: {(selectedImageFile.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </>
                          ) : (
                            <>
                              <div className="text-gray-400 text-4xl">📸</div>
                              <p className="text-gray-300">Click to upload blood sample image</p>
                              <p className="text-sm text-gray-400">
                                Supports JPEG, PNG, BMP, TIFF (Max 10MB)
                              </p>
                            </>
                          )}
                        </div>
                      </label>
                    </div>
                  </div>
                )}

                {selectedImageFile && (
                  <div className="bg-blue-900/20 border border-blue-600/40 rounded-lg p-4">
                    <p className="text-blue-300 text-sm">
                      🤖 AI will analyze this image to detect and count RBC, WBC, and platelets.
                      The process typically takes 1-2 minutes.
                    </p>
                  </div>
                )}
                {bccdResult && selectedAnalysisType === 'bccd' && (
                  <div className="bg-[#0b1220] border border-gray-700 rounded-lg p-4 mt-4">
                    <h4 className="text-red-300 font-semibold mb-2">BCCD Analysis Result</h4>
                    <div className="text-sm text-gray-200 space-y-1">
                      <div>RBC: {bccdResult.counts?.RBC ?? bccdResult.counts?.rbc}</div>
                      <div>WBC: {bccdResult.counts?.WBC ?? bccdResult.counts?.WBC}</div>
                      <div>Platelets: {bccdResult.counts?.Platelets ?? bccdResult.counts?.Platelets}</div>
                      <div>Total Cells: {bccdResult.total_cells}</div>
                    </div>
                    <div className="flex gap-3 mt-3">
                      <button
                        onClick={handleCreateReportFromBCCD}
                        disabled={analysisLoading}
                        className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-800 rounded text-white"
                      >
                        {analysisLoading ? 'Saving...' : 'Save Report'}
                      </button>
                      {createdReport && (
                        <div className="text-sm text-green-300 self-center">Saved: ID {createdReport._id}</div>
                      )}
                    </div>
                  </div>
                )}
                {malariaResult && selectedAnalysisType === 'malaria' && (
                  <div className="bg-[#0b1220] border border-gray-700 rounded-lg p-4 mt-4">
                    <h4 className="text-green-300 font-semibold mb-2">Malaria Analysis Result</h4>
                    <div className="text-sm text-gray-200 space-y-2">
                      <div className="flex justify-between items-center">
                        <span>Prediction:</span>
                        <span className={`font-semibold px-3 py-1 rounded ${malariaResult.is_infected ? 'bg-red-600' : 'bg-green-600'}`}>
                          {malariaResult.prediction}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Confidence:</span>
                        <span className="font-semibold">{malariaResult.confidence}%</span>
                      </div>
                      <div className="border-t border-gray-600 pt-2 mt-2">
                        <div className="font-semibold mb-1">Probabilities:</div>
                        <div className="pl-3 space-y-1">
                          <div className="flex justify-between">
                            <span>Parasitized:</span>
                            <span>{malariaResult.probabilities?.Parasitized}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Uninfected:</span>
                            <span>{malariaResult.probabilities?.Uninfected}%</span>
                          </div>
                        </div>
                      </div>
                      {malariaResult.image_info && (
                        <div className="text-xs text-gray-400 mt-2">
                          Image: {malariaResult.image_info.width}x{malariaResult.image_info.height} ({malariaResult.image_info.mode})
                        </div>
                      )}
                    </div>
                    <div className="flex gap-3 mt-3">
                      <button
                        onClick={handleCreateReportFromMalaria}
                        disabled={analysisLoading}
                        className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-800 rounded text-white"
                      >
                        {analysisLoading ? 'Saving...' : 'Save Report'}
                      </button>
                      {createdReport && (
                        <div className="text-sm text-green-300 self-center">Saved: ID {createdReport._id}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-4 mt-8">
                <button
                  onClick={resetBloodAnalysisModal}
                  disabled={analysisLoading}
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-700 disabled:opacity-50 rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAnalyzeImage}
                  disabled={!selectedImageFile || !selectedPatientForAnalysis || analysisLoading}
                  className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all flex items-center gap-2"
                >
                  {analysisLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Analyzing...
                    </>
                  ) : (
                    '🔬 Start Analysis'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DoctorDashboard;
