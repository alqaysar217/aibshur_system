'use client';

import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import L, { LatLngExpression } from 'leaflet';
import { useEffect, useState, useRef } from 'react';
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

// Search control component
const SearchControl = (props: { onPositionChange: (pos: { lat: number, lng: number }) => void }) => {
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
        props.onPositionChange({ lat: e.location.y, lng: e.location.x });
      };
      map.on('geosearch/showlocation', onResult);

      return () => {
        try {
            map.removeControl(searchControl);
            map.off('geosearch/showlocation', onResult);
        } catch (error) {
            // Ignore errors on cleanup.
        }
      };
    }, [map, props]);
  
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
        if (position && typeof position.lat === 'number' && typeof position.lng === 'number') {
            const currentCenter = map.getCenter();
            if (currentCenter.lat.toFixed(5) !== position.lat.toFixed(5) || currentCenter.lng.toFixed(5) !== position.lng.toFixed(5)) {
                map.setView([position.lat, position.lng], map.getZoom() < 13 ? 13 : map.getZoom());
            }
        }
    }, [position, map]);
    return null;
}

export default function LeafletMapPicker({ position, onPositionChange }: MapPickerProps) {
    const defaultCenter: LatLngExpression = [14.536, 49.126]; // Mukalla
    
    // Check if a valid position is passed, otherwise use default
    const center = (position && typeof position.lat === 'number' && typeof position.lng === 'number')
        ? [position.lat, position.lng] as LatLngExpression
        : defaultCenter;

    const placeholder = (
        <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="ml-2">جاري تحميل الخريطة...</p>
        </div>
    );

    return (
        <MapContainer
            center={center}
            zoom={13}
            style={{ height: '300px', width: '100%', borderRadius: 'var(--radius)', zIndex: 10 }}
            placeholder={placeholder}
            scrollWheelZoom={true}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <SearchControl onPositionChange={onPositionChange} />
            <MapEvents onPositionChange={onPositionChange} />
            <MapUpdater position={position} />
            <Marker position={center} />
        </MapContainer>
    );
}
