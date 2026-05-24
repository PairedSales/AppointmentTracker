'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { X } from 'lucide-react';

// Fix for default marker icons in Leaflet with Webpack/Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface Appraisal {
  id: string;
  address: string;
  lat?: number;
  lng?: number;
  client: string;
  type: string;
  inspection_time: string;
}

interface MapOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  appraisals: Appraisal[];
}

// Component to auto-fit bounds
function AutoFitBounds({ appraisals }: { appraisals: Appraisal[] }) {
  const map = useMap();

  useEffect(() => {
    const validAppraisals = appraisals.filter(a => a.lat && a.lng);
    if (validAppraisals.length > 0) {
      const bounds = L.latLngBounds(validAppraisals.map(a => [a.lat!, a.lng!]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [appraisals, map]);

  return null;
}

export default function MapOverlay({ isOpen, onClose, appraisals }: MapOverlayProps) {
  if (!isOpen) return null;

  const validAppraisals = appraisals.filter(a => a.lat && a.lng);

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} 
        style={{ width: '90%', maxWidth: '1000px', height: '80vh', display: 'flex', flexDirection: 'column' }}
      >
        <div className="modal-header">
          <h2>Map View ({validAppraisals.length} properties plotted)</h2>
          <button onClick={onClose} className="action-icon-btn" title="Close Map">
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>
        
        <div style={{ flex: 1, position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
          {validAppraisals.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
              No properties with valid coordinates found in the current view.
            </div>
          ) : (
            <MapContainer 
              center={[41.8781, -87.6298]} // Default to Chicago area
              zoom={10} 
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {validAppraisals.map(app => (
                <Marker key={app.id} position={[app.lat!, app.lng!]}>
                  <Popup>
                    <div style={{ padding: '4px' }}>
                      <strong style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>{app.address}</strong>
                      <div style={{ fontSize: '12px', color: '#555' }}>
                        {app.client} - {app.type}
                        {app.inspection_time && <><br/>Time: {app.inspection_time}</>}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
              <AutoFitBounds appraisals={validAppraisals} />
            </MapContainer>
          )}
        </div>
      </div>
    </div>
  );
}
