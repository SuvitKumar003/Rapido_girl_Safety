const io = require('socket.io-client');
const socket = io('http://localhost:5000');

socket.on('connect', () => {
    console.log("🔌 Samsung Test Bot Connected");

    // 1. Setup Listener First
    socket.on('emergency_response_alert', (data) => {
        console.log("\n🚨 ALERT RECEIVED BY DASHBOARD:");
        console.log(`Type: ${data.type}`);
        console.log(`Msg: ${data.msg}`);
        console.log(`Dispatch Link: ${data.dispatchLink}`);
        console.log(`Jurisdiction: ${data.jurisdiction}`);

        if (data.dispatchLink && data.dispatchLink.includes("google.com/maps")) {
            console.log("✅ Dispatch Link Verification: PASSED");
        } else {
            console.log("❌ Dispatch Link Verification: FAILED");
        }

        setTimeout(() => {
            console.log("\n📡 Triggering Crash Detection...");
            socket.emit('samsung_device_event', {
                id: 'user_samsung_002',
                type: 'CRASH_DETECTED',
                location: { lat: 30.3550, lng: 76.3750 }
            });
            setTimeout(() => { socket.disconnect(); }, 1000);
        }, 1000);
    });

    // 2. Trigger Event
    console.log("📡 Triggering Samsung Biometric SOS...");
    socket.emit('samsung_device_event', {
        id: 'user_samsung_001',
        type: 'BIOMETRIC_SOS',
        location: { lat: 30.3450, lng: 76.3850 }
    });
});

socket.on('disconnect', () => {
    console.log("❌ Disconnected");
});
