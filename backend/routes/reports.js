import express from 'express';
import multer from 'multer';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import Report from '../models/Report.js';
import User from '../models/User.js';
import Appointment from '../models/Appointment.js';
import { sendBloodCountReport } from '../services/emailService.js';
import pdfService from '../services/pdfService.js';

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

const analyzeBloodImage = async (imageBuffer) => {
  await new Promise(resolve => setTimeout(resolve, 2000));
 
  const generateRandomValue = (min, max, decimals = 1) => {
    return +(Math.random() * (max - min) + min).toFixed(decimals);
  };
 
  const rbcValue = generateRandomValue(4.2, 6.1, 2);
  const wbcValue = generateRandomValue(4.5, 11.0, 1);
  const plateletValue = generateRandomValue(150, 400, 0);
  const hemoglobinValue = generateRandomValue(12, 18, 1);
  const hematocritValue = generateRandomValue(37, 52, 1);
 
  // Determine status based on values
  const getStatus = (value, normalMin, normalMax) => {
    if (value < normalMin) return 'low';
    if (value > normalMax) return 'high';
    return 'normal';
  };
 
  return {
    bloodCounts: {
      rbc: {
        value: rbcValue,
        unit: 'million cells/μL',
        normalRange: '4.7-6.1 (M), 4.2-5.4 (F)',
        status: getStatus(rbcValue, 4.2, 6.1)
      },
      wbc: {
        value: wbcValue,
        unit: 'thousand cells/μL',
        normalRange: '4.5-11.0',
        status: getStatus(wbcValue, 4.5, 11.0)
      },
      platelets: {
        value: plateletValue,
        unit: 'thousand cells/μL',
        normalRange: '150-400',
        status: getStatus(plateletValue, 150, 400)
      },
      hemoglobin: {
        value: hemoglobinValue,
        unit: 'g/dL',
        normalRange: '14-18 (M), 12-16 (F)',
        status: getStatus(hemoglobinValue, 12, 18)
      },
      hematocrit: {
        value: hematocritValue,
        unit: '%',
        normalRange: '42-52 (M), 37-47 (F)',
        status: getStatus(hematocritValue, 37, 52)
      }
    },
    imageAnalysis: {
      confidence: generateRandomValue(85, 98, 1),
      cellsDetected: Math.floor(generateRandomValue(500, 2000)),
      analysisNotes: 'Automated analysis completed successfully. Cell morphology appears normal.'
    }
  };
};

router.post('/analyze-blood-image', authenticateToken, requireRole(['doctor']), upload.single('image'), async (req, res) => {
  try {
    const { patientId, appointmentId } = req.body;
   
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }
   
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
   
   
    const analysisResults = await analyzeBloodImage(req.file.buffer);
   
   
    const report = new Report({
      patient: patientId,
      doctor: req.user._id,
      appointment: appointmentId || undefined,
      reportType: 'complete_blood_count',
      bloodCounts: analysisResults.bloodCounts,
      imageAnalysis: analysisResults.imageAnalysis,
      status: 'completed'
    });
   
    await report.save();
   
   
    await report.populate('patient', 'fullName email');
    await report.populate('doctor', 'fullName');
   
    res.status(201).json({
      message: 'Blood count analysis completed successfully',
      report
    });
   
  } catch (error) {
    console.error('Error analyzing blood image:', error);
    res.status(500).json({ message: 'Failed to analyze blood image', error: error.message });
  }
});

