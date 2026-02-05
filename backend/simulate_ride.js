const io = require('socket.io-client');

const socket = io('http://localhost:5000');
const RIDE_ID = "ride_patiala_001";

// Helpers for smooth interpolation between two GPS points
function interpolate(start, end, steps) {
    const points = [];
    const latStep = (end.lat - start.lat) / steps;
    const lngStep = (end.lng - start.lng) / steps;
    for (let i = 0; i < steps; i++) {
        points.push({
            lat: start.lat + (latStep * i),
            lng: start.lng + (lngStep * i),
            deviation: end.deviation // Inherit deviation status
        });
    }
    return points;
}

// 🗺️ Key Landmarks (Thapar -> Civil Lines -> Urban Estate)
const KEY_STOPS = [
    { lat: 30.3564, lng: 76.3647 }, // Thapar University
    { lat: 30.3540, lng: 76.3700 },
    { lat: 30.3520, lng: 76.3800 },
    { lat: 30.3400, lng: 76.3860 }, // Civil Lines
    { lat: 30.3420, lng: 76.3950 },
    // ⚠️ SIMULATED DEVIATION HERE (Going North instead of East)
    { lat: 30.3600, lng: 76.4000, deviation: true },
    { lat: 30.3700, lng: 76.4050, deviation: true }
];

// Generate Smooth Path (120 steps between each landmark)
let SMOOTH_PATH = [];
for (let i = 0; i < KEY_STOPS.length - 1; i++) {
    // 120 steps * 6 segments * 200ms = ~144 seconds (~2.5 mins)
    SMOOTH_PATH = SMOOTH_PATH.concat(interpolate(KEY_STOPS[i], KEY_STOPS[i + 1], 120));
}

console.log(`🚴 Loaded High-Res Path: ${SMOOTH_PATH.length} points.`);
console.log("🤖 Simulation Bot Pending... Waiting for Dispatch");

let currentInterval = null; // Track active simulation

socket.on('connect', () => {
    console.log("🔌 Bot Connected to Server");
});

// Listen for dispatch (Moved outside connect to prevent duplicates)
socket.on('dispatch_ride', (task) => {
    console.log(`🚀 Dispatch Received! Starting Ride: ${task.rideId} (Unsafe: ${task.isUnsafe})`);

    // Stop previous ride if running
    if (currentInterval) {
        console.log("🛑 Stopping previous simulation for new request.");
        clearInterval(currentInterval);
    }

    // 1. Interpolate Path (High Res)
    let path = [];
    const rawPath = task.path; // [{lat, lng}, ...] from OSRM

    // Simple interpolation between OSRM points to make it smooth
    for (let i = 0; i < rawPath.length - 1; i++) {
        path = path.concat(interpolate(rawPath[i], rawPath[i + 1], 4)); // 4 steps between nodes
    }

    // 2. Inject Deviation if Unsafe
    if (task.isUnsafe) {
        const midPoint = Math.floor(path.length / 2);
        console.log(`⚠️ Injecting Deviation starting at step ${midPoint}`);

        // Create a fake deviation path (veering North)
        const deviationStart = path[midPoint];
        for (let k = 1; k < 50; k++) {
            path[midPoint + k] = {
                lat: deviationStart.lat + (0.0001 * k), // Veers North
                lng: deviationStart.lng + (0.0001 * k),
                deviation: true // Flag for server
            };
        }
    }

    // 3. Start Loop
    let i = 0;
    currentInterval = setInterval(() => {
        if (i >= path.length) {
            console.log(`🏁 Ride ${task.rideId} Finished`);
            clearInterval(currentInterval);
            currentInterval = null;
            return;
        }

        const point = path[i];
        socket.emit('update_location', {
            rideId: task.rideId,
            lat: point.lat,
            lng: point.lng,
            deviation: point.deviation || false,
            driverId: "BOT_DRIVER"
        });
        i++;
    }, 60); // Speed (Fast Demo Mode)
});
