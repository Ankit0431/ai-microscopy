import mongoose from 'mongoose';

const malariaReportSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Patient is required']
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Doctor is required']
  },
  appointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: false
  },
  diagnosis: {
    type: String,
    enum: ['parasitized', 'uninfected', 'inconclusive'],
    required: [true, 'Diagnosis is required']
  },
  confidence: {
    type: Number,
    min: 0,
    max: 100,
    required: [true, 'Confidence score is required']
  },
  imageAnalysis: {
    originalImageUrl: { type: String, required: false },
    cellsDetected: { type: Number, default: 0 },
    parasiteCount: { type: Number, default: 0 },
    analysisNotes: { type: String, default: '' },
    modelVersion: { type: String, default: 'v1.0' }
  },
  clinicalNotes: {
    type: String,
    maxlength: [2000, 'Clinical notes cannot exceed 2000 characters'],
    default: ''
  },
  recommendations: {
    type: String,
    maxlength: [1000, 'Recommendations cannot exceed 1000 characters'],
    default: ''
  },
  treatmentPlan: {
    type: String,
    maxlength: [1500, 'Treatment plan cannot exceed 1500 characters'],
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'reviewed', 'sent'],
    default: 'completed'
  },
  emailSent: {
    type: Boolean,
    default: false
  },
  emailSentAt: {
    type: Date
  },
  generatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
malariaReportSchema.index({ patient: 1, createdAt: -1 });
malariaReportSchema.index({ doctor: 1, createdAt: -1 });
malariaReportSchema.index({ status: 1 });
malariaReportSchema.index({ diagnosis: 1 });

// Virtual for summary
malariaReportSchema.virtual('summary').get(function() {
  return `Diagnosis: ${this.diagnosis.toUpperCase()} (${this.confidence.toFixed(1)}% confidence)`;
});

// Method to get risk level
malariaReportSchema.methods.getRiskLevel = function() {
  if (this.diagnosis === 'uninfected') return 'none';
  if (this.diagnosis === 'inconclusive') return 'uncertain';

  // For parasitized
  if (this.confidence >= 90) return 'high';
  if (this.confidence >= 70) return 'moderate';
  return 'low';
};

// Method to check if treatment is urgent
malariaReportSchema.methods.isUrgent = function() {
  return this.diagnosis === 'parasitized' && this.confidence >= 80;
};

malariaReportSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  }
});

const MalariaReport = mongoose.model('MalariaReport', malariaReportSchema);

export default MalariaReport;
