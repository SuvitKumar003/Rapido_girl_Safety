/**
 * SAMSUNG ON-DEVICE SAFETY SDK (Mock)
 * ----------------------------------
 * This module simulates the on-device intelligence found in Samsung Mobile devices.
 * Features:
 * 1. Biometric SOS Pulse
 * 2. Accelerometer-based Crash Detection
 * 3. Heartbeat Monitor (Device-to-Cloud)
 */
class SamsungExtension {
    constructor(safetyEngine) {
        this.safetyEngine = safetyEngine;
    }

    /**
     * Simulate a Device-Level Trigger (Knox)
     */
    simulateDeviceEvent(id, type, location) {
        console.log(`📱 SAMSUNG INTELLIGENCE: [${type}] detected for user ${id}`);

        switch (type) {
            case 'CRASH_DETECTED':
                this.safetyEngine.triggerAlert(id, "PROACTIVE_CRASH_DISPATCH", location);
                break;
            case 'BIOMETRIC_SOS':
                this.safetyEngine.triggerAlert(id, "KNOX_BIOMETRIC_SOS", location);
                break;
            case 'SHAKE_TO_ALERT':
                this.safetyEngine.triggerAlert(id, "SHAKE_TRIGGERED_EMERGENCY", location);
                break;
            default:
                console.warn("Unknown Samsung Device Event");
        }
    }
}

module.exports = SamsungExtension;
