'use client';

import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L, { LatLngExpression } from 'leaflet';

// Fix for default marker icon issue
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface LocationViewerProps {
  position: { lat: number; lng: number };
}

export default function LeafletLocationViewer({ position }: LocationViewerProps) {
  if (!position || !position.lat || !position.lng) {
    return <div className="flex items-center justify-center h-full text-muted-foreground">لا يوجد موقع محدد.</div>;
  }

  const markerPosition: LatLngExpression = [position.lat, position.lng];

  return (
    <MapContainer center={markerPosition} zoom={15} style={{ height: '400px', width: '100%', borderRadius: 'var(--radius)', zIndex: 10 }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={markerPosition}></Marker>
    </MapContainer>
  );
}
