const mongoose = require('mongoose');
const PoliceStation = require('./src/models/PoliceStation');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rapido-safety';

const stations = [
    {
        name: "Indiranagar Police Station",
        location: { type: "Point", coordinates: [77.6412, 12.9719] }, // Bangalore
        contactNumber: "100",
        jurisdictionRadiusKm: 3
    },
    {
        name: "Koramangala Police Station",
        location: { type: "Point", coordinates: [77.6271, 12.9345] },
        contactNumber: "101",
        jurisdictionRadiusKm: 3
    },
    {
        name: "HSR Layout Police Station",
        location: { type: "Point", coordinates: [77.6352, 12.9121] },
        contactNumber: "102",
        jurisdictionRadiusKm: 3
    }
];

async function seed() {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to DB...");

    await PoliceStation.deleteMany({});
    console.log("Cleared old stations.");

    await PoliceStation.insertMany(stations);
    console.log(`✅ Seeded ${stations.length} Police Stations.`);

    process.exit();
}

seed();
