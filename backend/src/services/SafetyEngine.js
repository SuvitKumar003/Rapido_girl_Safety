const { stations, rides } = require('./InMemoryStore');

// 🧮 Haversine Formula for Distance (km)
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

// Find nearest station using simple math (No DB needed)
async function findNearestPoliceStation(lat, lng) {
    let nearest = null;
    let minDistance = Infinity;

    for (const station of stations) {
        const dist = getDistanceFromLatLonInKm(
            lat, lng,
            station.location.coordinates[1], // lat
            station.location.coordinates[0]  // lng
        );

        if (dist < minDistance) {
            minDistance = dist;
            nearest = station;
        }
    }
    return nearest;
}

async function updateRideLocation(rideId, lat, lng, io) {
    // Get or Create Ride in Memory
    if (!rides[rideId]) {
        rides[rideId] = {
            _id: rideId,
            routeHistory: [],
            monitoredByStationId: null
        };
    }
    const ride = rides[rideId];

    // 1. Update Route
    ride.routeHistory.push({ lat, lng, timestamp: new Date() });

    // 2. CHECK HANDOVER
    const nearestStation = await findNearestPoliceStation(lat, lng);

    // If station changed or first assignment
    if (nearestStation && ride.monitoredByStationId !== nearestStation._id) {
        const oldStationId = ride.monitoredByStationId;

        console.log(`🔀 HANDOVER: ${oldStationId || 'None'} ➡️ ${nearestStation.name}`);

        // Notify OLD station
        if (oldStationId) {
            io.to(oldStationId).emit('handoff_release', { rideId });
        }

        // Notify NEW station (Broadcast for Demo Dashboard to see)
        io.emit('handoff_accept', {
            rideId,
            status: 'INCOMING_HANDOVER',
            lat, lng,
            stationName: nearestStation.name
        });

        // Update Ride State
        ride.monitoredByStationId = nearestStation._id;
    }

    return ride;
}

module.exports = {
    findNearestPoliceStation,
    updateRideLocation
};
