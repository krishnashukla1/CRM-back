
const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema({
  name: String,
  role: String,
  email: String,
  status: { type: String, default: "Active" },
  // image: String, // optional
  photo: {
    type: String,
    default: '', // or a default image filename
  },
  dateOfJoining: {
    type: Date,
    required: false, // or true if mandatory
  },
  salary: {
  type: Number,
  required: false // e.g. 30000
},

leaveQuota: {
    type: Number,
    default: 24, // Default annual leave quota
    min: 1 // Ensure it's always positive
  }



}, { timestamps: true }); // ✅ important!);



// ✅ Index on commonly searched fields
employeeSchema.index({ name: "text", email: "text", role: 1 });

module.exports = mongoose.model("Employee", employeeSchema);
