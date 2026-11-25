/**
 * Pure URL builders enforcing the house rule: every hotel/stay link carries exact dates and party size.
 */

export function buildGoogleHotelsUrl(query: string, checkinIso: string, checkoutIso: string): string {
  const q = encodeURIComponent(query).replace(/%20/g, '+');
  return `https://www.google.com/travel/search?q=${q}&checkin=${checkinIso}&checkout=${checkoutIso}`;
}

export function buildBookingPropertyUrl(
  baseUrl: string,
  checkinIso: string,
  checkoutIso: string,
  adults: number,
  juniorAge?: number
): string {
  const sep = baseUrl.includes('?') ? '&' : '?';
  if (juniorAge !== undefined) {
    return `${baseUrl}${sep}checkin=${checkinIso}&checkout=${checkoutIso}&group_adults=${adults}&group_children=1&age=${juniorAge}&no_rooms=1`;
  }
  return `${baseUrl}${sep}checkin=${checkinIso}&checkout=${checkoutIso}&group_adults=${adults}&no_rooms=1&group_children=0`;
}

export function buildBookingSearchUrl(
  cityQuery: string,
  checkinIso: string,
  checkoutIso: string,
  people: number
): string {
  const ss = encodeURIComponent(cityQuery).replace(/%20/g, '+');
  return `https://www.booking.com/searchresults.html?ss=${ss}&checkin=${checkinIso}&checkout=${checkoutIso}&group_adults=${people}&no_rooms=1&group_children=0`;
}

export function buildAirbnbSearchUrl(
  cityQuery: string,
  checkinIso: string,
  checkoutIso: string,
  people: number
): string {
  const slug = encodeURIComponent(cityQuery.replace(/\s+/g, '-'));
  return `https://www.airbnb.com/s/${slug}/homes?checkin=${checkinIso}&checkout=${checkoutIso}&adults=${people}`;
}

export function buildGoogleMapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function buildGoogleMapsRouteUrl(
  originQuery: string,
  destQuery: string,
  mode: 'driving' | 'walking' = 'walking'
): string {
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originQuery)}&destination=${encodeURIComponent(destQuery)}&travelmode=${mode}`;
}

export function buildFlightAwareUrl(flightCode: string): string {
  const clean = flightCode.trim().toUpperCase();
  const icaoMap: Record<string, string> = { LY: 'ELY' };
  const prefix = clean.slice(0, 2);
  const num = clean.slice(2).trim();
  const icao = icaoMap[prefix] ?? prefix;
  return `https://www.flightaware.com/live/flight/${icao}${num}`;
}

export function buildWhatsAppUrl(digitsOnlyPhone: string, message: string): string {
  return `https://wa.me/${digitsOnlyPhone}?text=${encodeURIComponent(message)}`;
}
