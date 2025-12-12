import express from 'express';
import multer from 'multer';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import MalariaReport from '../models/MalariaReport.js';
import User from '../models/User.js';
import Appointment from '../models/Appointment.js';
import pdfService from '../services/pdfService.js';
import { sendMalariaReport } from '../services/emailService.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
});

// Create malaria report from ML analysis
router.post('/create', authenticateToken, requireRole(['doctor']), upload.single('image'), async (req, res) => {
	try {
		const { patientId, appointmentId, analysis } = req.body;

		if (!patientId) {
			return res.status(400).json({ message: 'Patient ID is required' });
		}

		const patient = await User.findById(patientId);
		if (!patient) {
			return res.status(404).json({ message: 'Patient not found' });
		}

		let appointment = null;
		if (appointmentId) {
			appointment = await Appointment.findById(appointmentId);
			if (!appointment) {
				return res.status(404).json({ message: 'Appointment not found' });
			}
		}

		let parsed = null;
		try {
			parsed = typeof analysis === 'string' && analysis.length ? JSON.parse(analysis) : analysis;
		} catch (err) {
			return res.status(400).json({ message: 'Invalid analysis JSON' });
		}

		if (!parsed) {
			return res.status(400).json({ message: 'Analysis data is required' });
		}

		// Extract malaria-specific data
		// The ML model returns: { prediction: "Parasitized", confidence: 96.18, probabilities: {...} }
		const diagnosis = parsed.prediction || parsed.diagnosis || parsed.predicted_class || parsed.class || 'inconclusive';
		let confidence = parsed.confidence || parsed.probability || 0;

		// Normalize confidence to percentage (0-100)
		// If confidence is <= 1, assume it's a decimal (0.9618) and convert to percentage
		// If confidence is > 1, assume it's already a percentage (96.18)
		if (confidence <= 1) {
			confidence = confidence * 100;
		}
		// Ensure confidence is within valid range
		confidence = Math.min(100, Math.max(0, confidence));

		// Normalize diagnosis to match enum
		let normalizedDiagnosis = diagnosis.toLowerCase();
		if (!['parasitized', 'uninfected', 'inconclusive'].includes(normalizedDiagnosis)) {
			normalizedDiagnosis = 'inconclusive';
		}

		// Extract probabilities if available
		const probabilities = parsed.probabilities || {};
		const parasitizedProb = probabilities.Parasitized || probabilities.parasitized || confidence;
		const uninfectedProb = probabilities.Uninfected || probabilities.uninfected || (100 - confidence);

		const imageAnalysis = {
			originalImageUrl: undefined,
			cellsDetected: parsed.cells_detected || parsed.total_cells || 0,
			parasiteCount: parsed.parasite_count || (normalizedDiagnosis === 'parasitized' ? 1 : 0),
			analysisNotes: parsed.message || parsed.info || parsed.notes || '',
			modelVersion: parsed.model_version || 'v1.0',
			parasitizedProbability: Number(parasitizedProb),
			uninfectedProbability: Number(uninfectedProb)
		};

		// Auto-generate clinical notes based on diagnosis
		let autoNotes = '';
		if (normalizedDiagnosis === 'parasitized') {
			autoNotes = `The AI analysis has detected malarial parasites in the blood sample. This indicates a positive malaria infection. Immediate medical attention and antimalarial treatment are recommended. Further microscopic examination and species identification should be performed by a qualified parasitologist.`;
		} else if (normalizedDiagnosis === 'uninfected') {
			autoNotes = `No malaria parasites detected. Patient appears uninfected with ${confidence.toFixed(2)}% confidence.`;
		} else {
			autoNotes = `Inconclusive result. Additional testing may be required.`;
		}

		const malariaReport = new MalariaReport({
			patient: patientId,
			doctor: req.user._id,
			appointment: appointmentId || undefined,
			diagnosis: normalizedDiagnosis,
			confidence: Number(confidence), // Convert to percentage
			imageAnalysis,
			clinicalNotes: autoNotes,
			status: 'completed'
		});

		await malariaReport.save();

		await malariaReport.populate('patient', 'fullName email');
		await malariaReport.populate('doctor', 'fullName');

		res.status(201).json({
			message: 'Malaria report created successfully',
			report: malariaReport
		});
	} catch (error) {
		console.error('Error creating malaria report:', error);
		res.status(500).json({
			message: 'Failed to create malaria report',
			error: error.message
		});
	}
});

