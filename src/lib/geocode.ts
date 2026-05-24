export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Geocodes an address string using the open Nominatim (OpenStreetMap) API.
 * Uses a basic fetch with a strict User-Agent per Nominatim requirements.
 * Note: Nominatim limits requests to 1 per second.
 */
export async function geocodeAddress(address: string): Promise<Coordinates | null> {
  if (!address) return null;

  try {
    // Basic formatting to help Nominatim (removes unit numbers etc. if complex, but simple addresses work best)
    // We append USA to increase accuracy if missing
    const query = encodeURIComponent(address + (address.toLowerCase().includes('il') ? '' : ', IL, USA'));
    
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        // Nominatim requires a user-agent to identify the application
        'User-Agent': 'AppraisalTracker/1.0 (Local Application)',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`Geocoding failed for ${address}: HTTP ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon) // Nominatim returns 'lon' instead of 'lng'
      };
    }
    
    return null;
  } catch (err) {
    console.error(`Geocoding error for ${address}:`, err);
    return null;
  }
}
