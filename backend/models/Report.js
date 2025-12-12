import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
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
  reportType: {
    type: String,
    enum: ['blood_count', 'wbc_analysis', 'platelet_count', 'complete_blood_count'],
    required: [true, 'Report type is required'],
    default: 'complete_blood_count'
  },
  bloodCounts: {
    rbc: {
      value: { type: Number, required: true },
      unit: { type: String, default: 'million cells/μL' },
      normalRange: { type: String, default: '4.7-6.1 (M), 4.2-5.4 (F)' },
      status: { type: String, enum: ['normal', 'low', 'high'], default: 'normal' }
    },
    wbc: {
      value: { type: Number, required: true },
      unit: { type: String, default: 'thousand cells/μL' },
      normalRange: { type: String, default: '4.5-11.0' },
      status: { type: String, enum: ['normal', 'low', 'high'], default: 'normal' }
    },
    platelets: {
      value: { type: Number, required: true },
      unit: { type: String, default: 'thousand cells/μL' },
      normalRange: { type: String, default: '150-400' },
      status: { type: String, enum: ['normal', 'low', 'high'], default: 'normal' }
    },
    hemoglobin: {
      value: { type: Number, required: false },
      unit: { type: String, default: 'g/dL' },
      normalRange: { type: String, default: '14-18 (M), 12-16 (F)' },
      status: { type: String, enum: ['normal', 'low', 'high'], default: 'normal' }
    },
    hematocrit: {
      value: { type: Number, required: false },
      unit: { type: String, default: '%' },
      normalRange: { type: String, default: '42-52 (M), 37-47 (F)' },
      status: { type: String, enum: ['normal', 'low', 'high'], default: 'normal' }
    }
  },
  imageAnalysis: {
    originalImageUrl: { type: String, required: false },
    confidence: { type: Number, min: 0, max: 100, default: 95 },
    cellsDetected: { type: Number, default: 0 },
    analysisNotes: { type: String, default: '' }
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

reportSchema.index({ patient: 1, createdAt: -1 });
reportSchema.index({ doctor: 1, createdAt: -1 });
reportSchema.index({ status: 1 });
reportSchema.index({ reportType: 1 });

reportSchema.virtual('summary').get(function() {
  const { rbc, wbc, platelets } = this.bloodCounts;
  return `RBC: ${rbc.value} ${rbc.unit}, WBC: ${wbc.value} ${wbc.unit}, Platelets: ${platelets.value} ${platelets.unit}`;
});

reportSchema.methods.getOverallStatus = function() {
  const { rbc, wbc, platelets } = this.bloodCounts;
  const abnormalCounts = [rbc.status, wbc.status, platelets.status].filter(status => status !== 'normal');
  
  if (abnormalCounts.length === 0) return 'normal';
  if (abnormalCounts.length <= 1) return 'mild_abnormal';
  return 'significant_abnormal';
};

reportSchema.methods.getFlaggedValues = function() {
  const flagged = [];
  const { rbc, wbc, platelets, hemoglobin, hematocrit } = this.bloodCounts;
  
  if (rbc.status !== 'normal') flagged.push({ type: 'RBC', value: rbc.value, status: rbc.status });
  if (wbc.status !== 'normal') flagged.push({ type: 'WBC', value: wbc.value, status: wbc.status });
  if (platelets.status !== 'normal') flagged.push({ type: 'Platelets', value: platelets.value, status: platelets.status });
  if (hemoglobin && hemoglobin.status !== 'normal') flagged.push({ type: 'Hemoglobin', value: hemoglobin.value, status: hemoglobin.status });
  if (hematocrit && hematocrit.status !== 'normal') flagged.push({ type: 'Hematocrit', value: hematocrit.value, status: hematocrit.status });
  
  return flagged;
};

reportSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  }
});

const Report = mongoose.model('Report', reportSchema);

export default Report; 