'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { X, Navigation } from 'lucide-react';
import AdaptiveLabelLayer from './AdaptiveLabelLayer';

// Modern SVG Marker Icon (Darker green/slate to contrast with map)
const customMarkerHtml = `
  <svg width="100%" height="100%" viewBox="0 0 28 42" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 0C6.268 0 0 6.268 0 14C0 24.5 14 42 14 42C14 42 28 24.5 28 14C28 6.268 21.732 0 14 0Z" fill="#1e3f2b" stroke="#ffffff" stroke-width="2"/>
    <circle cx="14" cy="14" r="5" fill="white"/>
  </svg>
`;

const modernGreenIcon = L.divIcon({
  html: customMarkerHtml,
  className: 'custom-leaflet-marker', // Clean up default background
  iconSize: [28, 42],
  iconAnchor: [14, 42],
  popupAnchor: [0, -42],
  tooltipAnchor: [14, -28]
});

// Home Base SVG Marker Icon (Darker for distinction)
const homeMarkerHtml = `
  <svg width="100%" height="100%" viewBox="0 0 28 42" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 0C6.268 0 0 6.268 0 14C0 24.5 14 42 14 42C14 42 28 24.5 28 14C28 6.268 21.732 0 14 0Z" fill="#1e293b" stroke="#ffffff" stroke-width="2"/>
    <circle cx="14" cy="14" r="5" fill="#f59e0b"/>
  </svg>
`;

const homeIcon = L.divIcon({
  html: homeMarkerHtml,
  className: 'custom-leaflet-marker',
  iconSize: [20, 30],
  iconAnchor: [10, 30],
  popupAnchor: [0, -30],
  tooltipAnchor: [10, -20]
});

import { Appraisal } from '../types';

interface MapOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  appraisals: Appraisal[];
  homeAddress?: string;
  homeLat?: number;
  homeLng?: number;
}

function AutoFitBounds({ appraisals, homeLat, homeLng }: { appraisals: Appraisal[], homeLat?: number, homeLng?: number }) {
  const map = useMap();

  useEffect(() => {
    const validAppraisals = appraisals.filter(a => a.lat && a.lng);
    const boundsPoints: [number, number][] = validAppraisals.map(a => [a.lat!, a.lng!]);
    
    // Always include home base in bounds calculation
    if (homeLat && homeLng) {
      boundsPoints.push([homeLat, homeLng]);
    }
    
    if (boundsPoints.length > 0) {
      const bounds = L.latLngBounds(boundsPoints);
      map.fitBounds(bounds, { padding: [80, 80], maxZoom: 15, animate: false });
    }
  }, [appraisals, map, homeLat, homeLng]);

  return null;
}

// Old CollisionController replaced by AdaptiveLabelLayer

