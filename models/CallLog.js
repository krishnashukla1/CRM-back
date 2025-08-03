const mongoose = require('mongoose');

const callLogSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  reasonForCall: {
    type: String,
    enum: [
      'Flight Inquiry',
      'Hotel Inquiry',
      'Seat Selection',
      'Refund/Cancel',
      'Price too high',
      'Language preference'
    ],
    required: true
  },
  typeOfCall: {
    type: String,
    enum: ['Sales Inquiry', 'Post-Sale Inquiry', 'Non-Sales Inquiry','Customer Service', 'Blank Call'],
    required: true
  },
  callCategory: {
    type: String,
    enum: ['Flight', 'Hotel', 'Rental', 'Package', 'Other'],
    // default: '',
     required: function () {
    return this.typeOfCall === 'Sales Inquiry';
  }
   
  },
  callDescription: {
    type: String,
    required: true
  },
  wasSaleConverted: {
    type: String,
    enum: ['Yes', 'No', 'N/A'],
    required: true
  },
  profitAmount: {
    type: Number,
    default: 0
  },
  reasonForNoSale: {
    type: String,
    default: ''
  },
  customerName: {
    type: String,
    required: true
  },
  customerEmail: {
    type: String,
    required: true
  },
  customerPhone: {
    type: String,
    required: true
  },
  language: {
    type: String,
    enum: ['English', 'Spanish','Other'],
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('CallLog', callLogSchema);
