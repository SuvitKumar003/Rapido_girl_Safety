const geolib = require('geolib');
const CONFIG = require('../config');
const Store = require('./InMemoryStore');
const axios = require('axios'); // For Spring Boot communication
const logger = require('./Logger');

/**
 * UNIVERSAL SAFETY SHIELD
 * ---------------------------
 * This class encapsulates all safety logic for vehicle and personal monitoring.
 * Design: Plug-and-play middleware for any mobility or personal safety app.
 */
class SafetyLayer {
    constructor(io) {
        this.io = io;
        this.HEARTBEAT_TIMEOUT = 15000; // 15s timeout for signal loss
        this.POLICE_SERVICE_URL = process.env.POLICE_SERVICE_URL || 'http://localhost:8080/api/incidents';
        this.API_KEY = process.env.SAMSUNG_KNOX_API_KEY || "SAMSUNG_SECURE_KNOX_007";
        this.RETRY_INTERVAL = parseInt(process.env.RETRY_INTERVAL_MS) || 10000;
        this._setupAlertListener();
    }

    /**
     * Start monitoring a new session (Ride/Walk/Solo).
     */
    async initializeMonitor(details, plannedPath) {
        const id = details.rideId || details.userId;
        const startLoc = plannedPath[0];
        const initialGuardian = await this._findNearestStation(startLoc);

        const monitorData = {
            path: plannedPath,
            guardian: initialGuardian,
            status: 'SAFE',
            details: details,
            riskScore: 0,
            lastLocation: startLoc,
            lastUpdate: Date.now(),
            history: [startLoc],
            escalationStage: 'NORMAL'
        };

        await Store.saveMonitor(id, monitorData);

        console.log(`🛡️ SAFETY SHIELD: Monitoring active for ${id}. Primary Responder: ${initialGuardian.name}`);

        // For demo dashboard:
        this.io.emit('emergency_response_alert', {
            type: 'MONITORING_STARTED',
            msg: `🔵 NEW SESSION: Secured monitoring initiated.`,
            id: id,
            stationId: initialGuardian.id
        });
    }

    /**
     * Process real-time location with GPS Drift Filtering.
     */
    async processLocationUpdate(id, location, isSimulatedDeviation = false) {
        const monitor = await Store.getMonitor(id);
        if (!monitor) return;

        // 1. Connectivity Heartbeat Update
        monitor.lastUpdate = Date.now();

        // 2. GPS Drift Filter (Simple Moving Average or Distance Threshold)
        const distanceMoved = geolib.getDistance(monitor.lastLocation, location);
        if (distanceMoved < 5 && !isSimulatedDeviation) {
            return; // Ignore jitter < 5m
        }

        monitor.lastLocation = location;
        monitor.history.push(location);

        // 3. Dynamic Handover
        const newGuardian = await this._findNearestStation(location);
        if (newGuardian.id !== monitor.guardian.id) {
            const oldGuardian = monitor.guardian;
            monitor.guardian = newGuardian;

            this.io.emit('handoff_accept', {
                stationName: newGuardian.name,
                oldStation: oldGuardian.name,
                id: id
            });
        }

        // 4. Anomaly Detection Logic
        if (isSimulatedDeviation) {
            if (monitor.escalationStage === 'NORMAL') {
                await this._initiateSafetyCheck(id, monitor);
            } else if (monitor.escalationStage === 'VERIFIED_UNSAFE') {
                this.triggerAlert(id, "ROUTE_DEVIATION", location);
            }
        }

        await Store.saveMonitor(id, monitor);
    }

    async _initiateSafetyCheck(id, monitor) {
        if (monitor.escalationStage === 'PENDING_RESPONSE') return;

        console.log(`⚠️ ANOMALY: Requesting user verification for ${id}`);
        monitor.escalationStage = 'PENDING_RESPONSE';
        await Store.saveMonitor(id, monitor);

        this.io.to(id).emit('safety_check_request', {
            msg: "⚠️ Protocol Deviation Detected. Confirm Safety Status.",
            type: "DEVIATION"
        });

        // Timeout for auto-escalation (Samsung-level safety)
        setTimeout(async () => {
            const current = await Store.getMonitor(id);
            if (current && current.escalationStage === 'PENDING_RESPONSE') {
                console.log(`🚨 AUTO-ESCALATION: No response from user ${id}`);
                this.triggerAlert(id, "NO_RESPONSE_AUTO_ESCALATE", current.lastLocation);
            }
        }, CONFIG.THRESHOLDS.ESCALATION_TIMEOUT * 1000);
    }

    async handleUserResponse(id, isSafe) {
        const monitor = await Store.getMonitor(id);
        if (!monitor) return;

        if (isSafe) {
            console.log(`✅ User ${id} verified SAFE.`);
            monitor.escalationStage = 'USER_SAID_SAFE';
            setTimeout(async () => {
                const m = await Store.getMonitor(id);
                if (m) { m.escalationStage = 'NORMAL'; await Store.saveMonitor(id, m); }
            }, 15000);
        } else {
            console.log(`🚨 User ${id} verified UNSAFE! DISPATCHING.`);
            monitor.escalationStage = 'VERIFIED_UNSAFE';
            this.triggerAlert(id, "USER_CONFIRMED_THREAT", monitor.lastLocation);
        }
        await Store.saveMonitor(id, monitor);
    }

