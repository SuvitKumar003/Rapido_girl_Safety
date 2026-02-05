const mongoose = require('mongoose');

const policeStationSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            required: true
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            required: true
        }
    },
    contactNumber: String,
    jurisdictionRadiusKm: {
        type: Number,
        default: 5
    }
});

// Create a geospatial index for efficient "find nearest" queries
policeStationSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('PoliceStation', policeStationSchema);