// Get all malaria reports for a doctor
router.get('/doctor', authenticateToken, requireRole(['doctor']), async (req, res) => {
  try {
    const { page = 1, limit = 10, status, patientId, diagnosis } = req.query;
    const skip = (page - 1) * limit;

    const filter = { doctor: req.user._id };
    if (status) filter.status = status;
    if (patientId) filter.patient = patientId;
    if (diagnosis) filter.diagnosis = diagnosis;

    const reports = await MalariaReport.find(filter)
      .populate('patient', 'fullName email')
      .populate('appointment', 'date timeSlot reason')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await MalariaReport.countDocuments(filter);

    res.json({
      reports,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    console.error('Error fetching doctor malaria reports:', error);
    res.status(500).json({ message: 'Failed to fetch malaria reports', error: error.message });
  }
});

// Get all malaria reports for a patient
router.get('/patient', authenticateToken, requireRole(['patient']), async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const reports = await MalariaReport.find({ patient: req.user._id })
      .populate('doctor', 'fullName')
      .populate('appointment', 'date timeSlot reason')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await MalariaReport.countDocuments({ patient: req.user._id });

    res.json({
      reports,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    console.error('Error fetching patient malaria reports:', error);
    res.status(500).json({ message: 'Failed to fetch malaria reports', error: error.message });
  }
});

// Get a specific malaria report
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const report = await MalariaReport.findById(req.params.id)
      .populate('patient', 'fullName email')
      .populate('doctor', 'fullName')
      .populate('appointment', 'date timeSlot reason');

    if (!report) {
      return res.status(404).json({ message: 'Malaria report not found' });
    }

    // Check access permissions
    const hasAccess = req.user.role === 'doctor' ||
                     (req.user.role === 'patient' && report.patient._id.toString() === req.user._id.toString());

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ report });

  } catch (error) {
    console.error('Error fetching malaria report:', error);
    res.status(500).json({ message: 'Failed to fetch malaria report', error: error.message });
  }
});

// Update a malaria report (doctor only)
router.put('/:id', authenticateToken, requireRole(['doctor']), async (req, res) => {
  try {
    const { clinicalNotes, recommendations, treatmentPlan, status } = req.body;

    const report = await MalariaReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: 'Malaria report not found' });
    }

    // Verify doctor owns this report
    if (report.doctor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update fields
    if (clinicalNotes !== undefined) report.clinicalNotes = clinicalNotes;
    if (recommendations !== undefined) report.recommendations = recommendations;
    if (treatmentPlan !== undefined) report.treatmentPlan = treatmentPlan;
    if (status !== undefined) report.status = status;

    await report.save();

    await report.populate('patient', 'fullName email');
    await report.populate('doctor', 'fullName');

    res.json({
      message: 'Malaria report updated successfully',
      report
    });

  } catch (error) {
    console.error('Error updating malaria report:', error);
    res.status(500).json({ message: 'Failed to update malaria report', error: error.message });
  }
});

// Delete a malaria report (doctor only)
router.delete('/:id', authenticateToken, requireRole(['doctor']), async (req, res) => {
  try {
    const report = await MalariaReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: 'Malaria report not found' });
    }

    // Verify doctor owns this report
    if (report.doctor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await MalariaReport.findByIdAndDelete(req.params.id);

    res.json({ message: 'Malaria report deleted successfully' });

  } catch (error) {
    console.error('Error deleting malaria report:', error);
    res.status(500).json({ message: 'Failed to delete malaria report', error: error.message });
  }
});

