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
        map.removeControl(searchControl);
        map.off('geosearch/showlocation', onResult);
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

// Component to change map view dynamically
const ChangeView = ({ center, zoom }: { center: LatLngExpression, zoom: number }) => {
    const map = useMap();
    useEffect(() => {
        map.setView(center, zoom);
    }, [center, zoom, map]);
    return null;
}

export default function LeafletMapPicker({ position, onPositionChange }: MapPickerProps) {
    const defaultCenter: LatLngExpression = [14.536, 49.126]; // Mukalla
    const defaultZoom = 13;

    const [markerPosition, setMarkerPosition] = useState<LatLngExpression | null>(null);

    useEffect(() => {
        if(position && position.lat && position.lng) {
            setMarkerPosition([position.lat, position.lng]);
        }
    }, [position]);

    const center = markerPosition || defaultCenter;

    return (
        <MapContainer center={center} zoom={defaultZoom} style={{ height: '300px', width: '100%', borderRadius: 'var(--radius)', zIndex: 10 }}>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <SearchControl onPositionChange={onPositionChange} />
            <MapEvents onPositionChange={onPositionChange} />

            <ChangeView center={center} zoom={markerPosition ? 15 : defaultZoom} />

            {markerPosition && <Marker position={markerPosition}></Marker>}
        </MapContainer>
    );
}
