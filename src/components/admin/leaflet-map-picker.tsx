'use client';

import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import L, { LatLngExpression } from 'leaflet';
import { useEffect, useState } from 'react';

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

// Search control component
const SearchControl = ({ onPositionChange }: { onPositionChange: (pos: { lat: number; lng: number }) => void }) => {
    const map = useMap();
  
    useEffect(() => {
      const provider = new OpenStreetMapProvider();
      // @ts-ignore
      const searchControl = new GeoSearchControl({
        provider: provider,
        style: 'bar',
        showMarker: false,
        autoClose: true,
        searchLabel: 'ابحث عن عنوان...'
      });
  
      map.addControl(searchControl);
      
      const onResult = (e: any) => {
        onPositionChange({ lat: e.location.y, lng: e.location.x });
      }
      map.on('geosearch/showlocation', onResult);

      return () => {
        try {
            map.removeControl(searchControl);
            map.off('geosearch/showlocation', onResult);
        } catch (error) {
            // Ignore errors on cleanup. This can happen if the map container is removed before the cleanup function runs.
        }
      };
    }, [map, onPositionChange]);
  
    return null;
};
  
// Component to handle map clicks
const MapEvents = ({ onPositionChange }: { onPositionChange: (pos: { lat: number; lng: number }) => void }) => {
    useMapEvents({
      click(e) {
        onPositionChange(e.latlng);
      },
    });
    return null;
};

// Component to change map view dynamically when props change
const MapUpdater = ({ position }: { position: { lat: number; lng: number } }) => {
    const map = useMap();
    useEffect(() => {
        if (position && position.lat && position.lng) {
            const currentCenter = map.getCenter();
            if (currentCenter.lat !== position.lat || currentCenter.lng !== position.lng) {
                map.setView([position.lat, position.lng], 15);
            }
        }
    }, [position, map]);
    return null;
}

export default function LeafletMapPicker({ position, onPositionChange }: MapPickerProps) {
    
    // Initialize the view state ONCE using useState's initializer function.
    // This prevents MapContainer from re-rendering with new props.
    const [initialView] = useState(() => {
        const defaultCenter: LatLngExpression = [14.536, 49.126]; // Mukalla
        const hasPosition = position && position.lat && position.lng;
        return {
            center: hasPosition ? [position.lat, position.lng] as LatLngExpression : defaultCenter,
            zoom: hasPosition ? 15 : 13
        };
    });

    return (
        <MapContainer center={initialView.center} zoom={initialView.zoom} style={{ height: '300px', width: '100%', borderRadius: 'var(--radius)', zIndex: 10 }}>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <SearchControl onPositionChange={onPositionChange} />
            <MapEvents onPositionChange={onPositionChange} />

            {/* This component handles view updates if the `position` prop changes */}
            <MapUpdater position={position} />

            {/* The Marker is updated based on the `position` prop */}
            {position && position.lat && position.lng && <Marker position={[position.lat, position.lng]}></Marker>}
        </MapContainer>
    );
}