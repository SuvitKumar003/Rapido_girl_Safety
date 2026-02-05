const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema({
    passengerId: String, // In real app, reference User model
    driverId: String,    // In real app, reference Driver model

    status: {
        type: String,
        enum: ['REQUESTED', 'ASSIGNED', 'ONGOING', 'COMPLETED', 'PANIC'],
        default: 'REQUESTED'
    },

    startLocation: {
        lat: Number,
        lng: Number,
        address: String
    },

    dropLocation: {
        lat: Number,
        lng: Number,
        address: String
    },

    // 🚨 KEY FEATURE: The Police Station currently watching this ride
    monitoredByStationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PoliceStation'
    },

    // Track path for anomaly detection
    routeHistory: [{
        lat: Number,
        lng: Number,
        timestamp: { type: Date, default: Date.now }
    }],

    startTime: Date,
    endTime: Date
});

module.exports = mongoose.model('Ride', rideSchema);
