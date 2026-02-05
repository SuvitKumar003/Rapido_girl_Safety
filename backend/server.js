const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const cors = require('cors');

// 🔌 PLUG & PLAY MODULE
const SafetyLayer = require('./src/services/SafetyLayer');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // allow frontend access
        methods: ["GET", "POST"]
    }
});

// Initialize the Safety Engine
const safetyEngine = new SafetyLayer(io);

console.log("-----------------------------------------");
console.log("   🛡️  RAPIDO SAFETY SHIELD INTERFACE    ");
console.log("       Status: ONLINE | Port: 5000       ");
console.log("-----------------------------------------");

io.on('connection', (socket) => {

    // 1. BOOKING (User Requests Ride)
    socket.on('request_ride', (data) => {
        const osrmUrl = `http://router.project-osrm.org/route/v1/driving/${data.pickup.lng},${data.pickup.lat};${data.drop.lng},${data.drop.lat}?overview=full&geometries=geojson`;

        http.get(osrmUrl, (resp) => {
            let chunkedData = '';
            resp.on('data', (chunk) => chunkedData += chunk);
            resp.on('end', () => {
                try {
                    const json = JSON.parse(chunkedData);
                    if (json.routes && json.routes.length > 0) {
                        const routeCoords = json.routes[0].geometry.coordinates.map(c => ({ lat: c[1], lng: c[0] }));

                        // Demo Logic: Scenario Counter
                        const rideCount = (global.rideCounter || 0) + 1;
                        global.rideCounter = rideCount;
                        const rideId = `ride_patiala_00${rideCount}`;
                        // 📹 DEMO LOGIC: Default to UNSAFE (So you see the alert immediately)
                        let isUnsafe = true;

                        // Check if developer toggled "Safe" via terminal
                        if (global.nextRideSafe) {
                            isUnsafe = false;
                            global.nextRideSafe = false;
                        }

                        console.log(`✅ Route Found! Dispatching Ride ${rideId} (Scenario: ${isUnsafe ? 'UNSAFE 🚨' : 'SAFE 🟢'})`);


                        // a) Notify Configured Safety Layer
                        const rideDetails = {
                            rideId: rideId,
                            driverName: "Vikram Singh",
                            vehicleNumber: `PB-11-A-11${rideCount < 10 ? '0' + rideCount : rideCount}`, // Privacy Masking (11XX)
                            passengerName: "Ananya Sharma", // Demo Name from "Women's App"
                            phone: "+91-98765-43210"
                        };
                        safetyEngine.initializeRide(rideDetails, routeCoords);

                        // b) Confirm to User
                        socket.emit('ride_confirmed', {
                            rideId: rideId,
                            driverName: `Driver ${rideCount}`,
                            vehicle: `PB-11-A-${1000 + rideCount}`,
                            eta: Math.round(json.routes[0].duration / 60) + " mins"
                        });

                        // c) Dispatch Bot (Demo Only)
                        io.emit('dispatch_ride', {
                            rideId: rideId,
                            path: routeCoords,
                            isUnsafe: isUnsafe
                        });

                    } else {
                        socket.emit('booking_error', { msg: "No route found." });
                    }
                } catch (e) { console.error(e); }
            });
        }).on("error", (err) => console.error(err));
    });

    // 2. LIVE UPDATES (From Driver/Bot)
    socket.on('update_location', (data) => {
        // Forward to specific rooms AND Global Dashboard
        // io.to(data.rideId).emit('location_update', data); <-- Old Room Only Logic
        io.emit('location_update', data); // <-- broadcast to all for Dashboard visibility

        // 🛡️ PASS TO SAFETY LAYER
        safetyEngine.processLocationUpdate(data.rideId, { lat: data.lat, lng: data.lng }, data.deviation);
    });

    // 3. SOS (Manual Trigger)
    socket.on('sos_trigger', (data) => {
        safetyEngine.triggerAlert(data.rideId, "MANUAL_SOS", null); // Fallback to old method for SOS
    });

    // 4. USER SAFETY RESPONSE (Access Check)
    socket.on('safety_response', (data) => {
        // data: { rideId, isSafe: boolean }
        safetyEngine.handleUserResponse(data.rideId, data.isSafe);
    });

    socket.on('join_ride', (rideId) => {
        socket.join(rideId);
        // On join, verify safety
        setTimeout(() => {
            io.emit('ride_secured', { rideId, msg: "👮 Women Cell Activated. Active Monitoring Started." });
        }, 1000);
    });
});

server.listen(5000, () => {
    console.log("Backend Server Running.");
    console.log("🎥 DEMO MODE: All rides are UNSAFE by default.");
    console.log("👉 Type 'safe' and hit Enter to make the next ride Safe.");
});

// Hidden Developer Menu
process.stdin.setEncoding('utf8');
process.stdin.on('data', (text) => {
    const input = text.trim();
    if (input === 'safe') {
        global.nextRideSafe = true;
        console.log("🟢 NEXT RIDE SET TO: SAFE");
    } else {
        console.log("Unknown command. Rides default to UNSAFE.");
    }
});
