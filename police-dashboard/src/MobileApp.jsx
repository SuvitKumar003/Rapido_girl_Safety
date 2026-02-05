import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import io from 'socket.io-client';
import L from 'leaflet';

// Fix icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

const socket = io('http://localhost:5000');
const RIDE_ID = "ride_patiala_001";

// Component to auto-center map on bike
function Recenter({ lat, lng }) {
    const map = useMap();
    useEffect(() => {
        if (lat && lng) map.setView([lat, lng], 15);
    }, [lat, lng]);
    return null;
}

function MobileBase() {
    const [view, setView] = useState('BOOKING'); // BOOKING | RIDE
    const [monitoredBy, setMonitoredBy] = useState('Waiting for Ride...');
    const [position, setPosition] = useState(null); // { lat, lng }
    const [showToast, setShowToast] = useState(null); // Message to show
    const [rideDetails, setRideDetails] = useState(null);
    const [safetyPopup, setSafetyPopup] = useState(null); // 🆕 Fix: Added missing state
    const [status, setStatus] = useState("Looking for riders..."); // 🆕 Fix: Added missing state

    // Patiala Coords
    const LOC_THAPAR = { name: "Thapar University", lat: 30.3564, lng: 76.3647 };
    const LOC_URBAN = { name: "Urban Estate", lat: 30.3500, lng: 76.4300 };

    useEffect(() => {
        // socket connect logic...
        socket.on('ride_confirmed', (data) => {
            setRideDetails(data);
            setView('RIDE');
            socket.emit('join_ride', data.rideId);
            setMonitoredBy("Connecting to Women Cell...");
        });

        // ... existing listeners ...
        socket.on('location_update', (data) => {
            setPosition({ lat: data.lat, lng: data.lng });
        });

        socket.on('ride_secured', (data) => {
            setMonitoredBy("🛡️ SECURE: Police Watching (Women Cell)");
            setShowToast(data.msg);
            setTimeout(() => setShowToast(null), 4000);
        });

        socket.on('safety_status', (data) => {
            // In real app we'd map ID to Name, for now simplified
            setMonitoredBy(data.monitoredBy);
        });

        socket.on('handoff_accept', (data) => {
            setMonitoredBy(data.stationName);
            setShowToast(`🔁 Handover: Monitoring transferred to ${data.stationName}`);
            setTimeout(() => setShowToast(null), 3000);
        });

        socket.on('anomaly_alert', (data) => {
            setMonitoredBy("⚠️ ROUTE DEVIATION DETECTED");
            setShowToast("🚨 ALERT: Rider is going off-track! Verify Safety.");
            const audio = new Audio('https://cdn.pixabay.com/download/audio/2021/08/04/audio_12b0c7443c.mp3?filename=police-siren-2-89387.mp3');
            audio.play().catch(e => console.log("Audio needed user interaction"));
        });

        // 🆕 LISTENER FOR SAFETY POPUP
        socket.on('safety_check_request', (data) => {
            setSafetyPopup(data);
        });

        return () => {
            socket.off('ride_confirmed');
            socket.off('location_update');
            socket.off('safety_status');
            socket.off('handoff_accept');
            socket.off('anomaly_alert');
            socket.off('booking_error');
            socket.off('safety_check_request');
            socket.off('rider_warning');
        }
    }, []);

    const handleSafetyResponse = (isSafe) => {
        if (!rideDetails?.rideId) return;

        console.log(`User responded: ${isSafe ? "SAFE" : "NOT SAFE"}`);
        socket.emit('safety_response', {
            rideId: rideDetails.rideId,
            isSafe: isSafe
        });
        setSafetyPopup(null);
    };

    const handleBook = () => {
        setStatus("Finding a Captain...");
        socket.emit('request_ride', { pickup: LOC_THAPAR, drop: LOC_URBAN });
        setShowToast("🔄 Finding Captain...");
    };

    const handleShare = () => {
        alert("✅ Live Ride Details shared with trusted contacts via WhatsApp & SMS.");
    };

    const handleSOS = () => {
        const confirm = window.confirm("🚨 Are you sure you want to trigger SOS?");
        if (confirm) {
            socket.emit('sos_trigger', { rideId: RIDE_ID });
            alert("🚓 SOS SENT! Police are tracking you with High Priority.");
        }
    };

    return (
        <div className="flex justify-center items-center h-screen bg-gray-200 font-sans">
            {/* 🚨 SAFETY CHECK POPUP */}
            {safetyPopup && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
                    <div className="bg-white w-full max-w-sm rounded-[30px] p-6 shadow-2xl border-4 border-yellow-400 animate-bounce-short">
                        <div className="text-center">
                            <div className="text-5xl mb-4">⚠️</div>
                            <h2 className="text-2xl font-black text-slate-800 mb-2">ROUTE DEVIATION</h2>
                            <p className="text-slate-600 mb-6 font-medium">Is the route taken being safe or is there any problem?</p>

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => handleSafetyResponse(true)}
                                    className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-xl text-lg shadow-lg transform active:scale-95 transition-all"
                                >
                                    ✅ Safe
                                </button>
                                <button
                                    onClick={() => handleSafetyResponse(false)}
                                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl text-lg shadow-lg transform active:scale-95 transition-all"
                                >
                                    ⚠️ Problem
                                </button>
                            </div>
                            <p className="mt-4 text-xs text-slate-400">Reporting a problem alerts Police immediately.</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="w-[360px] h-[700px] bg-white rounded-[40px] shadow-2xl overflow-hidden border-[12px] border-gray-900 relative flex flex-col" style={{ width: '360px', height: '700px' }}>

                {/* Dynamic Island */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-black rounded-b-2xl z-50"></div>

                {/* Toast */}
                {showToast && (
                    <div className="absolute top-10 left-4 right-4 bg-gray-900/90 text-white text-xs p-3 rounded-xl shadow-lg z-[100] border border-green-500/50 backdrop-blur-sm animate-bounce">
                        {showToast}
                    </div>
                )}

                {view === 'BOOKING' ? (
                    // 🚕 BOOKING UI
                    <div className="flex-1 flex flex-col p-6 pt-16 bg-slate-50">
                        <h1 className="text-3xl font-bold text-slate-800 mb-6">Where to?</h1>
                        <div className="space-y-4">
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                                <p className="text-xs text-slate-400 font-bold uppercase">Pickup</p>
                                <div className="font-semibold text-lg">🟢 Thapar University</div>
                            </div>
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                                <p className="text-xs text-slate-400 font-bold uppercase">Drop Off</p>
                                <div className="font-semibold text-lg">🔴 Urban Estate</div>
                            </div>
                        </div>

                        <div className="mt-8">
                            <p className="text-xs font-bold text-slate-500 mb-2">SUGGESTED RIDE</p>
                            <div className="bg-white p-4 rounded-xl shadow-md border-l-4 border-yellow-400 flex justify-between items-center">
                                <div>
                                    <h3 className="font-bold text-lg">Rapido Bike</h3>
                                    <p className="text-xs text-slate-500">2 mins away</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-xl">₹45</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-auto">
                            <button onClick={handleBook} className="w-full bg-yellow-400 text-black font-bold py-4 rounded-xl text-lg hover:bg-yellow-300 transition shadow-lg">
                                Book Rapido
                            </button>
                        </div>
                    </div>
                ) : (
                    // 🗺️ RIDE UI (Existing)
                    <>
                        <div className="bg-yellow-400 p-6 pt-10 pb-4 shadow-sm z-10">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h1 className="text-2xl font-extrabold text-black tracking-tight">Rapido</h1>
                                    <div className="flex items-center gap-1">
                                        <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
                                        <p className="text-xs font-bold text-green-800 uppercase tracking-wider">Safety Shield Active</p>
                                    </div>
                                </div>
                                <div className="text-xl">👤</div>
                            </div>
                        </div>

                        <div className="flex-1 relative bg-slate-100">
                            {position ? (
                                <MapContainer center={[position.lat, position.lng]} zoom={15} zoomControl={false} style={{ height: "100%", width: "100%" }}>
                                    <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                                    <Marker position={[position.lat, position.lng]} />
                                    <Recenter lat={position.lat} lng={position.lng} />
                                </MapContainer>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                    <div className="animate-spin text-4xl mb-2">🚴</div>
                                    <p>Connecting to Driver...</p>
                                    <p className="text-xs font-bold text-slate-800 mt-2">{rideDetails?.driverName} ({rideDetails?.vehicle})</p>
                                </div>
                            )}
                        </div>

                        {/* Bottom Logic... */}
                        <div className="bg-white p-5 pb-8 rounded-t-3xl shadow-[0_-5px_30px_rgba(0,0,0,0.15)] z-20">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">MONITORED BY POLICE</p>
                                    <h3 className="text-lg font-bold text-slate-800 leading-tight">
                                        {monitoredBy.replace('Station', '')}
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-1">Live Location Sharing On</p>
                                </div>
                                <div className="h-12 w-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 text-xl shadow-sm border border-blue-100">
                                    👮‍♂️
                                </div>
                            </div>
                            <div className="space-y-3">
                                <button onClick={handleShare} className="w-full bg-slate-100 py-3 rounded-xl font-bold text-slate-700 text-sm hover:bg-slate-200 transition active:scale-95">
                                    Share Ride Details
                                </button>
                                <button onClick={handleSOS} className="w-full bg-red-500 text-white py-3 rounded-xl font-bold text-sm shadow-red-200 shadow-lg animate-pulse active:bg-red-600 active:scale-95">
                                    SOS / EMERGENCY
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default MobileBase;
