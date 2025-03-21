import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

mongoose.connection.on("connected", () => {
  console.log(`📌 Connected to database: ${mongoose.connection.db.databaseName}`);
});

const orderSchema = new mongoose.Schema({
  order_number: { type: String, required: true, unique: true },
  dispatcher_name: { type: String, required: true },
  customer_name: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
  order_status: { 
    type: String, 
    enum: ['Pending', 'Completed'], // Removed In Progress
    default: 'Pending' 
  },
  order_details: {
    glass: [{
      glass_name: { type: String, required: true },
      quantity: { type: Number, required: true, min: 1 },
      weight: String,
      neck_size: String,
      decoration: String,
      decoration_no: String,
      decoration_details: {
        type: { type: String },
        decoration_number: String
      },
      team: String,
      status: { 
        type: String, 
        enum: ['Pending', 'Done'], // Removed In Progress
        default: 'Pending' 
      }
    }],
    caps: [{
      cap_name: { type: String, required: true },
      neck_size: String,
      quantity: { type: Number, required: true, min: 1 },
      process: String,
      material: String,
      team: String,
      status: { 
        type: String, 
        enum: ['Pending', 'Done'], // Removed In Progress
        default: 'Pending' 
      }
    }],
    boxes: [{
      box_name: { type: String, required: true },
      quantity: { type: Number, required: true, min: 1 },
      approval_code: String,
      team: String,
      status: { 
        type: String, 
        enum: ['Pending', 'Done'], // Removed In Progress
        default: 'Pending' 
      }
    }],
    pumps: [{
      pump_name: { type: String, required: true },
      neck_type: String,
      quantity: { type: Number, required: true, min: 1 },
      team: String,
      status: { 
        type: String, 
        enum: ['Pending', 'Done'], // Removed In Progress
        default: 'Pending' 
      }
    }]
  }
}, { 
  minimize: false,
  timestamps: true 
});


const Order = mongoose.model('Order', orderSchema);
export default Order;
