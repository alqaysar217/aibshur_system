'use client';

import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L, { LatLngExpression } from 'leaflet';
import { useState, useEffect } from 'react';
import { Skeleton } from '../ui/skeleton';

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

// Internal component to handle map events
function MapEvents({ onPositionChange }: { onPositionChange: (pos: L.LatLng) => void }) {
  useMapEvents({
    click(e) {
      onPositionChange(e.latlng);
    },
  });
  return null;
}

// Internal component to update map view when position changes
function MapViewUpdater({ position }: { position: LatLngExpression }) {
  const map = useMap();
  useEffect(() => {
    // Only fly to position if it's different to avoid infinite loops
    const currentCenter = map.getCenter();
    if (currentCenter.lat !== position[0] || currentCenter.lng !== position[1]) {
        map.flyTo(position, map.getZoom() < 10 ? 13 : map.getZoom());
    }
  }, [position, map]);
  return null;
}

export default function LeafletMapPicker({ position, onPositionChange }: MapPickerProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // This effect runs only on the client, after the component has mounted.
    setIsClient(true);
  }, []);

  const initialCenter: LatLngExpression = [14.536, 49.126]; // Mukalla
  const markerPosition: LatLngExpression | null = position?.lat ? [position.lat, position.lng] : null;

  return (
    <>
      {!isClient ? (
        <Skeleton className="h-[300px] w-full" />
      ) : (
        <MapContainer 
          center={markerPosition || initialCenter} 
          zoom={markerPosition ? 13 : 8} 
          style={{ height: '300px', width: '100%', borderRadius: 'var(--radius)', zIndex: 10 }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {markerPosition && <Marker position={markerPosition} />}
          <MapEvents onPositionChange={(latlng) => onPositionChange(latlng)} />
          {markerPosition && <MapViewUpdater position={markerPosition} />}
        </MapContainer>
      )}
    </>
  );
}
