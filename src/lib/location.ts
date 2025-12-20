
export interface Workplace {
    name: string;
    lat: number;
    lon: number;
}

export const WORKPLACES: Workplace[] = [
    { name: 'Tonasa 23', lat: -4.783714780572759, lon: 119.61610006600712 },
    { name: 'Tonasa 4', lat: -4.78831873823137, lon: 119.61654058396095 },
    { name: 'Tonasa 5', lat: -4.790931202719051, lon: 119.61694886888938 },
    { name: 'Crusher', lat: -4.7893251806455295, lon: 119.62039780223822 },
    { name: 'Kantor Staf', lat: -4.788360643865878, lon: 119.61309925103656 },
    { name: 'Palmer', lat: -4.799717216, lon: 119.60308636409 },
];

export const MAX_DISTANCE_METERS = 350;

// Helper function to calculate distance in meters
export function getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3; // metres
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const deltaPhi = (lat2 - lat1) * Math.PI / 180;
    const deltaLambda = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
        Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export function findNearestWorkplace(lat: number, lon: number): Workplace {
    let nearest = WORKPLACES[0];
    let minDis = getDistanceFromLatLonInM(lat, lon, nearest.lat, nearest.lon);

    WORKPLACES.forEach((wp) => {
        const d = getDistanceFromLatLonInM(lat, lon, wp.lat, wp.lon);
        if (d < minDis) {
            minDis = d;
            nearest = wp;
        }
    });

    return nearest;
}
