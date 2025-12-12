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

const PatientDashboard = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const socketRef = useRef(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [appointmentReason, setAppointmentReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState([]);
  const [malariaReports, setMalariaReports] = useState([]);
  const [activeReportTab, setActiveReportTab] = useState('bccd'); // 'bccd' or 'malaria'
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    const user = authService.getUser();
    const isAuth = authService.isAuthenticated();

    console.log('PatientDashboard - Auth check:', { isAuth, user });

    if (!isAuth || !user) {
      toast.error('Please login to access the dashboard');
      navigate('/login');
      return;
    }

    if (user.role !== 'patient') {
      toast.error('Access denied. Patient role required.');
      navigate('/');
      return;
    }

    setCurrentUser(user);

    toast.success(`Welcome back, ${user.fullName || 'Patient'}!`, 3000);


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
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadAppointments();
      loadDoctors();
      loadReports();

      // Initialize Socket.IO connection
      const appConfig = getConfig();
      const SOCKET_URL = appConfig.BACKEND_URL;
      
      socketRef.current = io(SOCKET_URL, {
        withCredentials: true,
        transports: ['websocket', 'polling']
      });

      // Join patient's room
      socketRef.current.emit('join-patient-room', currentUser._id);

      // Listen for appointment cancellation events
      socketRef.current.on('appointment-cancelled', (data) => {
        console.log('Appointment cancelled:', data);
        const cancelledBy = data.appointment.cancelledBy === 'doctor' ? 'Doctor' : 'Patient';
        toast.info(`Your appointment with Dr. ${data.appointment.doctor.fullName} has been cancelled by ${cancelledBy}`, 5000);
        
        // Refresh appointments list
        loadAppointments();
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
      const response = await appointmentService.getMyAppointments({ upcoming: 'true', limit: 5 });
      setAppointments(response.appointments || []);
    } catch (error) {
      console.error('Error loading appointments:', error);
      toast.error('Failed to load appointments');
    }
  };

  const loadDoctors = async () => {
    try {
      const response = await appointmentService.getDoctors();
      setDoctors(response.doctors || []);
    } catch (error) {
      console.error('Error loading doctors:', error);
      toast.error('Failed to load doctors');
    }
  };

  const loadReports = async () => {
    try {
      const [bccdResponse, malariaResponse] = await Promise.all([
        reportService.getPatientReports({ limit: 10 }),
        malariaReportService.getPatientReports({ limit: 10 })
      ]);
      setReports(bccdResponse.reports || []);
      setMalariaReports(malariaResponse.reports || []);
    } catch (error) {
      console.error('Error loading reports:', error);
      toast.error('Failed to load reports');
    }
  };

  const handleDoctorSelect = async (doctor) => {
    setSelectedDoctor(doctor);
    setAvailableSlots([]);
    setSelectedSlot('');

    if (selectedDate) {
      await loadAvailableSlots(doctor._id, selectedDate);
    }
  };

  const handleDateSelect = async (date) => {
    setSelectedDate(date);
    setAvailableSlots([]);
    setSelectedSlot('');

    if (selectedDoctor) {
      await loadAvailableSlots(selectedDoctor._id, date);
    }
  };

  const loadAvailableSlots = async (doctorId, date) => {
    try {
      setLoading(true);
      const response = await appointmentService.getDoctorAvailability(doctorId, date);
      setAvailableSlots(response.availableSlots || []);
    } catch (error) {
      console.error('Error loading available slots:', error);
      toast.error('Failed to load available slots');
    } finally {
      setLoading(false);
    }
  };

  const handleBookAppointment = async () => {
    if (!selectedDoctor || !selectedDate || !selectedSlot || !appointmentReason.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (appointmentReason.length < 10) {
      toast.error('Reason must be at least 10 characters long');
      return;
    }

    try {
      setLoading(true);
      await appointmentService.bookAppointment({
        doctorId: selectedDoctor._id,
        date: selectedDate,
        timeSlot: selectedSlot,
        reason: appointmentReason
      });

      toast.success('Appointment booked successfully! Confirmation email sent.');
      setShowBookingModal(false);
      resetBookingForm();
      loadAppointments();
    } catch (error) {
      console.error('Error booking appointment:', error);
      toast.error(error.message || 'Failed to book appointment');
    } finally {
      setLoading(false);
    }
  };

  const resetBookingForm = () => {
    setSelectedDoctor(null);
    setSelectedDate('');
    setAvailableSlots([]);
    setSelectedSlot('');
    setAppointmentReason('');
  };

  const handleCancelAppointment = async (appointmentId) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;

    try {
      await appointmentService.cancelAppointment(appointmentId, 'Cancelled by patient');
      toast.success('Appointment cancelled successfully');
      loadAppointments();
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast.error('Failed to cancel appointment');
    }
  };

  const handleViewReport = async (reportId) => {
    try {
      const response = await reportService.getReport(reportId);
      setSelectedReport(response.report);
      setShowReportModal(true);
    } catch (error) {
      console.error('Error loading report:', error);
      toast.error('Failed to load report details');
    }
  };

  const handleViewMalariaReport = async (reportId) => {
    try {
      const response = await malariaReportService.getReportById(reportId);
      setSelectedReport(response.report);
      setShowReportModal(true);
    } catch (error) {
      console.error('Error loading malaria report:', error);
      toast.error('Failed to load malaria report details');
    }
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

  // Format date as "1 November 2025"
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'long' });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const availableDates = appointmentService.getNext30Days();

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-sans overflow-hidden pt-24">

      <header className="bg-[#15151f] border-b border-red-900/40 p-6 flex justify-between items-center rounded-2xl mb-10 mx-6">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600">
          Patient Dashboard
        </h1>
        <button
          onClick={() => setShowBookingModal(true)}
          className="bg-gradient-to-r from-red-600 to-red-800 px-6 py-3 rounded-lg shadow hover:shadow-lg font-medium transition-all"
        >
          Book Appointment
        </button>
      </header>


      <main className="container mx-auto px-6 pb-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">


        <Card title="Patient Information">
          <ul className="space-y-2">
            <li><span className="text-red-300">Name:</span> {currentUser?.fullName || 'Loading...'}</li>
            <li><span className="text-red-300">Email:</span> {currentUser?.email || 'Loading...'}</li>
            <li><span className="text-red-300">ID:</span> P-{currentUser?._id?.slice(-6).toUpperCase() || '------'}</li>
            <li><span className="text-red-300">Blood Group:</span> {currentUser?.bloodGroup || 'Not set'}</li>
          </ul>
        </Card>


        <Card title="Upcoming Appointments" className="md:col-span-2 lg:col-span-1">
          {appointments.length > 0 ? (
            <ul className="space-y-3 max-h-64 overflow-y-auto">
              {appointments.map((appointment) => (
                <li key={appointment._id} className="bg-[#1a1a25] p-3 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">Dr. {appointment.doctor.fullName}</p>
                      <p className="text-sm text-red-300">{appointment.doctor.specialization}</p>
                      <p className="text-sm text-gray-400">
                        {formatDate(appointment.date)} at {appointmentService.formatTimeSlot(appointment.timeSlot)}
                      </p>
                      <span className={`text-xs px-2 py-1 rounded ${appointmentService.getStatusColor(appointment.status)}`}>
                        {appointmentService.getStatusText(appointment.status)}
                      </span>
                    </div>
                    {appointment.status === 'scheduled' && (
                      <button
                        onClick={() => handleCancelAppointment(appointment._id)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400">No upcoming appointments</p>
          )}
        </Card>


        <Card title="Quick Actions">
          <div className="space-y-3">
            <button
              onClick={() => setShowBookingModal(true)}
              className="w-full bg-gradient-to-r from-red-600 to-red-800 px-4 py-3 rounded-lg shadow hover:shadow-lg font-medium transition-all"
            >
              Book New Appointment
            </button>
            <button
              onClick={() => {
                if (reports.length > 0) {
                  handleViewReport(reports[0]._id);
                } else if (malariaReports.length > 0) {
                  handleViewMalariaReport(malariaReports[0]._id);
                }
              }}
              disabled={reports.length === 0 && malariaReports.length === 0}
              className="w-full bg-[#1a1a25] px-4 py-3 rounded-lg hover:bg-[#2a2a35] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              View Latest Report
            </button>
            <button className="w-full bg-[#1a1a25] px-4 py-3 rounded-lg hover:bg-[#2a2a35] transition-all">
              Prescription History
            </button>
          </div>
        </Card>


        {/* Medical Reports with Tabs */}
        <Card title="Medical Reports" className="md:col-span-3 lg:col-span-3">
          {/* Tab Buttons */}
          <div className="flex gap-2 mb-4 border-b border-gray-700 pb-2">
            <button
              onClick={() => setActiveReportTab('bccd')}
              className={`px-4 py-2 rounded-t-lg transition-all ${
                activeReportTab === 'bccd'
                  ? 'bg-red-600 text-white'
                  : 'bg-[#1a1a25] text-gray-400 hover:text-white'
              }`}
            >
              🩸 Blood Count ({reports.length})
            </button>
            <button
              onClick={() => setActiveReportTab('malaria')}
              className={`px-4 py-2 rounded-t-lg transition-all ${
                activeReportTab === 'malaria'
                  ? 'bg-green-600 text-white'
                  : 'bg-[#1a1a25] text-gray-400 hover:text-white'
              }`}
            >
              🦠 Malaria ({malariaReports.length})
            </button>
          </div>

          {/* BCCD Reports Tab */}
          {activeReportTab === 'bccd' && (
            reports.length > 0 ? (
              <ul className="space-y-3 max-h-64 overflow-y-auto">
                {reports.map((report) => (
                  <li key={report._id} className="bg-[#1a1a25] p-3 rounded-lg cursor-pointer hover:bg-[#2a2a35] transition-all"
                      onClick={() => handleViewReport(report._id)}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium">Dr. {report.doctor.fullName}</p>
                        <p className="text-sm text-gray-400">{reportService.formatReportDate(report.createdAt)}</p>
                        <p className="text-xs text-red-300">{reportService.getReportSummary(report)}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-xs px-2 py-1 rounded ${reportService.getOverallStatusColor(report)} text-white`}>
                            {report.getFlaggedValues?.length > 0 ? 'Abnormal Values' : 'Normal'}
                          </span>
                          <span className="text-xs px-2 py-1 rounded bg-gray-600 text-white">
                            {report.reportType.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="text-right text-xs space-y-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            reportService.viewPDFReport(report._id);
                          }}
                          className="block bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-white"
                        >
                          View PDF
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            reportService.downloadPDFReport(report._id);
                          }}
                          className="block bg-purple-600 hover:bg-purple-700 px-2 py-1 rounded text-white"
                        >
                          Download
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-400">No blood count reports available</p>
            )
          )}

          {/* Malaria Reports Tab */}
          {activeReportTab === 'malaria' && (
            malariaReports.length > 0 ? (
              <ul className="space-y-3 max-h-64 overflow-y-auto">
                {malariaReports.map((report) => (
                  <li key={report._id} className="bg-[#1a1a25] p-3 rounded-lg cursor-pointer hover:bg-[#2a2a35] transition-all"
                      onClick={() => handleViewMalariaReport(report._id)}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium">Dr. {report.doctor.fullName}</p>
                        <p className="text-sm text-gray-400">{formatDate(report.createdAt)}</p>
                        <p className="text-xs text-green-300">
                          {report.diagnosis === 'parasitized' ? '⚠️ Parasitized' : '✅ Uninfected'} - {report.confidence.toFixed(1)}% confidence
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-xs px-2 py-1 rounded text-white ${
                            report.diagnosis === 'parasitized' ? 'bg-red-600' :
                            report.diagnosis === 'uninfected' ? 'bg-green-600' : 'bg-yellow-600'
                          }`}>
                            {report.diagnosis.toUpperCase()}
                          </span>
                          <span className="text-xs px-2 py-1 rounded bg-green-900 text-white">
                            MALARIA TEST
                          </span>
                        </div>
                      </div>
                      <div className="text-right text-xs space-y-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            malariaReportService.viewPDFReport(report._id);
                          }}
                          className="block bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-white"
                        >
                          View PDF
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            malariaReportService.downloadPDFReport(report._id);
                          }}
                          className="block bg-purple-600 hover:bg-purple-700 px-2 py-1 rounded text-white"
                        >
                          Download
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-400">No malaria reports available</p>
            )
          )}
        </Card>


      </main>


      <AnimatePresence>
        {showBookingModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[#15151f] rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-red-900/40"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-red-400">Book Appointment</h2>
                <button
                  onClick={() => setShowBookingModal(false)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                <div>
                  <h3 className="text-lg font-semibold text-red-300 mb-4">Select Doctor</h3>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {doctors.map((doctor) => (
                      <div
                        key={doctor._id}
                        onClick={() => handleDoctorSelect(doctor)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          selectedDoctor?._id === doctor._id
                            ? 'border-red-500 bg-red-900/20'
                            : 'border-gray-600 bg-[#1a1a25] hover:border-red-400'
                        }`}
                      >

                        <h4 className="font-medium">Dr. {doctor.fullName}</h4>
                        {/* <p className="text-sm text-red-300">{doctor.specialization}</p>
                        <p className="text-xs text-gray-400">{doctor.experience} years experience</p> */}
                      </div>
                    ))}
                  </div>
                </div>


                <div>
                  <h3 className="text-lg font-semibold text-red-300 mb-4">Select Date & Time</h3>


                  <div className="mb-4">
                    {/* <label className="block text-sm font-medium text-gray-300 mb-2">Date</label> */}
                    <select
                      value={selectedDate}
                      onChange={(e) => handleDateSelect(e.target.value)}
                      className="w-full p-3 bg-[#1a1a25] border border-gray-600 rounded-lg focus:border-red-400 focus:outline-none"
                      disabled={!selectedDoctor}
                    >
                      <option value="">Select a date</option>
                      {availableDates.map((day) => (
                        <option key={day.date} value={day.date}>
                          {day.displayDate} {day.isToday && '(Today)'} {day.isTomorrow && '(Tomorrow)'}
                        </option>
                      ))}
                    </select>
                  </div>


                  {availableSlots.length > 0 && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-300 mb-2">Available Time Slots</label>
                      <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                        {availableSlots.map((slot) => (
                          <button
                            key={slot.timeSlot}
                            onClick={() => setSelectedSlot(slot.timeSlot)}
                            className={`p-2 rounded text-sm transition-all ${
                              selectedSlot === slot.timeSlot
                                ? 'bg-red-600 text-white'
                                : 'bg-[#1a1a25] border border-gray-600 hover:border-red-400'
                            }`}
                          >
                            {slot.formattedTime}
                            <br />
                            <span className="text-xs text-gray-400">
                              {slot.availableSpots}/{slot.totalSpots} spots
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {loading && (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-400 mx-auto"></div>
                      <p className="text-sm text-gray-400 mt-2">Loading slots...</p>
                    </div>
                  )}
                </div>
              </div>


              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">Reason for Visit</label>
                <textarea
                  value={appointmentReason}
                  onChange={(e) => setAppointmentReason(e.target.value)}
                  placeholder="Please describe your symptoms or reason for the appointment (minimum 10 characters)"
                  className="w-full p-3 bg-[#1a1a25] border border-gray-600 rounded-lg focus:border-red-400 focus:outline-none resize-none"
                  rows="3"
                />
                <p className="text-xs text-gray-400 mt-1">{appointmentReason.length}/500 characters</p>
              </div>


              <div className="flex justify-end gap-4 mt-6">
                <button
                  onClick={() => setShowBookingModal(false)}
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBookAppointment}
                  disabled={loading || !selectedDoctor || !selectedDate || !selectedSlot || !appointmentReason.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all"
                >
                  {loading ? 'Booking...' : 'Book Appointment'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      <AnimatePresence>
        {showReportModal && selectedReport && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[#15151f] rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-red-900/40"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-red-400">
                  {selectedReport.diagnosis ? '� Malaria Report' : '�🩸 Blood Count Report'}
                </h2>
                <button
                  onClick={() => {
                    setShowReportModal(false);
                    setSelectedReport(null);
                  }}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Malaria Report Content */}
              {selectedReport.diagnosis && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-lg font-semibold text-green-300 mb-4">Report Information</h3>
                    <div className="bg-[#1a1a25] p-4 rounded-lg space-y-2">
                      <p><span className="text-green-300">Doctor:</span> Dr. {selectedReport.doctor.fullName}</p>
                      <p><span className="text-green-300">Date:</span> {formatDate(selectedReport.createdAt)}</p>
                      <p><span className="text-green-300">Type:</span> MALARIA TEST</p>
                      <p><span className="text-green-300">Confidence:</span> {selectedReport.confidence.toFixed(1)}%</p>
                    </div>

                    {selectedReport.clinicalNotes && (
                      <>
                        <h3 className="text-lg font-semibold text-green-300 mb-4 mt-6">Clinical Notes</h3>
                        <div className="bg-[#1a1a25] p-4 rounded-lg">
                          <p>{selectedReport.clinicalNotes}</p>
                        </div>
                      </>
                    )}

                    {selectedReport.recommendations && (
                      <>
                        <h3 className="text-lg font-semibold text-green-300 mb-4 mt-6">Recommendations</h3>
                        <div className="bg-[#1a1a25] p-4 rounded-lg">
                          <p>{selectedReport.recommendations}</p>
                        </div>
                      </>
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-green-300 mb-4">Test Results</h3>

                    <div className={`p-6 rounded-lg mb-4 ${
                      selectedReport.diagnosis === 'parasitized' ? 'bg-red-900/20 border border-red-600' :
                      selectedReport.diagnosis === 'uninfected' ? 'bg-green-900/20 border border-green-600' :
                      'bg-yellow-900/20 border border-yellow-600'
                    }`}>
                      <div className="text-center mb-4">
                        <div className={`text-4xl font-bold ${
                          selectedReport.diagnosis === 'parasitized' ? 'text-red-400' :
                          selectedReport.diagnosis === 'uninfected' ? 'text-green-400' :
                          'text-yellow-400'
                        }`}>
                          {selectedReport.diagnosis === 'parasitized' ? '⚠️ POSITIVE' :
                           selectedReport.diagnosis === 'uninfected' ? '✅ NEGATIVE' :
                           '⚠️ INCONCLUSIVE'}
                        </div>
                        <p className="text-lg mt-2">{selectedReport.diagnosis.toUpperCase()}</p>
                      </div>

                      {selectedReport.imageAnalysis?.parasitizedProbability !== undefined && (
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Parasitized</span>
                              <span className="font-bold">{selectedReport.imageAnalysis.parasitizedProbability.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-3">
                              <div
                                className="bg-red-500 h-3 rounded-full transition-all"
                                style={{ width: `${selectedReport.imageAnalysis.parasitizedProbability}%` }}
                              ></div>
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Uninfected</span>
                              <span className="font-bold">{selectedReport.imageAnalysis.uninfectedProbability.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-3">
                              <div
                                className="bg-green-500 h-3 rounded-full transition-all"
                                style={{ width: `${selectedReport.imageAnalysis.uninfectedProbability}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Blood Count Report Content */}
              {!selectedReport.diagnosis && selectedReport.bloodCounts && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold text-red-300 mb-4">Report Information</h3>
                  <div className="bg-[#1a1a25] p-4 rounded-lg space-y-2">
                    <p><span className="text-red-300">Doctor:</span> Dr. {selectedReport.doctor.fullName}</p>
                    <p><span className="text-red-300">Date:</span> {reportService.formatReportDate(selectedReport.createdAt)}</p>
                    <p><span className="text-red-300">Type:</span> {selectedReport.reportType.replace('_', ' ').toUpperCase()}</p>
                    <p><span className="text-red-300">Confidence:</span> {selectedReport.imageAnalysis.confidence}%</p>
                  </div>


                  <h3 className="text-lg font-semibold text-red-300 mb-4 mt-6">AI Analysis</h3>
                  <div className="bg-[#1a1a25] p-4 rounded-lg space-y-2">
                    <p><span className="text-red-300">Cells Detected:</span> {selectedReport.imageAnalysis.cellsDetected}</p>
                    <p><span className="text-red-300">Notes:</span> {selectedReport.imageAnalysis.analysisNotes}</p>
                  </div>


                  {selectedReport.clinicalNotes && (
                    <>
                      <h3 className="text-lg font-semibold text-red-300 mb-4 mt-6">Clinical Notes</h3>
                      <div className="bg-[#1a1a25] p-4 rounded-lg">
                        <p>{selectedReport.clinicalNotes}</p>
                      </div>
                    </>
                  )}


                  {selectedReport.recommendations && (
                    <>
                      <h3 className="text-lg font-semibold text-red-300 mb-4 mt-6">Recommendations</h3>
                      <div className="bg-[#1a1a25] p-4 rounded-lg">
                        <p>{selectedReport.recommendations}</p>
                      </div>
                    </>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-red-300 mb-4">Blood Count Results</h3>

                  <div className="space-y-4">

                    <div className="bg-[#1a1a25] p-4 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">Red Blood Cells (RBC)</span>
                        <span className={`text-xs px-2 py-1 rounded ${reportService.getStatusColor(selectedReport.bloodCounts.rbc.status)} text-white`}>
                          {reportService.getStatusIcon(selectedReport.bloodCounts.rbc.status)} {selectedReport.bloodCounts.rbc.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-2xl font-bold">{selectedReport.bloodCounts.rbc.value} <span className="text-sm text-gray-400">{selectedReport.bloodCounts.rbc.unit}</span></p>
                      <p className="text-xs text-gray-400">Normal: {selectedReport.bloodCounts.rbc.normalRange}</p>
                    </div>

                    <div className="bg-[#1a1a25] p-4 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">White Blood Cells (WBC)</span>
                        <span className={`text-xs px-2 py-1 rounded ${reportService.getStatusColor(selectedReport.bloodCounts.wbc.status)} text-white`}>
                          {reportService.getStatusIcon(selectedReport.bloodCounts.wbc.status)} {selectedReport.bloodCounts.wbc.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-2xl font-bold">{selectedReport.bloodCounts.wbc.value} <span className="text-sm text-gray-400">{selectedReport.bloodCounts.wbc.unit}</span></p>
                      <p className="text-xs text-gray-400">Normal: {selectedReport.bloodCounts.wbc.normalRange}</p>
                    </div>


                    <div className="bg-[#1a1a25] p-4 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">Platelets</span>
                        <span className={`text-xs px-2 py-1 rounded ${reportService.getStatusColor(selectedReport.bloodCounts.platelets.status)} text-white`}>
                          {reportService.getStatusIcon(selectedReport.bloodCounts.platelets.status)} {selectedReport.bloodCounts.platelets.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-2xl font-bold">{selectedReport.bloodCounts.platelets.value} <span className="text-sm text-gray-400">{selectedReport.bloodCounts.platelets.unit}</span></p>
                      <p className="text-xs text-gray-400">Normal: {selectedReport.bloodCounts.platelets.normalRange}</p>
                    </div>


                    {selectedReport.bloodCounts.hemoglobin && selectedReport.bloodCounts.hemoglobin.value && (
                      <div className="bg-[#1a1a25] p-4 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium">Hemoglobin</span>
                          <span className={`text-xs px-2 py-1 rounded ${reportService.getStatusColor(selectedReport.bloodCounts.hemoglobin.status)} text-white`}>
                            {reportService.getStatusIcon(selectedReport.bloodCounts.hemoglobin.status)} {selectedReport.bloodCounts.hemoglobin.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-2xl font-bold">{selectedReport.bloodCounts.hemoglobin.value} <span className="text-sm text-gray-400">{selectedReport.bloodCounts.hemoglobin.unit}</span></p>
                        <p className="text-xs text-gray-400">Normal: {selectedReport.bloodCounts.hemoglobin.normalRange}</p>
                      </div>
                    )}


                    {selectedReport.bloodCounts.hematocrit && selectedReport.bloodCounts.hematocrit.value && (
                      <div className="bg-[#1a1a25] p-4 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium">Hematocrit</span>
                          <span className={`text-xs px-2 py-1 rounded ${reportService.getStatusColor(selectedReport.bloodCounts.hematocrit.status)} text-white`}>
                            {reportService.getStatusIcon(selectedReport.bloodCounts.hematocrit.status)} {selectedReport.bloodCounts.hematocrit.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-2xl font-bold">{selectedReport.bloodCounts.hematocrit.value} <span className="text-sm text-gray-400">{selectedReport.bloodCounts.hematocrit.unit}</span></p>
                        <p className="text-xs text-gray-400">Normal: {selectedReport.bloodCounts.hematocrit.normalRange}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              )}


              <div className="mt-6 bg-yellow-900/20 border border-yellow-600/40 rounded-lg p-4">
                <p className="text-yellow-300 text-sm">
                  <strong>Disclaimer:</strong> This report is generated using AI-powered microscopy analysis.
                  Please consult with your healthcare provider for proper interpretation and follow-up care.
                  This report should not be used as the sole basis for medical decisions.
                </p>
              </div>


              <div className="flex justify-end gap-4 mt-6">
                {selectedReport.diagnosis ? (
                  <>
                    <button
                      onClick={() => malariaReportService.downloadPDFReport(selectedReport._id)}
                      className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-all"
                    >
                      💾 Download PDF
                    </button>
                    <button
                      onClick={() => malariaReportService.viewPDFReport(selectedReport._id)}
                      className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg transition-all"
                    >
                      📄 View PDF
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => reportService.downloadPDFReport(selectedReport._id)}
                      className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-all"
                    >
                      💾 Download PDF
                    </button>
                    <button
                      onClick={() => reportService.viewPDFReport(selectedReport._id)}
                      className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg transition-all"
                    >
                      📄 View PDF
                    </button>
                  </>
                )}
                <button
                  onClick={() => {
                    setShowReportModal(false);
                    setSelectedReport(null);
                  }}
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PatientDashboard;
