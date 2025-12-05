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

