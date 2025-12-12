import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema({
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
  date: {
    type: Date,
    required: [true, 'Appointment date is required']
  },
  timeSlot: {
    type: String,
    required: [true, 'Time slot is required'],
    enum: [
      '09:00-09:15', '09:15-09:30', '09:30-09:45', '09:45-10:00',
      '10:00-10:15', '10:15-10:30', '10:30-10:45', '10:45-11:00',
      '11:00-11:15', '11:15-11:30', '11:30-11:45', '11:45-12:00',
      '14:00-14:15', '14:15-14:30', '14:30-14:45', '14:45-15:00',
      '15:00-15:15', '15:15-15:30', '15:30-15:45', '15:45-16:00',
      '16:00-16:15', '16:15-16:30', '16:30-16:45', '16:45-17:00'
    ]
  },
  status: {
    type: String,
    enum: ['scheduled', 'confirmed', 'completed', 'cancelled', 'no-show'],
    default: 'scheduled'
  },
  reason: {
    type: String,
    required: [true, 'Reason for appointment is required'],
    maxlength: [500, 'Reason cannot exceed 500 characters']
  },
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    default: ''
  },
  diagnosis: {
    type: String,
    maxlength: [1000, 'Diagnosis cannot exceed 1000 characters'],
    default: ''
  },
  prescription: {
    type: String,
    maxlength: [1000, 'Prescription cannot exceed 1000 characters'],
    default: ''
  },
  followUpRequired: {
    type: Boolean,
    default: false
  },
  followUpDate: {
    type: Date
  },
  emailSent: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});


appointmentSchema.index({ patient: 1, date: 1 });
appointmentSchema.index({ doctor: 1, date: 1 });
appointmentSchema.index({ date: 1, timeSlot: 1 });
appointmentSchema.index({ status: 1 });


appointmentSchema.index({ doctor: 1, date: 1, timeSlot: 1 }, { unique: true });


appointmentSchema.virtual('appointmentDateTime').get(function() {
  const [startTime] = this.timeSlot.split('-');
  const [hour, minute] = startTime.split(':');
  const appointmentDate = new Date(this.date);
  appointmentDate.setHours(parseInt(hour), parseInt(minute), 0, 0);
  return appointmentDate;
});


appointmentSchema.methods.isPast = function() {
  return this.appointmentDateTime < new Date();
};


appointmentSchema.methods.isToday = function() {
  const today = new Date();
  const appointmentDate = new Date(this.date);
  return appointmentDate.toDateString() === today.toDateString();
};

appointmentSchema.methods.getFormattedTime = function() {
  const [startTime, endTime] = this.timeSlot.split('-');
  return `${startTime} - ${endTime}`;
};

appointmentSchema.pre('validate', function(next) {
  if (this.isNew && this.appointmentDateTime < new Date()) {
    return next(new Error('Cannot book appointments in the past'));
  }
  next();
});

appointmentSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  }
});

const Appointment = mongoose.model('Appointment', appointmentSchema);

export default Appointment; 