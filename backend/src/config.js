
// This file acts as the configuration for the "Plug & Play" module.
// In a real scenario, this could be loaded from a DB or specific to the deployed region.

module.exports = {
    // Current Operational Jurisdiction
    REGION_NAME: "Patiala, Punjab",

    // Safety Thresholds
    THRESHOLDS: {
        DEVIATION_METERS: 100,      // Alert if rider deviates > 100m
        STOPPAGE_SECONDS: 120,      // Alert if unexplained stop > 2 mins
        ESCALATION_TIMEOUT: 60      // Escalate to Women Cell if no response in 60s
    },

    // Known Safe Locations (Police Stations / Hospitals) - "Safe Havens"
    // Ideally fetched from Google Maps Places API
    SAFE_HAVENS: [
        { id: 'st_patiala_01', name: 'Kotwali Police Station', lat: 30.3416, lng: 76.3932 },
        { id: 'st_patiala_02', name: 'Civil Lines Police Station', lat: 30.3418, lng: 76.3851 },
        { id: 'st_patiala_03', name: 'Sadar Police Station', lat: 30.3398, lng: 76.4021 },
        { id: 'st_patiala_04', name: 'Women Cell Patiala', lat: 30.3484, lng: 76.3814 },
        { id: 'st_patiala_05', name: 'Traffic Police Lines', lat: 30.3551, lng: 76.3712 },
        { id: 'st_patiala_06', name: 'Passey Road Police Station', lat: 30.3528, lng: 76.3980 },
        { id: 'st_patiala_07', name: 'Thapar Police Post', lat: 30.3562, lng: 76.3644 }, // Near Thapar
        { id: 'st_patiala_08', name: 'Urban Estate Police Station', lat: 30.3505, lng: 76.4290 } // Near Urban Estate
    ]
};