    async triggerAlert(id, type, location) {
        let monitor = await Store.getMonitor(id);

        // If unknown device triggers SOS, create a placeholder monitor
        if (!monitor) {
            logger.info(`📡 UNKNOWN DEVICE SOS: Creating transient monitor for ${id}`);
            monitor = {
                id: id,
                status: 'SAFE',
                lastLocation: location,
                lastUpdate: Date.now(),
                details: { passengerName: "Samsung User", vehicleNumber: "DEVICE_DIRECT" },
                guardian: (await Store.getStations())[0] // Default to first station
            };
        }

        if (monitor.status === 'ALERT') return;

        monitor.status = 'ALERT';
        const msg = type === "USER_CONFIRMED_THREAT" ? "🚨 ACTIVE THREAT VERIFIED BY USER" : "⚠️ AUTOMATED EMERGENCY DISPATCH";

        // Generate Automated Dispatch Link (Google Maps Navigation)
        const dispatchLink = `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}&travelmode=driving`;

        // 👮 ENTERPRISE REPORTING: Store & Forward Pattern (Resilience)
        const incidentPayload = {
            sessionId: id,
            type: type,
            message: msg,
            passengerName: monitor.details.passengerName,
            vehicleNumber: monitor.details.vehicleNumber,
            jurisdiction: monitor.guardian.name,
            dispatchLink: dispatchLink,
            latitude: location.lat,
            longitude: location.lng
        };

        this.sendToPoliceService(incidentPayload);

        logger.warn(`🚨 EMERGENCY DISPATCH: ${type} for ${id}`);

        this.io.emit('emergency_response_alert', {
            id: id,
            type: type,
            msg: msg,
            details: monitor.details,
            location: location,
            dispatchLink: dispatchLink,
            jurisdiction: monitor.guardian.name
        });
        await Store.saveMonitor(id, monitor);
    }

    async sendToPoliceService(payload) {
        try {
            await axios.post(this.POLICE_SERVICE_URL, payload, {
                headers: { 'x-api-key': this.API_KEY }
            });
            logger.info(`🏙️ ENTERPRISE: Incident logged for ${payload.sessionId} in Police Microservice.`);
        } catch (error) {
            logger.error(`⚠️ ENTERPRISE NETWORK ERROR: Police Service Unreachable for ${payload.sessionId}. Queuing incident...`);
            this.queueIncident(payload);
        }
    }

    queueIncident(payload) {
        if (!this.retryQueue) this.retryQueue = [];
        this.retryQueue.push(payload);

        if (!this.retryInterval) {
            logger.info(`🔄 STARTING RETRY WORKER: Will attempt to sync every ${this.RETRY_INTERVAL}ms.`);
            this.retryInterval = setInterval(() => this.processRetryQueue(), this.RETRY_INTERVAL);
        }
    }

    async processRetryQueue() {
        if (this.retryQueue.length === 0) return;

        logger.info(`🔄 RETRY WORKER: Attempting to sync ${this.retryQueue.length} pending incidents...`);
        const item = this.retryQueue[0]; // Peek

        try {
            await axios.post(this.POLICE_SERVICE_URL, item, {
                headers: { 'x-api-key': this.API_KEY }
            });
            logger.info(`✅ RETRY SUCCESS: Synced incident for ${item.sessionId} to Cloud.`);
            this.retryQueue.shift(); // Remove on success

            if (this.retryQueue.length === 0) {
                clearInterval(this.retryInterval);
                this.retryInterval = null;
                logger.info("✅ RETRY WORKER: Queue empty. Going to sleep.");
            }
        } catch (e) {
            logger.warn("❌ RETRY FAILED: Police Service still down. Waiting...");
        }
    }

    async _findNearestStation(location) {
        const stations = await Store.getStations();
        const coords = stations.map(s => ({ lat: s.location.coordinates[1], lng: s.location.coordinates[0], id: s._id }));
        const nearestCoord = geolib.findNearest(location, coords);
        const station = stations.find(s => s._id === nearestCoord.id);
        return { id: station._id, name: station.name, lat: station.location.coordinates[1], lng: station.location.coordinates[0] };
    }

    async checkHeartbeats() {
        const now = Date.now();
        const allMonitors = await Store.getAllMonitors();

        for (const monitor of allMonitors) {
            if (monitor.status !== 'SAFE') continue;

            if (now - monitor.lastUpdate > this.HEARTBEAT_TIMEOUT) {
                console.log(`📡 SIGNAL LOSS: ${monitor.id} lost contact.`);
                this.triggerAlert(monitor.id, "SIGNAL_LOSS_DETECTED", monitor.lastLocation);
            }
        }
    }
}

module.exports = SafetyLayer;
