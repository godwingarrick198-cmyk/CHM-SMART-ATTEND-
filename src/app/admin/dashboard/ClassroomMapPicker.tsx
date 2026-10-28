'use client';
import { Circle, MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import { LatLngExpression } from 'leaflet';

type Props = { latitude: number | null; longitude: number | null; radiusMetres: number; onSelect: (lat: number, lng: number) => void };
const fallback: LatLngExpression = [6.335, 5.6037];

function ClickToSelect({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onSelect(e.latlng.lat, e.latlng.lng); } });
  return null;
}

export default function ClassroomMapPicker({ latitude, longitude, radiusMetres, onSelect }: Props) {
  const center: LatLngExpression = latitude !== null && longitude !== null ? [latitude, longitude] : fallback;
  const hasPoint = latitude !== null && longitude !== null;
  return <div className="mapPickerWrap">
    <p className="mapInstructions">Tap the map to place the classroom pin. Drag the map to find the exact building. The circle shows the permitted check-in area.</p>
    <MapContainer center={center} zoom={17} scrollWheelZoom className="classroomMap">
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <ClickToSelect onSelect={onSelect} />
      {hasPoint && <Circle center={[latitude!, longitude!]} radius={Math.max(10, radiusMetres)} pathOptions={{ color: '#b8f36b', fillColor: '#b8f36b', fillOpacity: 0.18 }} />}
    </MapContainer>
    <div className="mapPointStatus">{hasPoint ? `Selected point: ${latitude!.toFixed(6)}, ${longitude!.toFixed(6)}` : 'No point selected yet — tap the map to choose the classroom.'}</div>
  </div>;
}
