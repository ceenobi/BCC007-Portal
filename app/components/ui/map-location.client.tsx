import { icon } from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, TileLayer } from "react-leaflet";

const markerIcon = icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export default function MapLocationMap({
  location,
  title,
  coordinates,
}: {
  location: string;
  title?: string;
  coordinates?: { lat: number; lng: number };
}) {
  const coords: [number, number] = coordinates
    ? [coordinates.lat, coordinates.lng]
    : [6.4482, 3.4301];

  const mapsUrl = `https://www.google.com/maps?q=${coords[0]},${coords[1]}`;

  return (
    <div className="relative h-100 w-full rounded-2xl overflow-hidden border z-20">
      <MapContainer
        center={coords}
        zoom={15}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={coords} icon={markerIcon} />
      </MapContainer>
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="open map"
        className="absolute bottom-3 left-3 z-900 text-white bg-mainBlue backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs font-medium shadow-sm transition-colors"
      >
        {title ?? location}
      </a>
    </div>
  );
}