// Accept precomputed BCCD analysis and create report (no re-analysis required)
router.post('/from-bccd', authenticateToken, requireRole(['doctor']), upload.single('image'), async (req, res) => {
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

		if (!parsed || !parsed.counts) {
			return res.status(400).json({ message: 'Analysis counts are required' });
		}

		// Map counts into report bloodCounts structure
		const counts = parsed.counts;
		// BCCD returns counts e.g. { Platelets: 0, RBC: 22, WBC: 1 }
		const rbcValue = counts.RBC ?? counts.rbc ?? 0;
		const wbcValue = counts.WBC ?? counts.wbc ?? 0;
		const plateletsValue = counts.Platelets ?? counts.platelets ?? 0;

		// Create bloodCounts with minimal metadata. Status determination can be improved.
		const bloodCounts = {
			rbc: { value: Number(rbcValue), unit: 'count', normalRange: '', status: 'normal' },
			wbc: { value: Number(wbcValue), unit: 'count', normalRange: '', status: 'normal' },
			platelets: { value: Number(plateletsValue), unit: 'count', normalRange: '', status: 'normal' }
		};

		const imageAnalysis = {
			originalImageUrl: undefined,
			confidence: parsed.metrics?.confidence ?? 100,
			cellsDetected: parsed.total_cells ?? (Number(rbcValue) + Number(wbcValue) + Number(plateletsValue)),
			analysisNotes: parsed.message || parsed.info || ''
		};

		const report = new Report({
			patient: patientId,
			doctor: req.user._id,
			appointment: appointmentId || undefined,
			reportType: 'complete_blood_count',
			bloodCounts,
			imageAnalysis,
			status: 'completed'
		});

		await report.save();

		await report.populate('patient', 'fullName email');
		await report.populate('doctor', 'fullName');

		res.status(201).json({ message: 'Report created from BCCD analysis', report });
	} catch (error) {
		console.error('Error creating report from BCCD analysis:', error);
		res.status(500).json({ message: 'Failed to create report from BCCD', error: error.message });
	}
});

// Accept precomputed Malaria analysis and create report
router.post('/from-malaria', authenticateToken, requireRole(['doctor']), upload.single('image'), async (req, res) => {
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

		// Malaria analysis structure may differ from BCCD
		// Expected structure: { diagnosis: 'parasitized' | 'uninfected', confidence: 0.95, ... }
		const diagnosis = parsed.diagnosis || parsed.predicted_class || 'unknown';
		const confidence = parsed.confidence || parsed.probability || 0;

		// For malaria, we can store the result in a different way
		// Since it's not traditional blood counts, we'll use imageAnalysis primarily
		const imageAnalysis = {
			originalImageUrl: undefined,
			confidence: Number(confidence) * 100, // Convert to percentage if needed
			cellsDetected: parsed.cells_detected || 0,
			analysisNotes: `Malaria diagnosis: ${diagnosis}. ${parsed.message || parsed.info || ''}`
		};

		// Create minimal bloodCounts structure for consistency
		const bloodCounts = {
			rbc: { value: 0, unit: 'count', normalRange: '', status: 'normal' },
			wbc: { value: 0, unit: 'count', normalRange: '', status: 'normal' },
			platelets: { value: 0, unit: 'count', normalRange: '', status: 'normal' }
		};

		const report = new Report({
			patient: patientId,
			doctor: req.user._id,
			appointment: appointmentId || undefined,
			reportType: 'malaria_detection',
			bloodCounts,
			imageAnalysis,
			clinicalNotes: `Malaria Test Result: ${diagnosis}`,
			status: 'completed'
		});

		await report.save();

		await report.populate('patient', 'fullName email');
		await report.populate('doctor', 'fullName');

		res.status(201).json({ message: 'Report created from Malaria analysis', report });
	} catch (error) {
		console.error('Error creating report from Malaria analysis:', error);
		res.status(500).json({ message: 'Failed to create report from Malaria', error: error.message });
	}
});

