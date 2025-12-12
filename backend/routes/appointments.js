import express from 'express';
import { body, validationResult, param, query } from 'express-validator';
import Appointment from '../models/Appointment.js';
import User from '../models/User.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { sendAppointmentConfirmation, sendAppointmentCancellation, testEmailConfiguration } from '../services/emailService.js';

const router = express.Router();

// Test email configuration (useful for debugging)
router.get('/test-email', authenticateToken, requireRole(['doctor']), async (req, res) => {
  try {
    const result = await testEmailConfiguration();
    res.json({
      success: result.success,
      message: result.success ? 'Email configuration is valid and working' : 'Email configuration failed',
      error: result.error || null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to test email configuration',
      error: error.message
    });
  }
});

router.get('/doctors', authenticateToken, async (req, res) => {
  try {
    const doctors = await User.find({
      role: 'doctor',
      isActive: true
    }).select('fullName profilePicture');

    res.json({
      success: true,
      doctors
    });
  } catch (error) {
    console.error('Error fetching doctors:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching doctors',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

router.get('/doctors/:doctorId/availability', [
  authenticateToken,
  param('doctorId').isMongoId().withMessage('Invalid doctor ID'),
  query('date').isISO8601().withMessage('Date must be in YYYY-MM-DD format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { doctorId } = req.params;
    const { date } = req.query;

    const doctor = await User.findOne({
      _id: doctorId,
      role: 'doctor',
      isActive: true
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }
    const requestedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (requestedDate < today) {
      return res.status(400).json({
        success: false,
        message: 'Cannot check availability for past dates'
      });
    }

    const dayOfWeek = requestedDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

    if (!weekdays.includes(dayOfWeek)) {
      return res.json({
        success: true,
        availableSlots: [],
        message: `Dr. ${doctor.fullName} is not available on ${dayOfWeek}s`
      });
    }
    const allTimeSlots = [
      '09:00-09:15', '09:15-09:30', '09:30-09:45', '09:45-10:00',
      '10:00-10:15', '10:15-10:30', '10:30-10:45', '10:45-11:00',
      '11:00-11:15', '11:15-11:30', '11:30-11:45', '11:45-12:00',
      '14:00-14:15', '14:15-14:30', '14:30-14:45', '14:45-15:00',
      '15:00-15:15', '15:15-15:30', '15:30-15:45', '15:45-16:00',
      '16:00-16:15', '16:15-16:30', '16:30-16:45', '16:45-17:00'
    ];

    const existingAppointments = await Appointment.find({
      doctor: doctorId,
      date: requestedDate,
      status: { $in: ['scheduled', 'confirmed'] }
    }).select('timeSlot');

    const slotCounts = {};
    existingAppointments.forEach(appointment => {
      slotCounts[appointment.timeSlot] = (slotCounts[appointment.timeSlot] || 0) + 1;
    });

    const maxPatientsPerSlot = 1;
    const availableSlots = allTimeSlots.filter(slot => {
      const currentCount = slotCounts[slot] || 0;
      return currentCount < maxPatientsPerSlot;
    }).map(slot => ({
      timeSlot: slot,
      formattedTime: slot.replace('-', ' - '),
      availableSpots: maxPatientsPerSlot - (slotCounts[slot] || 0),
      totalSpots: maxPatientsPerSlot
    }));

    res.json({
      success: true,
      availableSlots,
      doctorInfo: {
        name: doctor.fullName,
        specialization: 'General Practice',
        maxPatientsPerSlot: maxPatientsPerSlot
      }
    });

  } catch (error) {
    console.error('Error fetching availability:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching availability',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

router.post('/book', [
  authenticateToken,
  requireRole(['patient']),
  body('doctorId').isMongoId().withMessage('Invalid doctor ID'),
  body('date').isISO8601().withMessage('Date must be in YYYY-MM-DD format'),
  body('timeSlot').matches(/^\d{2}:\d{2}-\d{2}:\d{2}$/).withMessage('Invalid time slot format'),
  body('reason').isLength({ min: 10, max: 500 }).withMessage('Reason must be between 10 and 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { doctorId, date, timeSlot, reason } = req.body;
    const patientId = req.user._id;

    const doctor = await User.findOne({
      _id: doctorId,
      role: 'doctor',
      isActive: true
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    const patient = await User.findById(patientId);

    const appointmentDate = new Date(date);
    const now = new Date();
    const [startTime] = timeSlot.split('-');
    const [hour, minute] = startTime.split(':');
    appointmentDate.setHours(parseInt(hour), parseInt(minute), 0, 0);

    if (appointmentDate < now) {
      return res.status(400).json({
        success: false,
        message: 'Cannot book appointments in the past'
      });
    }

    const dayOfWeek = appointmentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    if (!weekdays.includes(dayOfWeek)) {
      return res.status(400).json({
        success: false,
        message: `Dr. ${doctor.fullName} is not available on ${dayOfWeek}s`
      });
    }

    const existingAppointmentsCount = await Appointment.countDocuments({
      doctor: doctorId,
      date: appointmentDate,
      timeSlot,
      status: { $in: ['scheduled', 'confirmed'] }
    });

    if (existingAppointmentsCount >= 1) {
      return res.status(400).json({
        success: false,
        message: 'This time slot is fully booked'
      });
    }
    const conflictingAppointment = await Appointment.findOne({
      patient: patientId,
      date: appointmentDate,
      timeSlot,
      status: { $in: ['scheduled', 'confirmed'] }
    });

    if (conflictingAppointment) {
      return res.status(400).json({
        success: false,
        message: 'You already have an appointment at this time'
      });
    }

    const appointment = new Appointment({
      patient: patientId,
      doctor: doctorId,
      date: appointmentDate,
      timeSlot,
      reason,
      status: 'scheduled'
    });

    await appointment.save();

    await appointment.populate([
      { path: 'patient', select: 'fullName email' },
      { path: 'doctor', select: 'fullName email' }
    ]);

    // Emit socket event to doctor for real-time notification
    const io = req.app.get('io');
    if (io) {
      io.to(`doctor-${doctorId}`).emit('new-appointment', {
        appointment: {
          _id: appointment._id,
          patient: {
            _id: appointment.patient._id,
            fullName: appointment.patient.fullName,
            email: appointment.patient.email
          },
          doctor: {
            _id: appointment.doctor._id,
            fullName: appointment.doctor.fullName
          },
          date: appointment.date,
          timeSlot: appointment.timeSlot,
          reason: appointment.reason,
          status: appointment.status,
          createdAt: appointment.createdAt
        }
      });
      console.log(`Socket event emitted to doctor-${doctorId} for new appointment`);
    }

    // Send confirmation email with detailed error handling
    let emailResult = { success: false, error: 'Email not attempted' };
    let emailWarning = null;

    try {
      emailResult = await sendAppointmentConfirmation({
        patient: appointment.patient,
        doctor: appointment.doctor,
        date: appointment.date,
        timeSlot: appointment.timeSlot,
        reason: appointment.reason
      });

      if (emailResult.success) {
        appointment.emailSent = true;
        await appointment.save();
        console.log('Confirmation email sent and appointment updated');
      } else {
        // Email failed but appointment is still booked
        emailWarning = `Appointment booked but confirmation email failed: ${emailResult.error}`;
        console.warn(emailWarning);
      }
    } catch (emailError) {
      // Catch any unexpected errors from email service
      emailWarning = `Appointment booked but email service error: ${emailError.message}`;
      console.error('Unexpected error sending confirmation email:', emailError);
    }

    res.status(201).json({
      success: true,
      message: emailWarning ? 'Appointment booked successfully (email delivery pending)' : 'Appointment booked successfully',
      appointment: {
        _id: appointment._id,
        doctor: appointment.doctor,
        date: appointment.date,
        timeSlot: appointment.timeSlot,
        reason: appointment.reason,
        status: appointment.status,
        emailSent: appointment.emailSent
      },
      ...(emailWarning && { warning: emailWarning })
    });

  } catch (error) {
    console.error('Error booking appointment:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'This time slot was just booked by another patient. Please choose a different time.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error booking appointment',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

router.get('/patient/my-appointments', authenticateToken, requireRole(['patient']), async (req, res) => {
  try {
    const { page = 1, limit = 10, status, upcoming } = req.query;
    const patientId = req.user._id;

    let filter = { patient: patientId };

    if (status) {
      filter.status = status;
    }

    if (upcoming === 'true') {
      filter.date = { $gte: new Date() };
    }

    const appointments = await Appointment.find(filter)
      .populate('doctor', 'fullName')
      .sort({ date: 1, timeSlot: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Appointment.countDocuments(filter);

    res.json({
      success: true,
      appointments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching patient appointments:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching appointments',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

router.get('/doctor/my-appointments', authenticateToken, requireRole(['doctor']), async (req, res) => {
  try {
    const { page = 1, limit = 10, status, date } = req.query;
    const doctorId = req.user._id;

    let filter = { doctor: doctorId };

    if (status) {
      filter.status = status;
    }

    if (date) {
      const queryDate = new Date(date);
      const nextDay = new Date(queryDate);
      nextDay.setDate(nextDay.getDate() + 1);
      filter.date = { $gte: queryDate, $lt: nextDay };
    }

    const appointments = await Appointment.find(filter)
      .populate('patient', 'fullName email')
      .sort({ date: 1, timeSlot: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Appointment.countDocuments(filter);

    res.json({
      success: true,
      appointments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching doctor appointments:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching appointments',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Handle OPTIONS preflight request
router.options('/:appointmentId/cancel', (req, res) => {
  res.sendStatus(200);
});

router.patch('/:appointmentId/cancel', [
  authenticateToken,
  param('appointmentId').isMongoId().withMessage('Invalid appointment ID'),
  body('reason').optional().isLength({ max: 500 }).withMessage('Reason cannot exceed 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { appointmentId } = req.params;
    const { reason } = req.body;
    const userId = req.user._id;
    const userRole = req.user.role;

    const appointment = await Appointment.findById(appointmentId)
      .populate('patient', 'fullName email')
      .populate('doctor', 'fullName email');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }
    const canCancel = (
      (userRole === 'patient' && appointment.patient._id.toString() === userId.toString()) ||
      (userRole === 'doctor' && appointment.doctor._id.toString() === userId.toString())
    );

    if (!canCancel) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to cancel this appointment'
      });
    }

    if (appointment.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Appointment is already cancelled'
      });
    }

    if (appointment.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel a completed appointment'
      });
    }
    appointment.status = 'cancelled';
    if (reason) {
      appointment.notes = `Cancelled by ${userRole}: ${reason}`;
    }
    await appointment.save();

    // Emit socket event for real-time update
    const io = req.app.get('io');
    if (io) {
      const cancelData = {
        appointment: {
          _id: appointment._id,
          patient: {
            _id: appointment.patient._id,
            fullName: appointment.patient.fullName,
            email: appointment.patient.email
          },
          doctor: {
            _id: appointment.doctor._id,
            fullName: appointment.doctor.fullName,
            email: appointment.doctor.email
          },
          date: appointment.date,
          timeSlot: appointment.timeSlot,
          reason: appointment.reason,
          status: appointment.status,
          notes: appointment.notes,
          cancelledBy: userRole
        }
      };

      // Notify the other party about cancellation
      if (userRole === 'patient') {
        // Patient cancelled, notify doctor
        io.to(`doctor-${appointment.doctor._id}`).emit('appointment-cancelled', cancelData);
        console.log(`Socket event emitted to doctor-${appointment.doctor._id} for cancellation`);
      } else {
        // Doctor cancelled, notify patient
        io.to(`patient-${appointment.patient._id}`).emit('appointment-cancelled', cancelData);
        console.log(`Socket event emitted to patient-${appointment.patient._id} for cancellation`);
      }
    }

    try {
      await sendAppointmentCancellation({
        patient: appointment.patient,
        doctor: appointment.doctor,
        date: appointment.date,
        timeSlot: appointment.timeSlot
      });
    } catch (emailError) {
      console.error('Error sending cancellation email:', emailError);
    }

    res.json({
      success: true,
      message: 'Appointment cancelled successfully',
      appointment
    });

  } catch (error) {
    console.error('Error cancelling appointment:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling appointment',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

router.patch('/:appointmentId', [
  authenticateToken,
  requireRole(['doctor']),
  param('appointmentId').isMongoId().withMessage('Invalid appointment ID'),
  body('status').optional().isIn(['scheduled', 'confirmed', 'completed', 'no-show']).withMessage('Invalid status'),
  body('notes').optional().isLength({ max: 1000 }).withMessage('Notes cannot exceed 1000 characters'),
  body('diagnosis').optional().isLength({ max: 1000 }).withMessage('Diagnosis cannot exceed 1000 characters'),
  body('prescription').optional().isLength({ max: 1000 }).withMessage('Prescription cannot exceed 1000 characters'),
  body('followUpRequired').optional().isBoolean().withMessage('Follow up required must be boolean'),
  body('followUpDate').optional().isISO8601().withMessage('Follow up date must be valid')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { appointmentId } = req.params;
    const updates = req.body;
    const doctorId = req.user._id;

    const appointment = await Appointment.findOne({
      _id: appointmentId,
      doctor: doctorId
    }).populate(['patient', 'doctor']);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found or you are not authorized to update it'
      });
    }

    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        appointment[key] = updates[key];
      }
    });

    await appointment.save();

    res.json({
      success: true,
      message: 'Appointment updated successfully',
      appointment
    });

  } catch (error) {
    console.error('Error updating appointment:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating appointment',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

export default router;