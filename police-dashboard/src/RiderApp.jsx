import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import io from 'socket.io-client';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix Default Leaflet Icon
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom Driver Icon (Helmet/Bike)
const driverIcon = L.divIcon({
    className: 'driver-icon',
    html: `<div style="background:white; border-radius:50%; padding: 4px; border: 2px solid black; font-size: 20px;">🛵</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
});

const socket = io('http://localhost:5000');
const RIDE_ID = "ride_patiala_001";

function Recenter({ lat, lng }) {
    const map = useMap();
    useEffect(() => {
        if (lat && lng) map.setView([lat, lng], 16);
    }, [lat, lng]);
    return null;
}

function RiderApp() {
    const [position, setPosition] = useState(null);
    const [alertMsg, setAlertMsg] = useState(null);

    useEffect(() => {
        socket.emit('join_ride', RIDE_ID);

        socket.on('location_update', (data) => {
            setPosition({ lat: data.lat, lng: data.lng });
        });

        // 🚨 Listen for Route Deviation Alerts
        socket.on('anomaly_alert', (data) => {
            setAlertMsg(data.msg);
            // Play warning sound
            const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
            audio.play().catch(e => console.error(e));
        });

        return () => {
            socket.off('location_update');
            socket.off('anomaly_alert');
        }
    }, []);

    return (
        <div className="flex justify-center items-center h-screen bg-gray-800 font-sans">
            {/* Mobile Frame */}
            <div className="w-[360px] h-[700px] bg-black rounded-[40px] shadow-2xl overflow-hidden border-[8px] border-gray-700 relative flex flex-col">

                {/* Header */}
                <div className="bg-slate-900 p-4 pt-8 border-b border-slate-800 flex justify-between items-center">
                    <div>
                        <h1 className="text-xl font-bold text-white">Rapido Captain</h1>
                        <p className="text-xs text-green-400">● Online</p>
                    </div>
                    <div className="text-2xl">🛵</div>
                </div>

                {/* Map */}
                <div className="flex-1 relative">
                    {position ? (
                        <MapContainer
                            center={[position.lat, position.lng]}
                            zoom={16}
                            zoomControl={false}
                            style={{ height: "100%", width: "100%" }}
                        >
                            <TileLayer
                                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                            />
                            <Marker position={[position.lat, position.lng]} icon={driverIcon} />
                            <Recenter lat={position.lat} lng={position.lng} />
                        </MapContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-slate-500">
                            Finding GPS...
                        </div>
                    )}

                    {/* 🚨 Deviation Alert Overlay */}
                    {alertMsg && (
                        <div className="absolute inset-0 bg-red-900/80 z-[1000] flex flex-col items-center justify-center p-6 text-center animate-pulse">
                            <div className="text-6xl mb-4">🚫</div>
                            <h2 className="text-2xl font-bold text-white mb-2">ROUTE DEVIATION DETECTED</h2>
                            <p className="text-white font-semibold">{alertMsg}</p>
                            <p className="text-white text-sm mt-4">Police & Support Team Notified.</p>
                        </div>
                    )}
                </div>

                {/* Bottom Panel */}
                <div className="bg-slate-900 p-4 pb-8">
                    <div className="flex justify-between items-center text-white mb-4">
                        <div>
                            <p className="text-xs text-slate-400">Destination</p>
                            <p className="font-bold">Urban Estate Phase 1</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-slate-400">Est. Time</p>
                            <p className="font-bold text-green-400">12 Mins</p>
                        </div>
                    </div>
                    <button className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg">
                        Navigate
                    </button>
                </div>
            </div>
        </div>
    );
}

export default RiderApp;
