import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import io from 'socket.io-client';
import L from 'leaflet';

// Fix for Leaflet Default Icon
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const socket = io('http://localhost:5000'); // Connect to Backend

// Stations List
const stations = [
    { name: "Civil Lines", lat: 30.3400, lng: 76.3860 },
    { name: "Urban Estate", lat: 30.3500, lng: 76.4300 },
    { name: "Tripuri", lat: 30.3650, lng: 76.3900 },
    { name: "Sadar", lat: 30.3250, lng: 76.4020 },
    { name: "Lahori Gate", lat: 30.3350, lng: 76.3950 },
    { name: "Kotwali", lat: 30.3400, lng: 76.4000 },
    { name: "Anaj Mandi", lat: 30.3300, lng: 76.3700 },
    { name: "Model Town", lat: 30.3550, lng: 76.3800 },
    { name: "Women Cell", lat: 30.3450, lng: 76.3850 },
    { name: "Passey Road", lat: 30.3600, lng: 76.4100 }
];

function LiveMap() {
    const [rides, setRides] = useState({});
    const [activeLogs, setActiveLogs] = useState([]);
    const [history, setHistory] = useState([]);
    const [showHistory, setShowHistory] = useState(false);

    const addLog = (msg, type = 'info') => {
        const timestamp = new Date().toLocaleTimeString();
        setActiveLogs(prev => [`[${timestamp}] ${msg}`, ...prev].slice(0, 10));
    };

    useEffect(() => {
        // Listen for location updates
        socket.on('location_update', (data) => {
            setRides(prev => {
                const prevRide = prev[data.rideId] || { history: [] };
                const newHistory = [...(prevRide.history || []), { lat: data.lat, lng: data.lng, deviation: data.deviation }];

                return {
                    ...prev,
                    [data.rideId]: {
                        ...prevRide,
                        ...data,
                        lastUpdate: Date.now(),
                        history: newHistory // 🆕 Store Trail
                    }
                };
            });
        });

        // Listen for Handover events
        socket.on('handoff_accept', (data) => {
            addLog(`HANDOVER: ${data.oldStation} -> ${data.stationName}`, 'info');
        });

        // 🚨 UNIVERSAL EMERGENCY ALERTS (Samsung & Mobile)
        socket.on('emergency_response_alert', (data) => {
            console.log("Emergency Alert Received:", data);
            triggerPanic(data.id || data.rideId, data, data.type.includes('SOS'));
        });

        const triggerPanic = (rideId, data, isSOS) => {
            // Play Siren Sound
            const audio = new Audio('https://cdn.pixabay.com/download/audio/2021/08/04/audio_12b0c7443c.mp3?filename=police-siren-2-89387.mp3');
            audio.play().catch(e => console.log("Audio play failed (user interaction needed):", e));

            // Set Data for Cyber Modal
            setAlertData({
                ...data,
                rideId,
                alertType: isSOS ? 'SOS EMERGENCY' : 'ROUTE DEVIATION',
                timestamp: new Date().toLocaleTimeString()
            });

            // Mark ride as panic in state
            setRides(prev => ({
                ...prev,
                [rideId]: { ...prev[rideId], status: 'PANIC' }
            }));
        };

        return () => {
            socket.off('emergency_response_alert');
        };
    }, []);

    const fetchHistory = async () => {
        try {
            const resp = await fetch('http://localhost:8080/api/incidents');
            const data = await resp.json();
            setHistory(data);
            setShowHistory(true);
        } catch (e) {
            console.error("Failed to fetch history", e);
            alert("Spring Boot Police Service is Offline. Ensure it is running on port 8080.");
        }
    };

    const activeRides = Object.values(rides);

    return (
        <div className="h-screen w-full relative font-sans">

            {/* 🚨 HIGH-FI CYBER MODAL */}
            {alertData && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md">
                    <div className="bg-slate-950 border-[3px] border-red-600 w-[700px] rounded-xl shadow-[0_0_100px_rgba(220,38,38,0.6)] relative overflow-hidden flex flex-col">

                        {/* Header */}
                        <div className="bg-red-600 text-white p-4 flex justify-between items-center animate-pulse">
                            <h2 className="text-3xl font-black tracking-[0.2em] uppercase flex items-center gap-4">
                                ⚠️ THREAT DETECTED
                            </h2>
                            <span className="font-mono text-xl font-bold">{alertData.timestamp}</span>
                        </div>

                        <div className="p-8 text-slate-200 font-mono relative">
                            {/* Scanning Line Animation */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-red-500/50 shadow-[0_0_20px_white]"></div>

                            <div className="grid grid-cols-2 gap-8 mb-8">
                                <div>
                                    <h4 className="text-red-500 text-xs uppercase tracking-widest mb-1">Alert Type</h4>
                                    <p className="text-2xl font-bold text-white mb-4">{alertData.alertType}</p>

                                    <h4 className="text-slate-500 text-xs uppercase tracking-widest mb-1">Jurisdiction</h4>
                                    <p className="text-xl text-blue-400">{alertData.jurisdiction || 'Unknown Area'}</p>
                                </div>
                                <div className="border border-red-900/50 bg-red-950/20 p-4 rounded-lg">
                                    <h4 className="text-red-400 text-sm uppercase border-b border-red-900/50 pb-2 mb-2">Target Vehicle</h4>
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-slate-500 text-xs">Vehicle No.</span>
                                            <span className="text-white font-bold">{alertData.details?.vehicleNumber || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500 text-xs">Driver</span>
                                            <span className="text-white font-bold">{alertData.details?.driverName || 'Identifying...'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Passenger Info */}
                            <div className="bg-slate-900 p-4 rounded border-l-4 border-yellow-500 mb-6">
                                <h4 className="text-yellow-500 text-xs uppercase tracking-widest mb-2">Subject (Passenger)</h4>
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-2xl font-bold text-white">{alertData.details?.passengerName || 'Unknown Passenger'}</p>
                                        <p className="text-sm text-slate-400">{alertData.details?.phone || 'No Phone Link'}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="bg-red-600/20 text-red-500 px-3 py-1 rounded text-xs font-bold border border-red-600/30">HIGH RISK</span>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            {alertData.dispatchLink ? (
                                <a
                                    href={alertData.dispatchLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 text-white font-bold py-4 rounded shadow-lg transform hover:scale-[1.02] transition-all uppercase tracking-widest text-lg text-center flex items-center justify-center gap-2"
                                >
                                    🧭 Navigate to Site
                                </a>
                            ) : (
                                <button onClick={() => setAlertData(null)} className="flex-1 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white font-bold py-4 rounded shadow-lg transform hover:scale-[1.02] transition-all uppercase tracking-widest text-lg">
                                    🚨 Dispatch Patrol Unit
                                </button>
                            )}
                            <button onClick={() => setAlertData(null)} className="px-8 border border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-500 rounded font-bold uppercase tracking-wider text-sm">
                                Dismiss
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Stats Panel */}
            <div className="absolute top-4 left-4 z-[1000] bg-slate-900/90 p-6 rounded-2xl shadow-2xl border border-slate-700 backdrop-blur-md">
                <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-500">
                    🛡️ Universal Safety Shield
                </h1>
                <div className="mt-4 space-y-2">
                    <p className="text-slate-300 text-sm">Active Rides: <span className="text-white font-bold text-lg">{activeRides.length}</span></p>
                    <p className="text-slate-300 text-sm">Police Stations: <span className="text-blue-400 font-bold text-lg">{stations.length}</span></p>
                </div>
                <div className="mt-4 flex flex-col gap-2">
                    <button
                        onClick={fetchHistory}
                        className="bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-600/30 px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2"
                    >
                        📊 Safety Analytics (Spring Boot)
                    </button>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        <span className="text-[10px] text-green-500 font-bold tracking-widest uppercase">System Operational</span>
                    </div>
                </div>
            </div>

            {/* 📊 HISTORY MODAL (ENTERPRISE ANALYTICS) */}
            {showHistory && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-slate-950 border border-slate-800 w-full max-w-4xl max-h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                            <div>
                                <h2 className="text-xl font-bold text-white">🏙️ Enterprise Incident Management</h2>
                                <p className="text-slate-400 text-xs mt-1">Fetched from Spring Boot Police Service on Port 8080</p>
                            </div>
                            <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-white text-2xl">&times;</button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6">
                            <table className="w-full text-left text-sm">
                                <thead className="text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-800">
                                    <tr>
                                        <th className="pb-3 px-2">Timestamp</th>
                                        <th className="pb-3 px-2">Incident Type</th>
                                        <th className="pb-3 px-2">Passenger</th>
                                        <th className="pb-3 px-2">Vehicle</th>
                                        <th className="pb-3 px-2">Jurisdiction</th>
                                        <th className="pb-3 px-2">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="text-slate-300">
                                    {history.map((item, idx) => (
                                        <tr key={idx} className="border-b border-slate-900 hover:bg-slate-900/30 transition-colors">
                                            <td className="py-4 px-2">{new Date(item.timestamp).toLocaleString()}</td>
                                            <td className="py-4 px-2">
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold ${item.type.includes('SOS') ? 'bg-red-600/20 text-red-500' : 'bg-yellow-600/20 text-yellow-500'}`}>
                                                    {item.type}
                                                </span>
                                            </td>
                                            <td className="py-4 px-2 font-bold text-white">{item.passengerName}</td>
                                            <td className="py-4 px-2">{item.vehicleNumber}</td>
                                            <td className="py-4 px-2 text-blue-400">{item.jurisdiction}</td>
                                            <td className="py-4 px-2">
                                                <a href={item.dispatchLink} target="_blank" className="text-cyan-400 hover:underline">View Map</a>
                                            </td>
                                        </tr>
                                    ))}
                                    {history.length === 0 && (
                                        <tr>
                                            <td colSpan="6" className="py-10 text-center text-slate-600 italic">No incidents recorded in the cloud database yet.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            <MapContainer
                center={[30.3500, 76.3900]} // Centered on Patiala
                zoom={13}
                scrollWheelZoom={true}
                className="h-full w-full"
                style={{ height: "100vh", width: "100%" }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />

                {/* 🚓 Render Police Stations */}
                {stations.map((st, idx) => (
                    <Marker key={`st-${idx}`} position={[st.lat, st.lng]} icon={
                        L.divIcon({
                            className: 'custom-icon',
                            html: `<div style="background-color: #3b82f6; width: 12px; height: 12px; border-radius: 50%; box-shadow: 0 0 10px #3b82f6;"></div>`
                        })
                    }>
                        <Popup className="custom-popup">
                            <div className="p-1">
                                <h3 className="font-bold text-slate-800">👮 {st.name}</h3>
                                <p className="text-xs text-slate-500">Jurisdiction: 2km</p>
                            </div>
                        </Popup>
                    </Marker>
                ))}

                {/* 🛤️ PATH HISTORY (Blue = Safe, Red = Unsafe) */}
                {Object.values(rides).map(ride => {
                    if (!ride.history || ride.history.length < 2) return null;

                    // Break history into segments to color them individually
                    return ride.history.map((point, i) => {
                        if (i === 0) return null;
                        const prev = ride.history[i - 1];
                        const isDeviated = point.deviation || prev.deviation;

                        return (
                            <Polyline
                                key={`${ride.rideId}-seg-${i}`}
                                positions={[[prev.lat, prev.lng], [point.lat, point.lng]]}
                                pathOptions={{
                                    color: isDeviated ? '#ef4444' : '#3b82f6', // Red or Blue
                                    weight: 4,
                                    opacity: 0.8
                                }}
                            />
                        );
                    });
                })}

                {/* 🛵 Render Active Rides */}
                {activeRides.map((ride) => (
                    <Marker key={ride.rideId} position={[ride.lat, ride.lng]} icon={
                        ride.status === 'PANIC'
                            ? L.divIcon({
                                className: 'panic-marker',
                                html: `<div class="relative">
                                         <div class="pulse-ring"></div>
                                         <div class="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center border-4 border-white shadow-xl z-20 relative">
                                            <span class="text-xl">⚠️</span>
                                         </div>
                                         <div class="absolute -bottom-2 -right-2 bg-black text-white text-[10px] font-bold px-1 rounded">THREAT</div>
                                       </div>`,
                                iconSize: [40, 40],
                                iconAnchor: [20, 20]
                            })
                            : DefaultIcon
                    }>
                        <Popup>
                            <div>
                                <h3 className="font-bold">Ride #{ride.rideId.slice(0, 4)}...</h3>
                                <p className={`text-sm font-bold ${ride.status === 'PANIC' ? 'text-red-600' : 'text-green-600'}`}>
                                    {ride.status === 'PANIC' ? '🆘 SOS TRIGGERED' : '🛡️ Monitored'}
                                </p>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}

export default LiveMap;
