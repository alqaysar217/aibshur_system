'use client';

import { MapContainer, TileLayer, Marker } from 'react-leaflet';
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

interface LocationViewerProps {
  position: { lat: number; lng: number };
}

export default function LeafletLocationViewer({ position }: LocationViewerProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);


  if (!position || typeof position.lat !== 'number' || typeof position.lng !== 'number') {
    return <div className="flex items-center justify-center h-[400px] text-muted-foreground">لا يوجد موقع محدد.</div>;
  }

  const markerPosition: LatLngExpression = [position.lat, position.lng];

  return (
    <>
      {!isClient ? (
        <Skeleton className="h-[400px] w-full" />
      ) : (
        <MapContainer 
            center={markerPosition} 
            zoom={15} 
            style={{ height: '400px', width: '100%', borderRadius: 'var(--radius)', zIndex: 10 }}
            scrollWheelZoom={false}
            dragging={true}
            zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={markerPosition}></Marker>
        </MapContainer>
      )}
    </>
  );
}
