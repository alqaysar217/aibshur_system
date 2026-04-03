'use client';

import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L, { LatLngExpression } from 'leaflet';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';

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

const MapUpdater = ({ position }: { position: { lat: number; lng: number } }) => {
    const map = useMap();
    useEffect(() => {
        if (position?.lat && position?.lng) {
            map.setView([position.lat, position.lng], 15);
        }
    }, [position, map]);
    return null;
};


export default function LeafletLocationViewer({ position }: LocationViewerProps) {
  if (!position || typeof position.lat !== 'number' || typeof position.lng !== 'number') {
    return <div className="flex items-center justify-center h-full text-muted-foreground">لا يوجد موقع محدد.</div>;
  }

  const markerPosition: LatLngExpression = [position.lat, position.lng];
  
  const placeholder = (
    <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p className="ml-2">جاري تحميل الخريطة...</p>
    </div>
  );

  return (
    <MapContainer 
        center={markerPosition} 
        zoom={15} 
        style={{ height: '400px', width: '100%', borderRadius: 'var(--radius)', zIndex: 10 }}
        placeholder={placeholder}
        scrollWheelZoom={false}
        dragging={true}
        zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={markerPosition}></Marker>
      <MapUpdater position={position} />
    </MapContainer>
  );
}
