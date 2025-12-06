export interface GeocodingResult {
  formattedAddress: string;
  addressComponents: {
    streetNumber?: string;
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  location: {
    lat: number;
    lng: number;
  };
  placeId: string;
  types: string[];
}

// US Census Geocoding API Response
export interface CensusGeocodingApiResponse {
  result: {
    addressMatches: Array<{
      matchedAddress: string;
      coordinates: {
        x: number; // longitude
        y: number; // latitude
      };
      addressComponents: {
        streetName: string;
        fromAddress: string;
        toAddress: string;
        preDirection: string;
        postDirection: string;
        streetSuffix: string;
        city: string;
        state: string;
        zip: string;
      };
      tigerLine: {
        tigerLineId: string;
        side: string;
      };
      addressFields: {
        Street: string;
        City: string;
        State: string;
        Zip: string;
      };
    }>;
  };
}

// Legacy API response interface (kept for backward compatibility if needed)
export interface GeocodingApiResponse {
  results: Array<{
    address_components: Array<{
      long_name: string;
      short_name: string;
      types: string[];
    }>;
    formatted_address: string;
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
    place_id: string;
    types: string[];
  }>;
  status: string;
}