// Get statistics for doctor's malaria reports
router.get('/stats/overview', authenticateToken, requireRole(['doctor']), async (req, res) => {
  try {
    const doctorId = req.user._id;

    const total = await MalariaReport.countDocuments({ doctor: doctorId });
    const parasitized = await MalariaReport.countDocuments({ doctor: doctorId, diagnosis: 'parasitized' });
    const uninfected = await MalariaReport.countDocuments({ doctor: doctorId, diagnosis: 'uninfected' });
    const inconclusive = await MalariaReport.countDocuments({ doctor: doctorId, diagnosis: 'inconclusive' });

    // Get urgent cases (parasitized with high confidence)
    const urgentCases = await MalariaReport.find({
      doctor: doctorId,
      diagnosis: 'parasitized',
      confidence: { $gte: 80 }
    }).countDocuments();

    res.json({
      stats: {
        total,
        parasitized,
        uninfected,
        inconclusive,
        urgentCases,
        infectionRate: total > 0 ? ((parasitized / total) * 100).toFixed(1) : 0
      }
    });

  } catch (error) {
    console.error('Error fetching malaria report stats:', error);
    res.status(500).json({ message: 'Failed to fetch statistics', error: error.message });
  }
});

// Generate PDF for malaria report (download)
router.get('/:id/pdf', authenticateToken, async (req, res) => {
  try {
    const report = await MalariaReport.findById(req.params.id)
      .populate('patient', 'fullName email dob')
      .populate('doctor', 'fullName specialty');

    if (!report) {
      return res.status(404).json({ message: 'Malaria report not found' });
    }

    // Check access permissions
    const hasAccess = req.user.role === 'doctor' ||
                     (req.user.role === 'patient' && report.patient._id.toString() === req.user._id.toString());

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Generate PDF
    const pdfBuffer = await pdfService.generateMalariaReportPDF(report);
    const filename = pdfService.getMalariaReportFilename(report);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error generating malaria PDF report:', error);
    res.status(500).json({ message: 'Failed to generate PDF report', error: error.message });
  }
});

// Generate PDF for malaria report (view in browser)
router.get('/:id/pdf/view', authenticateToken, async (req, res) => {
  try {
    const report = await MalariaReport.findById(req.params.id)
      .populate('patient', 'fullName email dob')
      .populate('doctor', 'fullName specialty');

    if (!report) {
      return res.status(404).json({ message: 'Malaria report not found' });
    }

    // Check access permissions
    const hasAccess = req.user.role === 'doctor' ||
                     (req.user.role === 'patient' && report.patient._id.toString() === req.user._id.toString());

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Generate PDF
    const pdfBuffer = await pdfService.generateMalariaReportPDF(report);
    const filename = pdfService.getMalariaReportFilename(report);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error generating malaria PDF report for viewing:', error);
    res.status(500).json({ message: 'Failed to generate PDF report', error: error.message });
  }
});

// Send malaria report via email
router.post('/:id/send-email', authenticateToken, requireRole(['doctor']), async (req, res) => {
  try {
    const report = await MalariaReport.findById(req.params.id)
      .populate('patient', 'fullName email')
      .populate('doctor', 'fullName')
      .populate('appointment', 'date timeSlot reason');

    if (!report) {
      return res.status(404).json({ message: 'Malaria report not found' });
    }

    if (report.doctor._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Send email with PDF attachment
    const emailResult = await sendMalariaReport(report);

    if (emailResult.success) {
      // Update report status
      report.emailSent = true;
      report.emailSentAt = new Date();
      report.status = 'sent';
      await report.save();

      res.json({
        message: 'Malaria report sent successfully to patient',
        emailSent: true
      });
    } else {
      res.status(500).json({
        message: 'Failed to send malaria report email',
        error: emailResult.error
      });
    }

  } catch (error) {
    console.error('Error sending malaria report email:', error);
    res.status(500).json({ message: 'Failed to send malaria report email', error: error.message });
  }
});

export default router;
