import React, { useEffect, useRef, useState } from 'react';
import { DriverInfo } from '@/types';
import { MALEBER_CENTER } from '@/lib/mockData';
import { snapPointToPolyline, getOSRMRoute } from '@/lib/geoUtils';

interface RouteMapComponentProps {
  pickupLocation: { lat: number; lng: number; address?: string };
  destLocation: { lat: number; lng: number; address?: string };
  activeDriver?: DriverInfo | null;
  driverProgress?: number;
  isHistoricalView?: boolean;
  className?: string;
}

export default function RouteMapComponent({
  pickupLocation,
  destLocation,
  activeDriver,
  driverProgress = 0,
  isHistoricalView = false,
  className = 'w-full h-64 rounded-2xl'
}: RouteMapComponentProps) {
  const [L, setL] = useState<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    import('leaflet').then((leaflet) => {
      setL(leaflet.default);
      setMapLoaded(true);
    });
  }, []);

  return (
    <div className={`relative overflow-hidden border border-emerald-500/20 shadow-md ${className}`}>
      {mapLoaded && L ? (
        <CleanRouteLeafletView
          L={L}
          pickupLocation={pickupLocation}
          destLocation={destLocation}
          activeDriver={activeDriver}
          driverProgress={driverProgress}
          isHistoricalView={isHistoricalView}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-zinc-400 gap-2">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-[11px] font-semibold text-emerald-400">Memuat Rute Perjalanan...</span>
        </div>
      )}
    </div>
  );
}

