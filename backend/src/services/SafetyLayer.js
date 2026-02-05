const geolib = require('geolib');
const CONFIG = require('../config');

/**
 * SAFETY LAYER (Microservice)
 * ---------------------------
 * This class encapsulates all safety logic.
 * It is designed to be "plugged in" to any ride-sharing backend (Rapido, Uber, Ola).
 * 
 * Usage:
 * const safety = new SafetyLayer(io);
 * safety.monitorRide(rideId, routePath);
 */
class SafetyLayer {
    constructor(io) {
        this.io = io;
        this.activeRides = new Map(); // Store state: { rideId: { path, lastLocation, status } }
    }

    /**
     * Start monitoring a new ride.
     * @param {Object} rideDetails - { rideId, driverName, vehicleNumber, passengerName }
     * @param {Array} plannedPath - Array of {lat, lng} coordinates
     */
    initializeRide(rideDetails, plannedPath) {
        const rideId = rideDetails.rideId;
        // Find nearest Police Station to START location
        const startLoc = plannedPath[0];
        const initialGuardian = this._findNearestStation(startLoc);

        this.activeRides.set(rideId, {
            path: plannedPath,
            guardian: initialGuardian,
            status: 'SAFE',
            details: rideDetails, // 🆕 Store Details
            riskScore: 0
        });

        console.log(`🛡️ SAFETY LAYER: Initialized monitoring for ${rideId}. Guardian: ${initialGuardian.name}`);

        // Notify the relevant Police Station immediately
        this.io.emit('women_cell_alert', {
            msg: `🔵 NEW RIDE: Monitoring Started in your jurisdiction.`,
            rideId: rideId,
            stationId: initialGuardian.id
        });
    }

    /**
     * Process a real-time location update.
     */
    processLocationUpdate(rideId, location, isSimulatedDeviation = false) {
        const ride = this.activeRides.get(rideId);
        if (!ride) return;

        // 1. Dynamic Handover
        const newGuardian = this._findNearestStation(location);
        if (newGuardian.id !== ride.guardian.id) {
            this.io.emit('handoff_accept', {
                stationName: newGuardian.name,
                oldStation: ride.guardian.name,
                rideId: rideId
            });
            ride.guardian = newGuardian;
        }

        // 2. Anomaly Detection Logic
        if (isSimulatedDeviation) {
            // Check current escalation stage
            if (!ride.escalationStage || ride.escalationStage === 'NORMAL') {
                // STAGE 1: Visual Deviation Detected -> Ask User
                this._initiateSafetyCheck(rideId);
            } else if (ride.escalationStage === 'VERIFIED_UNSAFE') {
                // STAGE 3: User Confirmed Danger -> Police Alert
                this.triggerAlert(rideId, "CONFIRMED_THREAT", location);
            }
            // If 'USER_SAID_SAFE', we ignore this deviation (False Alarm)
        }
    }

    _initiateSafetyCheck(rideId) {
        const ride = this.activeRides.get(rideId);
        if (ride.escalationStage === 'PENDING_RESPONSE') return; // Already asked

        console.log(`⚠️ DEVIATION: Asking User if they are safe...`);
        ride.escalationStage = 'PENDING_RESPONSE';

        // Emit logic to MobileApp to show "Are you Safe?" Popup
        this.io.to(rideId).emit('safety_check_request', {
            msg: "⚠️ Route Deviation Detected. Are you safe?"
        });
    }

    // Called via Socket when User clicks Yes/No
    handleUserResponse(rideId, isSafe) {
        const ride = this.activeRides.get(rideId);
        if (!ride) return;

        if (isSafe) {
            console.log(`✅ User verified SAFE. Silencing alerts.`);
            ride.escalationStage = 'USER_SAID_SAFE';
            // Optional: Reset after 30s so we can detect *next* deviation
            setTimeout(() => { ride.escalationStage = 'NORMAL'; }, 10000);
        } else {
            console.log(`🚨 User verified UNSAFE! Escalating to Police.`);
            ride.escalationStage = 'VERIFIED_UNSAFE';
            // Trigger Police immediately (will happen on next location update or now)
            // We pass null for location here as we'll pick it up next tick, or could cache it.
            // Better to wait for next tick or store lastLoc.
        }
    }

    triggerAlert(rideId, type, location) {
        const ride = this.activeRides.get(rideId);
        if (ride.status === 'ALERT') return; // Don't spam

        ride.status = 'ALERT';
        console.log(`🚨 POLICE DISPATCHED: ${type} for ${rideId}`);

        this.io.emit('anomaly_alert', {
            rideId: rideId,
            type: type,
            msg: `⚠️ ROUTE DEVIATION VERIFIED BY USER!`,
            details: ride.details,
            location: location, // 📍 Includes Lat/Lng
            jurisdiction: ride.guardian.name
        });
    }

    _findNearestStation(location) {
        // Use geolib to find nearest station from CONFIG
        const nearest = geolib.findNearest(location, CONFIG.SAFE_HAVENS);
        // Find the full object
        return CONFIG.SAFE_HAVENS.find(s => s.lat === nearest.lat && s.lng === nearest.lng);
    }
}

module.exports = SafetyLayer;
