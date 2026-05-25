export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Geocodes an address string using the US Census Bureau Geocoder API.
 * Free, no API key required, and specifically optimized for US addresses.
 */
export async function geocodeAddress(address: string): Promise<Coordinates | null> {
  if (!address) return null;

  try {
    // The Census Geocoder performs best when provided with at least the city and state.
    const query = encodeURIComponent(address + (address.toLowerCase().includes('il') ? '' : ', IL'));
    
    const url = `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${query}&benchmark=Public_AR_Current&format=json`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`Census Geocoding failed for ${address}: HTTP ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (data?.result?.addressMatches && data.result.addressMatches.length > 0) {
      const coords = data.result.addressMatches[0].coordinates;
      return {
        lat: coords.y,
        lng: coords.x
      };
    }
    
    return null;
  } catch (err) {
    console.error(`Geocoding error for ${address}:`, err);
    return null;
  }
}