function CleanRouteLeafletView({
  L,
  pickupLocation,
  destLocation,
  activeDriver,
  driverProgress,
  isHistoricalView
}: {
  L: any;
  pickupLocation: { lat: number; lng: number; address?: string };
  destLocation: { lat: number; lng: number; address?: string };
  activeDriver?: DriverInfo | null;
  driverProgress: number;
  isHistoricalView: boolean;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletInstance = useRef<any>(null);
  const layerGroupRef = useRef<any>(null);

  // Initialize Map safely without default zoom controls or overlays
  useEffect(() => {
    if (!mapRef.current || leafletInstance.current) return;

    const centerLat = (pickupLocation.lat + destLocation.lat) / 2;
    const centerLng = (pickupLocation.lng + destLocation.lng) / 2;

    const map = L.map(mapRef.current, {
      center: [centerLat, centerLng],
      zoom: 15,
      zoomControl: false,
      attributionControl: false
    });

    // High quality Voyager Tile for clean, modern route map
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd'
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    leafletInstance.current = map;
    layerGroupRef.current = layerGroup;

    return () => {
      if (leafletInstance.current) {
        try {
          leafletInstance.current.off();
          leafletInstance.current.remove();
        } catch (e) {}
        leafletInstance.current = null;
      }
    };
  }, []);

  // Update Route Polyline & Markers
  useEffect(() => {
    if (!leafletInstance.current || !layerGroupRef.current) return;

    const map = leafletInstance.current;
    const group = layerGroupRef.current;
    group.clearLayers();

    // 1. Pickup Badge Marker (Point A)
    const pickupIcon = L.divIcon({
      className: 'custom-leaflet-marker',
      html: `
        <div style="position:relative;display:flex;align-items:center;justify-content:center;">
          <div style="position:absolute;width:38px;height:38px;border-radius:50%;border:2px solid #10b981;animation:pulse-ring 2s ease-out infinite;opacity:0.5;"></div>
          <div style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;background:linear-gradient(135deg,#10b981,#059669);color:white;font-weight:900;font-size:14px;border-radius:50%;border:2.5px solid white;box-shadow:0 4px 14px rgba(16,185,129,0.4);z-index:2;">
            A
          </div>
        </div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 19]
    });
    const pickupMarker = L.marker([pickupLocation.lat, pickupLocation.lng], { icon: pickupIcon });
    if (pickupLocation.address) {
      pickupMarker.bindPopup(`
        <div style="font-family:system-ui;padding:4px;">
          <span style="font-size:10px;font-weight:800;color:#059669;background:#d1fae5;padding:2px 8px;border-radius:6px;">PENJEMPUTAN (A)</span>
          <p style="font-weight:700;margin:4px 0 0;font-size:11px;color:#18181b;">${pickupLocation.address}</p>
        </div>
      `);
    }
    group.addLayer(pickupMarker);

    // 2. Destination Badge Marker (Point B)
    const destIcon = L.divIcon({
      className: 'custom-leaflet-marker',
      html: `
        <div style="position:relative;display:flex;align-items:center;justify-content:center;">
          <div style="position:absolute;width:38px;height:38px;border-radius:50%;border:2px solid #3b82f6;animation:pulse-ring 2s ease-out infinite;opacity:0.5;"></div>
          <div style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;background:linear-gradient(135deg,#3b82f6,#2563eb);color:white;font-weight:900;font-size:14px;border-radius:50%;border:2.5px solid white;box-shadow:0 4px 14px rgba(59,130,246,0.4);z-index:2;">
            B
          </div>
        </div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 19]
    });
    const destMarker = L.marker([destLocation.lat, destLocation.lng], { icon: destIcon });
    if (destLocation.address) {
      destMarker.bindPopup(`
        <div style="font-family:system-ui;padding:4px;">
          <span style="font-size:10px;font-weight:800;color:#2563eb;background:#dbeafe;padding:2px 8px;border-radius:6px;">TUJUAN (B)</span>
          <p style="font-weight:700;margin:4px 0 0;font-size:11px;color:#18181b;">${destLocation.address}</p>
        </div>
      `);
    }
    group.addLayer(destMarker);

    // 3. Fetch OSRM Real Road Polyline
    getOSRMRoute(
      pickupLocation.lat,
      pickupLocation.lng,
      destLocation.lat,
      destLocation.lng
    ).then((routeRes: any) => {
      if (!leafletInstance.current || !layerGroupRef.current) return;

      const polylineCoords: [number, number][] = routeRes.coordinates && routeRes.coordinates.length > 0
        ? routeRes.coordinates
        : [[pickupLocation.lat, pickupLocation.lng], [destLocation.lat, destLocation.lng]];

      // Outer Soft Halo Line
      const haloLine = L.polyline(polylineCoords, {
        color: '#34d399',
        weight: 10,
        opacity: 0.25,
        lineCap: 'round',
        lineJoin: 'round'
      });
      group.addLayer(haloLine);

      if (isHistoricalView) {
        // Static Completed Route Line
        const solidLine = L.polyline(polylineCoords, {
          color: '#10b981',
          weight: 6,
          opacity: 0.9,
          lineCap: 'round',
          lineJoin: 'round'
        });
        group.addLayer(solidLine);
      } else {
        // Active Progress Splitting
        let splitIndex = 0;
        let driverSnappedCoord: [number, number] | null = null;

        if (activeDriver) {
          const snap = snapPointToPolyline([activeDriver.lat, activeDriver.lng], polylineCoords);
          driverSnappedCoord = snap.snapped;
          splitIndex = snap.index;
        } else if (driverProgress && driverProgress > 0) {
          splitIndex = Math.floor((driverProgress / 100) * (polylineCoords.length - 1));
        }

        if (splitIndex > 0 && splitIndex < polylineCoords.length) {
          // Passed Route Line (Subtle Dashed Grey)
          const passedCoords = polylineCoords.slice(0, splitIndex + 1);
          if (driverSnappedCoord) passedCoords[passedCoords.length - 1] = driverSnappedCoord;

          const passedLine = L.polyline(passedCoords, {
            color: '#94a3b8',
            weight: 4,
            dashArray: '6, 8',
            opacity: 0.6,
            lineCap: 'round',
            lineJoin: 'round'
          });
          group.addLayer(passedLine);

          // Remaining Route Line (Vibrant Emerald Solid)
          const remainingCoords = polylineCoords.slice(splitIndex);
          if (driverSnappedCoord) remainingCoords[0] = driverSnappedCoord;

          const remainingLine = L.polyline(remainingCoords, {
            color: '#059669',
            weight: 6,
            opacity: 1.0,
            lineCap: 'round',
            lineJoin: 'round'
          });
          group.addLayer(remainingLine);
        } else {
          // Full Solid Line
          const mainLine = L.polyline(polylineCoords, {
            color: '#059669',
            weight: 6,
            opacity: 1.0,
            lineCap: 'round',
            lineJoin: 'round'
          });
          group.addLayer(mainLine);
        }

        // Render Active Driver Icon on Polyline
        if (activeDriver && driverSnappedCoord) {
          const driverIcon = L.divIcon({
            className: 'custom-leaflet-marker',
            html: `
              <div style="position:relative;display:flex;align-items:center;justify-content:center;">
                <div style="position:absolute;width:44px;height:44px;border-radius:50%;border:2px solid #059669;animation:pulse-ring 1.2s ease-out infinite;"></div>
                <div style="display:flex;align-items:center;justify-content:center;width:36px;height:36px;background:linear-gradient(135deg,#059669,#10b981);border-radius:50%;border:2.5px solid white;box-shadow:0 6px 20px rgba(5,150,105,0.45);font-size:18px;z-index:3;">
                  🛵
                </div>
              </div>
            `,
            iconSize: [44, 44],
            iconAnchor: [22, 22]
          });

          L.marker(driverSnappedCoord, { icon: driverIcon })
            .bindPopup(`<div style="font-family:system-ui;text-align:center;font-size:11px;"><b>${activeDriver.name}</b><br/>Sedang Mengantar</div>`)
            .addTo(group);
        }
      }

      // Smooth Camera Fit Bounds
      setTimeout(() => {
        if (map && map._container && map._leaflet_id && polylineCoords.length > 0) {
          try {
            map.invalidateSize();
            const bounds = L.latLngBounds(polylineCoords);
            map.fitBounds(bounds, { padding: [35, 35], maxZoom: 16 });
          } catch (e) {}
        }
      }, 100);
    });
  }, [pickupLocation.lat, pickupLocation.lng, destLocation.lat, destLocation.lng, activeDriver?.lat, activeDriver?.lng, driverProgress, isHistoricalView]);

  return <div ref={mapRef} className="w-full h-full" />;
}
