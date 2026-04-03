'use client';

// CSS imports are moved to the app layout to prevent build errors.

import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import L, { LatLngExpression } from 'leaflet';
import { useEffect } from 'react';

// Fix for default marker icon issue in some bundlers
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
        map.removeControl(searchControl);
        map.off('geosearch/showlocation', onResult);
      };
    }, [map, onPositionChange]);
  
    return null;
};
  
const MapEvents = ({ onPositionChange }: { onPositionChange: (pos: { lat: number; lng: number }) => void }) => {
    useMapEvents({
      click(e) {
        onPositionChange(e.latlng);
      },
    });
    return null;
};

const ChangeView = ({ center, zoom }: { center: LatLngExpression, zoom: number }) => {
    const map = useMap();
    useEffect(() => {
        map.setView(center, zoom);
    }, [center, zoom, map]);
    return null;
}

export default function LeafletMapPicker({ position, onPositionChange }: MapPickerProps) {
    // These are the initial, immutable props for MapContainer
    const initialCenter: LatLngExpression = [15.3694, 44.1910]; // Default to Sana'a
    const initialZoom = 8;

    // These props will change and be passed to our child components
    const currentCenter: LatLngExpression = (position.lat !== 0 && position.lng !== 0) 
        ? [position.lat, position.lng]
        : initialCenter;
    
    const currentZoom = (position.lat !== 0 && position.lng !== 0) ? 14 : initialZoom;

    const markerPosition: LatLngExpression | null = (position.lat !== 0 && position.lng !== 0)
        ? [position.lat, position.lng]
        : null;

    return (
        // MapContainer gets only the initial, unchanging props
        <MapContainer center={initialCenter} zoom={initialZoom} style={{ height: '300px', width: '100%', borderRadius: 'var(--radius)', zIndex: 10 }}>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <SearchControl onPositionChange={onPositionChange} />
            <MapEvents onPositionChange={onPositionChange} />

            {/* This component will handle all view changes after initialization */}
            <ChangeView center={currentCenter} zoom={currentZoom} />

            {markerPosition && <Marker position={markerPosition}></Marker>}
        </MapContainer>
    );
}