export default function MapOverlay({ isOpen, onClose, appraisals, homeAddress, homeLat, homeLng }: MapOverlayProps) {
  if (!isOpen) return null;

  const addressCoords = new Map<string, {lat: number, lng: number}>();
  appraisals.forEach(a => {
    if (a.lat && a.lng) {
      addressCoords.set(a.address.toLowerCase().trim(), { lat: a.lat, lng: a.lng });
    }
  });

  const enhancedAppraisals = appraisals.map(a => {
    if (a.lat && a.lng) return a;
    const coords = addressCoords.get(a.address.toLowerCase().trim());
    if (coords) return { ...a, lat: coords.lat, lng: coords.lng };
    return a;
  });

  const validAppraisals = enhancedAppraisals.filter(a => a.lat && a.lng);
  
  // Deduplicate unmapped addresses so we don't show the same address multiple times
  const unmappedAppraisals = enhancedAppraisals.filter(a => !a.lat || !a.lng);
  const uniqueUnmappedAddresses = Array.from(new Set(unmappedAppraisals.map(a => a.address)));

  const handleRouteClick = (destAddress: string) => {
    if (!homeAddress) return;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(homeAddress)}&destination=${encodeURIComponent(destAddress)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} 
        style={{ width: '95%', maxWidth: '1200px', height: '85vh', display: 'flex', flexDirection: 'column', padding: '1.5rem' }}
      >
        <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: '0.25rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {uniqueUnmappedAddresses.length > 0 ? (
              <h2 style={{ fontSize: '1rem', color: 'var(--warning)', fontWeight: 600, lineHeight: 1.4 }}>
                Could not map: {uniqueUnmappedAddresses.join(' | ')}
              </h2>
            ) : (
              <h2 style={{ fontSize: '1.25rem' }}>Map View</h2>
            )}
          </div>
          <button onClick={onClose} className="action-icon-btn" title="Close Map" style={{ alignSelf: 'flex-start' }}>
            <X className="w-6 h-6 text-zinc-400" />
          </button>
        </div>
        
        <div style={{ flex: 1, position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
            <MapContainer 
              center={[homeLat || 41.8781, homeLng || -87.6298]}
              zoom={10} 
              style={{ height: '100%', width: '100%', zIndex: 1 }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {/* Home Base Marker */}
              {homeLat && homeLng && homeAddress && (
                <Marker position={[homeLat, homeLng]} icon={homeIcon}>

                  <Popup>
                    <div style={{ padding: '4px', textAlign: 'center' }}>
                      <strong style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Home Base</strong>
                      <div style={{ fontSize: '12px', color: '#555' }}>{homeAddress}</div>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Appraisal Markers */}
              {validAppraisals.map(app => {
                const getDirectionsUrl = () => {
                  if (!homeAddress) return '#';
                  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(homeAddress)}&destination=${encodeURIComponent(app.address)}`;
                };
                
                // Format label to show Street and City
                const parts = app.address.split(',');
                const labelText = parts.length > 1 ? `${parts[0].trim()}, ${parts[1].trim()}` : app.address;

                return (
                <Marker 
                  key={app.id} 
                  position={[app.lat!, app.lng!]} 
                  icon={modernGreenIcon}
                >
                  <Popup>
                    <div style={{ padding: '8px', minWidth: '180px' }}>
                      <strong style={{ display: 'block', marginBottom: '8px', fontSize: '15px' }}>{app.address}</strong>
                      <div style={{ fontSize: '13px', color: '#555', marginBottom: '12px' }}>
                        <span style={{ display: 'block', marginBottom: '2px' }}><strong>Client:</strong> {app.client}</span>
                        <span style={{ display: 'block', marginBottom: '2px' }}><strong>Type:</strong> {app.type}</span>
                        {app.inspection_time && <span style={{ display: 'block' }}><strong>Time:</strong> {app.inspection_time.replace(/^0/, '')}</span>}
                      </div>
                      <a 
                        href={getDirectionsUrl()}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ 
                          width: '100%', padding: '6px', backgroundColor: '#3b82f6', color: 'white', 
                          border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', 
                          alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: 600,
                          textDecoration: 'none', boxSizing: 'border-box'
                        }}
                      >
                        <Navigation size={14} /> Get Directions
                      </a>
                    </div>
                  </Popup>
                </Marker>
              )})}
              
              <AutoFitBounds appraisals={validAppraisals} homeLat={homeLat} homeLng={homeLng} />
              <AdaptiveLabelLayer 
                labels={validAppraisals.map(app => {
                  const parts = app.address.split(',');
                  const labelText = parts.length > 1 ? `${parts[0].trim()}, ${parts[1].trim()}` : app.address;
                  
                  return {
                    id: app.id,
                    lat: app.lat!,
                    lng: app.lng!,
                    text: labelText,
                    client: app.client,
                    type: app.type,
                    url: homeAddress 
                      ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(homeAddress)}&destination=${encodeURIComponent(app.address)}`
                      : '#'
                  };
                })}
              />
            </MapContainer>
        </div>
      </div>
    </div>
  );
}
