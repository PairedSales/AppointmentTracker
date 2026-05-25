'use client';

import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useMap } from 'react-leaflet';
import { LabelEngine, LabelInput, PlacedLabel } from '../lib/layout/LabelEngine';

interface LabelData {
  id: string;
  lat: number;
  lng: number;
  text: string;
  url: string;
  client: string;
  type: string;
}

interface Props {
  labels: LabelData[];
}

export default function AdaptiveLabelLayer({ labels }: Props) {
  const map = useMap();
  const [placedLabels, setPlacedLabels] = useState<PlacedLabel[]>([]);
  const [isInteracting, setIsInteracting] = useState(false);
  const engineRef = useRef<LabelEngine | null>(null);

  const measureLabel = (text: string, fontSize = 14) => {
    return {
      width: text.length * (fontSize * 0.55) + 16,
      height: fontSize + 12
    };
  };

  useEffect(() => {
    const updateLayout = () => {
      const container = map.getContainer();
      const rect = container.getBoundingClientRect();
      
      if (rect.width === 0) return;
      
      engineRef.current = new LabelEngine(rect.width, rect.height);

      const inputs: LabelInput[] = labels.map(l => {
        const pt = map.latLngToContainerPoint([l.lat, l.lng]);
        const size = measureLabel(l.text, 14);
        return {
          id: l.id,
          text: l.text,
          anchorX: pt.x,
          anchorY: pt.y,
          width: size.width,
          height: size.height
        };
      });

      const results = engineRef.current.computeLayout(inputs);
      setPlacedLabels(results);
    };

    const handleMoveEnd = () => {
      updateLayout();
    };

    const handleZoomStart = () => {
      setIsInteracting(true);
    };

    const handleZoomEnd = () => {
      setIsInteracting(false);
      updateLayout();
    };

    map.on('moveend', handleMoveEnd);
    map.on('zoomstart', handleZoomStart);
    map.on('zoomend', handleZoomEnd);
    map.on('resize', updateLayout);
    
    updateLayout();
    setTimeout(updateLayout, 150); 

    return () => {
      map.off('moveend', handleMoveEnd);
      map.off('zoomstart', handleZoomStart);
      map.off('zoomend', handleZoomEnd);
      map.off('resize', updateLayout);
    };
  }, [map, labels]);

  const tooltipPane = map.getPane('tooltipPane');
  if (!tooltipPane) return null;

  return createPortal(
    <div 
      className="adaptive-labels-overlay" 
      style={{
        position: 'absolute', 
        top: 0, left: 0, 
        pointerEvents: 'none', 
        zIndex: 1000,
        opacity: isInteracting ? 0 : 1,
        transition: 'opacity 0.2s ease',
        width: 0, height: 0 // SVG and div elements inside will overflow out of this base anchor
      }}
    >
      <svg style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}>
        {placedLabels.map(l => {
          if (l.isHidden) return null;
          const ogLabel = labels.find(orig => orig.id === l.id);
          if (!ogLabel) return null;

          // Convert screen coordinates to Leaflet pane layer coordinates
          const anchorLayerPt = map.containerPointToLayerPoint([l.anchorX, l.anchorY]);
          const labelCenterXScreen = l.x + l.width / 2;
          const labelCenterYScreen = l.y + l.height / 2;
          const labelCenterLayerPt = map.containerPointToLayerPoint([labelCenterXScreen, labelCenterYScreen]);

          return (
            <line 
              key={`line-${l.id}`}
              x1={anchorLayerPt.x} y1={anchorLayerPt.y}
              x2={labelCenterLayerPt.x} y2={labelCenterLayerPt.y}
              stroke="rgba(0,0,0,0.4)"
              strokeWidth="1.5"
              strokeDasharray="2,2"
            />
          );
        })}
      </svg>

      {placedLabels.map(l => {
        if (l.isHidden) return null;
        const ogLabel = labels.find(orig => orig.id === l.id);
        if (!ogLabel) return null;

        // Convert screen top-left to layer top-left
        const labelLayerPt = map.containerPointToLayerPoint([l.x, l.y]);

        return (
          <a
            key={`box-${l.id}`}
            href={ogLabel.url}
            target="_blank"
            rel="noopener noreferrer"
            title={`Client: ${ogLabel.client}\nType: ${ogLabel.type}`}
            style={{
              position: 'absolute',
              left: labelLayerPt.x,
              top: labelLayerPt.y,
              width: l.width,
              height: l.height,
              backgroundColor: 'rgba(24, 24, 27, 0.95)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              borderRadius: '6px',
              padding: '4px 8px',
              fontSize: `${l.fontSize}px`,
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
              backdropFilter: 'blur(4px)',
              pointerEvents: 'auto',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              whiteSpace: l.isWrapped ? 'normal' : 'nowrap',
              lineHeight: 1.2
            }}
          >
            {l.text}
          </a>
        );
      })}
    </div>,
    tooltipPane
  );
}
