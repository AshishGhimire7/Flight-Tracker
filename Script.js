let map;
let planeMarkers = {}; // store multiple planes keyed by callsign
let planeIcon = {
  url: "https://maps.google.com/mapfiles/kml/shapes/airplanes.png",
  scaledSize: new google.maps.Size(40, 40),
  anchor: new google.maps.Point(20, 20),
  rotation: 0,
};
let autoUpdateInterval = null;

// This function is called by Google Maps API once it's loaded
function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    zoom: 4,
    center: { lat: 39.8283, lng: -98.5795 }, // center on US
  });

  // Optional: start auto-update immediately
  // startAutoUpdate();
}

// Fetch all flights from OpenSky
async function getFlights() {
  try {
    const response = await fetch("https://opensky-network.org/api/states/all");
    const data = await response.json();
    return data.states;
  } catch (error) {
    console.error("Error fetching flight data:", error);
    return [];
  }
}

// Show all planes in a bounding box
async function showAllPlanes() {
  if (!map) return; // safety check in case API hasn't loaded

  const flights = await getFlights();

  // Bounding box: US
  const minLat = 24.396308, maxLat = 49.384358;
  const minLng = -125.0, maxLng = -66.93457;

  const seenCallsigns = {};

  flights.forEach(f => {
    const callsign = f[1]?.trim();
    const lat = f[6];
    const lng = f[5];
    const altitude = f[7];
    const velocity = f[9];
    const heading = f[10];

    if (!callsign || !lat || !lng) return;
    if (lat < minLat || lat > maxLat || lng < minLng || lng > maxLng) return;

    seenCallsigns[callsign] = true;

    if (!planeMarkers[callsign]) {
      // Create marker
      const marker = new google.maps.Marker({
        position: { lat, lng },
        map,
        icon: { ...planeIcon, rotation: heading || 0 },
        label: {
          text: callsign,
          color: "white",
          fontSize: "12px",
          fontWeight: "bold",
        },
      });

      const infoWindow = new google.maps.InfoWindow();
      marker.addListener("click", () => {
        infoWindow.setContent(`
          <strong>${callsign}</strong><br>
          Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}<br>
          Altitude: ${altitude ? altitude.toFixed(0) + " m" : "N/A"}<br>
          Speed: ${velocity ? (velocity*3.6).toFixed(0) + " km/h" : "N/A"}<br>
          Heading: ${heading ? heading.toFixed(0) + "°" : "N/A"}
        `);
        infoWindow.open(map, marker);
      });

      planeMarkers[callsign] = marker;
    } else {
      // Update marker
      planeMarkers[callsign].setPosition({ lat, lng });
      planeMarkers[callsign].setIcon({ ...planeIcon, rotation: heading || 0 });
      planeMarkers[callsign].setLabel({
        text: callsign,
        color: "white",
        fontSize: "12px",
        fontWeight: "bold",
      });
    }
  });

  // Remove planes that left the bounding box
  Object.keys(planeMarkers).forEach(callsign => {
    if (!seenCallsigns[callsign]) {
      planeMarkers[callsign].setMap(null);
      delete planeMarkers[callsign];
    }
  });
}

// Search for a flight by callsign
function trackFlight() {
  const flightNumber = document.getElementById("flightNumber").value.toUpperCase().trim();
  if (!flightNumber) {
    alert("Please enter a flight number");
    return;
  }

  const marker = planeMarkers[flightNumber];
  if (marker) {
    map.setZoom(6);
    map.panTo(marker.getPosition());
    new google.maps.InfoWindow({
      content: `Flight ${flightNumber}`,
    }).open(map, marker);
  } else {
    alert(`Flight ${flightNumber} not found in the current region`);
  }
}

// Auto-update every 30 seconds
function startAutoUpdate() {
  if (!autoUpdateInterval) {
    showAllPlanes(); // initial
    autoUpdateInterval = setInterval(showAllPlanes, 30000);
  }
}

function stopAutoUpdate() {
  if (autoUpdateInterval) {
    clearInterval(autoUpdateInterval);
    autoUpdateInterval = null;
  }
}
