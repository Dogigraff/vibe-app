/**
 * Mock party data for DEV TEST MODE.
 * Used when NEXT_PUBLIC_DEV_TEST_MODE=true.
 */

export const DEV_HOST_ID = "00000000-0000-0000-0000-000000000001";

export interface MockParty {
  id: string;
  host_id: string;
  mood: string | null;
  description: string | null;
  location_name: string | null;
  expires_at: string | null;
  is_boosted: boolean;
  lat: number;
  lng: number;
}

export const MOCK_PARTIES: MockParty[] = [
  {
    id: "aaaaaaaa-1111-2222-3333-444444444444",
    host_id: DEV_HOST_ID,
    mood: "Party",
    description: "House party near Gorky Park",
    location_name: "Gorky Park Area",
    expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    is_boosted: true,
    lat: 55.7312,
    lng: 37.6014,
  },
  {
    id: "bbbbbbbb-1111-2222-3333-444444444444",
    host_id: "00000000-0000-0000-0000-000000000002",
    mood: "Chill / Coffee",
    description: "Quiet cafe meetup",
    location_name: "Cafe Pushkin",
    expires_at: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(),
    is_boosted: false,
    lat: 55.7522,
    lng: 37.6156,
  },
  {
    id: "cccccccc-1111-2222-3333-444444444444",
    host_id: "00000000-0000-0000-0000-000000000003",
    mood: "Walk / Culture",
    description: "Museum visit then walk",
    location_name: "Red Square",
    expires_at: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    is_boosted: true,
    lat: 55.7539,
    lng: 37.6208,
  },
  {
    id: "dddddddd-1111-2222-3333-444444444444",
    host_id: DEV_HOST_ID,
    mood: "Bar",
    description: "Beer and darts",
    location_name: "Khamovniki Bar",
    expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    is_boosted: false,
    lat: 55.7189,
    lng: 37.5791,
  },
  {
    id: "eeeeeeee-1111-2222-3333-444444444444",
    host_id: "00000000-0000-0000-0000-000000000004",
    mood: "Game",
    description: "Board games night",
    location_name: "Arbat District",
    expires_at: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
    is_boosted: false,
    lat: 55.7504,
    lng: 37.5908,
  },
  {
    id: "ffffffff-1111-2222-3333-444444444444",
    host_id: DEV_HOST_ID,
    mood: "Chill",
    description: null,
    location_name: "Sparrow Hills",
    expires_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    is_boosted: true,
    lat: 55.7097,
    lng: 37.5447,
  },
];