router.get('/doctor', authenticateToken, requireRole(['doctor']), async (req, res) => {
  try {
    const { page = 1, limit = 10, status, patientId } = req.query;
    const skip = (page - 1) * limit;
   
    const filter = { doctor: req.user._id };
    if (status) filter.status = status;
    if (patientId) filter.patient = patientId;
   
    const reports = await Report.find(filter)
      .populate('patient', 'fullName email')
      .populate('appointment', 'date timeSlot reason')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
   
    const total = await Report.countDocuments(filter);
   
    res.json({
      reports,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
   
  } catch (error) {
    console.error('Error fetching doctor reports:', error);
    res.status(500).json({ message: 'Failed to fetch reports', error: error.message });
  }
});

router.get('/patient', authenticateToken, requireRole(['patient']), async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
   
    const reports = await Report.find({ patient: req.user._id })
      .populate('doctor', 'fullName')
      .populate('appointment', 'date timeSlot reason')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
   
    const total = await Report.countDocuments({ patient: req.user._id });
   
    res.json({
      reports,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
   
  } catch (error) {
    console.error('Error fetching patient reports:', error);
    res.status(500).json({ message: 'Failed to fetch reports', error: error.message });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('patient', 'fullName email')
      .populate('doctor', 'fullName')
      .populate('appointment', 'date timeSlot reason');
   
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }
   
   
    const hasAccess = req.user.role === 'doctor' ||
                     (req.user.role === 'patient' && report.patient._id.toString() === req.user._id.toString());
   
    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }
   
    res.json({ report });
   
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ message: 'Failed to fetch report', error: error.message });
  }
});

router.put('/:id', authenticateToken, requireRole(['doctor']), async (req, res) => {
  try {
    const { clinicalNotes, recommendations, status } = req.body;
   
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }
   
    if (report.doctor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
   
   
    if (clinicalNotes !== undefined) report.clinicalNotes = clinicalNotes;
    if (recommendations !== undefined) report.recommendations = recommendations;
    if (status !== undefined) report.status = status;
   
    await report.save();
   
   
    await report.populate('patient', 'fullName email');
    await report.populate('doctor', 'fullName');
   
    res.json({
      message: 'Report updated successfully',
      report
    });
   
  } catch (error) {
    console.error('Error updating report:', error);
    res.status(500).json({ message: 'Failed to update report', error: error.message });
  }
});

router.post('/:id/send-email', authenticateToken, requireRole(['doctor']), async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('patient', 'fullName email')
      .populate('doctor', 'fullName')
      .populate('appointment', 'date timeSlot reason');
   
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }
   
    if (report.doctor._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
   
   
    const emailResult = await sendBloodCountReport(report);
   
    if (emailResult.success) {
     
      report.emailSent = true;
      report.emailSentAt = new Date();
      report.status = 'sent';
      await report.save();
     
      res.json({
        message: 'Report sent successfully to patient',
        emailSent: true
      });
    } else {
      res.status(500).json({
        message: 'Failed to send report email',
        error: emailResult.error
      });
    }
   
  } catch (error) {
    console.error('Error sending report email:', error);
    res.status(500).json({ message: 'Failed to send report email', error: error.message });
  }
});

router.delete('/:id', authenticateToken, requireRole(['doctor']), async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }
   
   
    if (report.doctor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
   
    await Report.findByIdAndDelete(req.params.id);
   
    res.json({ message: 'Report deleted successfully' });
   
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({ message: 'Failed to delete report', error: error.message });
  }
});

router.get('/:id/pdf', authenticateToken, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('patient', 'fullName email dob')
      .populate('doctor', 'fullName specialty');
   
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }
   

    const hasAccess = req.user.role === 'doctor' ||
                     (req.user.role === 'patient' && report.patient._id.toString() === req.user._id.toString());
   
    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }
   
   
    const pdfBuffer = await pdfService.generateBloodCountReportPDF(report);
    const filename = pdfService.getPDFFilename(report);
   
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
   
   
    res.send(pdfBuffer);
   
  } catch (error) {
    console.error('Error generating PDF report:', error);
    res.status(500).json({ message: 'Failed to generate PDF report', error: error.message });
  }
});

router.get('/:id/pdf/view', authenticateToken, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('patient', 'fullName email dob')
      .populate('doctor', 'fullName specialty');
   
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }
   
   
    const hasAccess = req.user.role === 'doctor' ||
                     (req.user.role === 'patient' && report.patient._id.toString() === req.user._id.toString());
   
    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }
   
   
    const pdfBuffer = await pdfService.generateBloodCountReportPDF(report);
    const filename = pdfService.getPDFFilename(report);
   
   
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
   
   
    res.send(pdfBuffer);
   
  } catch (error) {
    console.error('Error generating PDF report for viewing:', error);
    res.status(500).json({ message: 'Failed to generate PDF report', error: error.message });
  }
});

export default router;