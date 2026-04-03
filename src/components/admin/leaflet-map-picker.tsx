'use client';

import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L, { LatLngExpression } from 'leaflet';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

// Fix for default marker icon issue
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapPickerProps {
  position: { lat: number; lng: number };
  onPositionChange: (position: { lat: number; lng: number }) => void;
}

// Internal component to handle map interactions and updates
function MapController({ position, onPositionChange }: MapPickerProps) {
  const map = useMap();

  // Event handler for map clicks
  useMapEvents({
    click(e) {
      onPositionChange(e.latlng);
    },
  });

  // Effect to move the map view when the position prop changes
  useEffect(() => {
    if (position && position.lat && position.lng) {
      const currentCenter = map.getCenter();
      if (currentCenter.lat !== position.lat || currentCenter.lng !== position.lng) {
        map.setView([position.lat, position.lng], map.getZoom());
      }
    }
  }, [position, map]);

  // Render the marker at the current position
  return position && position.lat ? <Marker position={[position.lat, position.lng]} /> : null;
}


export default function LeafletMapPicker({ position, onPositionChange }: MapPickerProps) {
  const initialCenter: LatLngExpression = [14.536, 49.126]; // Mukalla
  
  // Define a placeholder for elegant loading
  const placeholder = (
    <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p className="ml-2">جاري تحميل الخريطة...</p>
    </div>
  );

  return (
    <MapContainer 
      center={position && position.lat ? [position.lat, position.lng] : initialCenter} 
      zoom={position && position.lat ? 13 : 8} 
      style={{ height: '300px', width: '100%', borderRadius: 'var(--radius)', zIndex: 10 }}
      scrollWheelZoom={true}
      placeholder={placeholder}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapController position={position} onPositionChange={onPositionChange} />
    </MapContainer>
  );
}
