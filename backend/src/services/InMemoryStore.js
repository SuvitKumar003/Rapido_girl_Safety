// 🛠️ IN-MEMORY STORE FOR DEMO (Patiala Edition - Extended)
const stations = [
    {
        _id: 'st_patiala_01',
        name: "Civil Lines Police Station",
        location: { coordinates: [76.3860, 30.3400] },
        contactNumber: "100",
        jurisdictionRadiusKm: 2.5
    },
    {
        _id: 'st_patiala_02',
        name: "Urban Estate Police Station",
        location: { coordinates: [76.4300, 30.3500] },
        contactNumber: "100",
        jurisdictionRadiusKm: 3
    },
    {
        _id: 'st_patiala_03',
        name: "Tripuri Police Station",
        location: { coordinates: [76.3900, 30.3650] }, // North Patiala
        contactNumber: "100",
        jurisdictionRadiusKm: 2
    },
    {
        _id: 'st_patiala_04',
        name: "Sadar Police Station",
        location: { coordinates: [76.4020, 30.3250] }, // South
        contactNumber: "100",
        jurisdictionRadiusKm: 3
    },
    {
        _id: 'st_patiala_05',
        name: "Lahori Gate Police Station",
        location: { coordinates: [76.3950, 30.3350] }, // Central
        contactNumber: "100",
        jurisdictionRadiusKm: 1.5
    },
    {
        _id: 'st_patiala_06',
        name: "Kotwali Police Station",
        location: { coordinates: [76.4000, 30.3400] }, // Old City
        contactNumber: "100",
        jurisdictionRadiusKm: 1.5
    },
    {
        _id: 'st_patiala_07',
        name: "Anaj Mandi Police Station",
        location: { coordinates: [76.3700, 30.3300] }, // Market area
        contactNumber: "100",
        jurisdictionRadiusKm: 2
    },
    {
        _id: 'st_patiala_08',
        name: "Model Town Police Station",
        location: { coordinates: [76.3800, 30.3550] }, // Residential
        contactNumber: "100",
        jurisdictionRadiusKm: 2
    },
    {
        _id: 'st_patiala_09',
        name: "Women Cell Patiala",
        location: { coordinates: [76.3850, 30.3450] }, // Near Civil Lines
        contactNumber: "1091",
        jurisdictionRadiusKm: 3
    },
    {
        _id: 'st_patiala_10',
        name: "Passey Road Police Station",
        location: { coordinates: [76.4100, 30.3600] }, // East
        contactNumber: "100",
        jurisdictionRadiusKm: 2
    }
];

const rides = {};

module.exports = {
    stations,
    rides
};
