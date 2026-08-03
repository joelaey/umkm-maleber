'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Store, DriverInfo, PlacePOI } from '@/types';
import { MALEBER_CENTER, INITIAL_PLACES } from '@/lib/mockData';
import { calculateRoadDistance, formatDistanceText, getOSRMRoute, searchRealPlacesOSM } from '@/lib/geoUtils';
import { Layers, Target, Compass, MapPin, Search } from 'lucide-react';

interface MapComponentProps {
  stores?: Store[];
  drivers?: DriverInfo[];
  places?: PlacePOI[];
  pickupLocation?: { lat: number; lng: number; address: string } | null;
  destLocation?: { lat: number; lng: number; address: string } | null;
  onSelectPickup?: (lat: number, lng: number) => void;
  onSelectDest?: (lat: number, lng: number) => void;
  selectionMode?: 'pickup' | 'dest' | null;
  activeRouteStatus?: string;
  driverProgress?: number; // 0-100 for live tracking animation
  className?: string;
  zoom?: number;
  center?: { lat: number; lng: number };
}

export default function MapComponent({
  stores = [],
  drivers = [],
  places = INITIAL_PLACES,
  pickupLocation,
  destLocation,
  onSelectPickup,
  onSelectDest,
  selectionMode = null,
  activeRouteStatus,
  driverProgress = 0,
  className = 'h-[380px] w-full rounded-3xl shadow-inner',
  zoom = 16,
  center = { lat: MALEBER_CENTER.lat, lng: MALEBER_CENTER.lng }
}: MapComponentProps) {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [L, setL] = useState<any>(null);
  const [mapTileMode, setMapTileMode] = useState<'satellite' | 'street'>('satellite');
  const triggerResetRef = useRef<(() => void) | null>(null);

  // Live OpenStreetMap Nominatim Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlacePOI[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [dynamicPlaces, setDynamicPlaces] = useState<PlacePOI[]>(places);

  useEffect(() => {
    setDynamicPlaces(places);
  }, [places]);

  const handleSearchChange = async (val: string) => {
    setSearchQuery(val);
    if (val.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    const results = await searchRealPlacesOSM(val);
    setSearchResults(results);
    setIsSearching(false);
  };

  const handleSelectSearchResult = (poi: PlacePOI) => {
    setDynamicPlaces((prev) => [poi, ...prev.filter((p) => p.id !== poi.id)]);
    setSearchResults([]);
    setSearchQuery('');
    if (selectionMode === 'pickup' && onSelectPickup) {
      onSelectPickup(poi.lat, poi.lng);
    } else if (selectionMode === 'dest' && onSelectDest) {
      onSelectDest(poi.lat, poi.lng);
    }
  };

  useEffect(() => {
    import('leaflet').then((leaflet) => {
      setL(leaflet.default);
      setMapLoaded(true);
    });
  }, []);

  return (
    <div className={`relative overflow-hidden border border-emerald-200/30 dark:border-zinc-800 ${className}`}>
      
      {/* Google Maps Style Live Search Bar for Real Places (OpenStreetMap Nominatim API) */}
      <div className="absolute top-3 left-3 z-[1000] max-w-[220px] sm:max-w-xs w-full">
        <div className="relative">
          <div className="glass-dark border border-emerald-500/30 rounded-2xl p-1.5 flex items-center gap-2 shadow-2xl">
            <Search className="w-4 h-4 text-emerald-400 ml-1.5 shrink-0" />
            <input
              type="text"
              placeholder="Cari lokasi nyata di OSM..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="bg-transparent text-white text-xs font-semibold focus:outline-none w-full placeholder:text-zinc-400"
            />
            {isSearching && (
              <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mr-1 shrink-0"></div>
            )}
          </div>

          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-zinc-900/95 backdrop-blur-md border border-zinc-700/80 rounded-2xl p-2 shadow-2xl space-y-1 max-h-56 overflow-y-auto z-[1010]">
              {searchResults.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectSearchResult(item)}
                  className="w-full text-left p-2 rounded-xl hover:bg-zinc-800 transition-colors flex items-start gap-2 group cursor-pointer"
                >
                  <span className="text-sm shrink-0">{item.icon}</span>
                  <div>
                    <h5 className="font-extrabold text-xs text-white group-hover:text-emerald-400 transition-colors line-clamp-1">{item.name}</h5>
                    <p className="text-[10px] text-zinc-400 line-clamp-1">{item.address}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Map Control Bar Top Floating */}
      <div className="absolute top-3 right-3 z-[1000] flex items-center gap-2">
        {/* Toggle Satellite vs Street Map */}
        <button
          type="button"
          onClick={() => setMapTileMode(mapTileMode === 'satellite' ? 'street' : 'satellite')}
          className="glass-dark hover:bg-zinc-800/90 text-white text-xs font-extrabold px-3 py-1.5 rounded-full shadow-xl flex items-center gap-1.5 cursor-pointer transition-all border border-emerald-500/30"
          title="Ubah Tampilan Peta"
        >
          <Layers className="w-3.5 h-3.5 text-emerald-400" />
          {mapTileMode === 'satellite' ? '🛰️ Satelit + Jalan' : '🗺️ Peta Standard'}
        </button>

        {/* Reset Camera Center Button */}
        <button
          type="button"
          onClick={() => triggerResetRef.current && triggerResetRef.current()}
          className="glass-dark hover:bg-zinc-800/90 text-white text-xs font-extrabold px-3 py-1.5 rounded-full shadow-xl flex items-center gap-1.5 cursor-pointer transition-all border border-emerald-500/30"
          title="Reset Kamera Ke Rute / Tengah Desa"
        >
          <Target className="w-3.5 h-3.5 text-emerald-400" />
          Fokus Rute
        </button>
      </div>

      {/* Selection Mode Banner */}
      {selectionMode && (
        <div className="absolute top-14 left-3 sm:top-3 sm:left-1/2 sm:-translate-x-1/2 z-[1000] animate-slide-down">
          <div className="glass-dark px-4 py-2 rounded-full shadow-xl flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
            </span>
            <span className="text-white text-xs font-bold whitespace-nowrap">
              Geser &amp; klik peta untuk {selectionMode === 'pickup' ? 'Titik Penjemputan' : 'Titik Tujuan'}
            </span>
          </div>
        </div>
      )}

      {/* Dead-Reckoning Battery Saver Indicator */}
      <div className="absolute bottom-3 left-3 z-[1000] pointer-events-none">
        <div className="bg-zinc-900/90 backdrop-blur-md text-emerald-400 text-[10px] font-bold px-3 py-1.5 rounded-full border border-emerald-500/30 shadow-lg flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Dead-Reckoning Live Tracking (Ping 60s &bull; Smooth 60FPS)</span>
        </div>
      </div>

      {mapLoaded && L ? (
        <LeafletMapView
          L={L}
          stores={stores}
          drivers={drivers}
          places={dynamicPlaces}
          pickupLocation={pickupLocation}
          destLocation={destLocation}
          onSelectPickup={onSelectPickup}
          onSelectDest={onSelectDest}
          selectionMode={selectionMode}
          activeRouteStatus={activeRouteStatus}
          driverProgress={driverProgress}
          zoom={zoom}
          center={center}
          tileMode={mapTileMode}
          onRegisterReset={(resetFn) => (triggerResetRef.current = resetFn)}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-zinc-400 gap-3">
          <div className="relative">
            <div className="w-10 h-10 border-4 border-emerald-500/30 rounded-full"></div>
            <div className="absolute top-0 left-0 w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <span className="text-xs font-semibold">Memuat Peta Satelit Desa Maleber, Karangtengah...</span>
        </div>
      )}
    </div>
  );
}

function LeafletMapView({
  L,
  stores,
  drivers,
  places,
  pickupLocation,
  destLocation,
  onSelectPickup,
  onSelectDest,
  selectionMode,
  activeRouteStatus,
  driverProgress,
  zoom,
  center,
  tileMode,
  onRegisterReset
}: {
  L: any;
  stores: Store[];
  drivers: DriverInfo[];
  places: PlacePOI[];
  pickupLocation?: { lat: number; lng: number; address: string } | null;
  destLocation?: { lat: number; lng: number; address: string } | null;
  onSelectPickup?: (lat: number, lng: number) => void;
  onSelectDest?: (lat: number, lng: number) => void;
  selectionMode: 'pickup' | 'dest' | null;
  activeRouteStatus?: string;
  driverProgress?: number;
  zoom: number;
  center: { lat: number; lng: number };
  tileMode: 'satellite' | 'street';
  onRegisterReset: (fn: () => void) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletInstance = useRef<any>(null);
  const layerGroupRef = useRef<any>(null);
  const baseTileLayerRef = useRef<any>(null);
  const roadOverlayLayerRef = useRef<any>(null);
  const clickHandlerRef = useRef<any>(null);
  const animFrameRef = useRef<number | null>(null);

  const lastRouteKeyRef = useRef<string>('');
  const userHasInteractedRef = useRef<boolean>(false);

  // Initialize map once safely
  useEffect(() => {
    if (!mapRef.current || leafletInstance.current) return;

    const safeLat = center && typeof center.lat === 'number' ? center.lat : MALEBER_CENTER.lat;
    const safeLng = center && typeof center.lng === 'number' ? center.lng : MALEBER_CENTER.lng;

    const map = L.map(mapRef.current, {
      center: [safeLat, safeLng],
      zoom: zoom,
      zoomControl: false
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Track user drag / zoom interactions so background data refresh doesn't override camera pan
    map.on('dragstart', () => {
      userHasInteractedRef.current = true;
    });
    map.on('zoomstart', () => {
      userHasInteractedRef.current = true;
    });

    const layerGroup = L.layerGroup().addTo(map);
    leafletInstance.current = map;
    layerGroupRef.current = layerGroup;

    // Register reset function
    onRegisterReset(() => {
      userHasInteractedRef.current = false;
      if (pickupLocation && destLocation) {
        map.fitBounds(
          [[pickupLocation.lat, pickupLocation.lng], [destLocation.lat, destLocation.lng]],
          { padding: [50, 50] }
        );
      } else {
        map.setView([safeLat, safeLng], 16);
      }
    });

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      map.remove();
      leafletInstance.current = null;
    };
  }, []);

  // Update Tile Layer (Satellite Hybrid vs Standard Street Map)
  useEffect(() => {
    const map = leafletInstance.current;
    if (!map) return;

    if (baseTileLayerRef.current) map.removeLayer(baseTileLayerRef.current);
    if (roadOverlayLayerRef.current) map.removeLayer(roadOverlayLayerRef.current);

    if (tileMode === 'satellite') {
      // High Resolution Esri World Imagery Satellite
      baseTileLayerRef.current = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: '&copy; Esri &bull; Desa Maleber Satellite',
          maxZoom: 19
        }
      ).addTo(map);

      // Roads & Street Labels Overlay on Top of Satellite
      roadOverlayLayerRef.current = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 19,
          opacity: 0.95
        }
      ).addTo(map);
    } else {
      // Standard OpenStreetMap Street Map
      baseTileLayerRef.current = L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          attribution: '&copy; OpenStreetMap &bull; Desa Maleber',
          maxZoom: 19
        }
      ).addTo(map);
    }
  }, [tileMode]);

  // Update selection click handler
  useEffect(() => {
    const map = leafletInstance.current;
    if (!map) return;

    if (clickHandlerRef.current) {
      map.off('click', clickHandlerRef.current);
    }

    const handler = (e: any) => {
      const { lat, lng } = e.latlng;
      if (selectionMode === 'pickup' && onSelectPickup) {
        onSelectPickup(lat, lng);
      } else if (selectionMode === 'dest' && onSelectDest) {
        onSelectDest(lat, lng);
      }
    };

    clickHandlerRef.current = handler;
    map.on('click', handler);

    map.getContainer().style.cursor = selectionMode ? 'crosshair' : '';
  }, [selectionMode, onSelectPickup, onSelectDest]);

  // Update markers and Dead-Reckoning smooth live tracking
  useEffect(() => {
    if (!leafletInstance.current || !layerGroupRef.current) return;

    const map = leafletInstance.current;
    const group = layerGroupRef.current;
    group.clearLayers();

    // 0. Places of Interest Markers (Google Maps Style POIs)
    (places || []).forEach((poi) => {
      const categoryGradients: Record<string, string> = {
        Pemerintahan: 'linear-gradient(135deg,#059669,#10b981)',
        Ibadah: 'linear-gradient(135deg,#d97706,#f59e0b)',
        Pendidikan: 'linear-gradient(135deg,#7c3aed,#8b5cf6)',
        Kesehatan: 'linear-gradient(135deg,#dc2626,#ef4444)',
        Olahraga: 'linear-gradient(135deg,#2563eb,#3b82f6)',
        Perdagangan: 'linear-gradient(135deg,#ea580c,#f97316)',
        Wisata: 'linear-gradient(135deg,#0284c7,#06b6d4)'
      };
      const bg = categoryGradients[poi.category] || 'linear-gradient(135deg,#4b5563,#6b7280)';

      const poiIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;background:${bg};border-radius:50%;border:2.5px solid white;box-shadow:0 4px 14px rgba(0,0,0,0.3);font-size:16px;transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.25)'" onmouseout="this.style.transform='scale(1)'">
            ${poi.icon}
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });

      const marker = L.marker([poi.lat, poi.lng], { icon: poiIcon });
      marker.bindPopup(`
        <div style="font-family:'Plus Jakarta Sans',system-ui;padding:4px;min-width:200px;">
          ${poi.image ? `<img src="${poi.image}" style="width:100%;height:90px;border-radius:10px;object-fit:cover;margin-bottom:8px;" alt="" />` : ''}
          <div style="display:flex;align-items:center;justify-content:space-between;gap:4px;margin-bottom:4px;">
            <span style="font-size:10px;font-weight:800;background:#ecfdf5;color:#047857;padding:2px 8px;border-radius:999px;">${poi.category}</span>
            <span style="font-size:10px;color:#a1a1aa;font-family:monospace;">${poi.lat.toFixed(4)}, ${poi.lng.toFixed(4)}</span>
          </div>
          <h4 style="font-weight:800;color:#18181b;margin:0 0 2px;font-size:13px;line-height:1.3;">${poi.icon} ${poi.name}</h4>
          <p style="font-size:10px;color:#71717a;margin:0 0 6px;">${poi.address}</p>
          ${poi.description ? `<p style="font-size:11px;color:#3f3f46;margin:0 0 6px;line-height:1.3;">${poi.description}</p>` : ''}
        </div>
      `);
      group.addLayer(marker);
    });

    // 1. Store Markers with popups
    stores.forEach((store) => {
      const storeIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div style="display:flex;align-items:center;justify-content:center;width:36px;height:36px;background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:12px;border:2.5px solid white;box-shadow:0 4px 14px rgba(245,158,11,0.35);font-size:16px;transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">
            🏪
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      const marker = L.marker([store.lat, store.lng], { icon: storeIcon });
      marker.bindPopup(`
        <div style="font-family:'Plus Jakarta Sans',system-ui;padding:4px;min-width:180px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <img src="${store.image}" style="width:44px;height:44px;border-radius:10px;object-fit:cover;" alt="" />
            <div>
              <h4 style="font-weight:800;color:#047857;margin:0;font-size:13px;line-height:1.3;">${store.name}</h4>
              <p style="font-size:10px;margin:2px 0 0;color:#71717a;">${store.category} &bull; ${store.ownerName}</p>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:4px;background:#fef3c7;padding:4px 8px;border-radius:8px;">
            <span style="font-size:12px;">⭐</span>
            <span style="font-weight:800;color:#92400e;font-size:12px;">${store.rating}</span>
            <span style="font-size:10px;color:#92400e;opacity:0.7;">(${store.reviewCount} ulasan)</span>
          </div>
        </div>
      `);
      group.addLayer(marker);
    });

    // 2. Dead-Reckoning Algorithmic Driver Motion
    const activeDriverMarkers: Map<string, any> = new Map();

    drivers.forEach((drv) => {
      if (!drv.isOnline) return;

      const driverIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div style="position:relative;display:flex;align-items:center;justify-content:center;">
            <div style="position:absolute;width:44px;height:44px;border-radius:50%;border:2px solid #10b981;animation:pulse-ring 1.8s ease-out infinite;opacity:0.6;"></div>
            <div style="display:flex;align-items:center;justify-content:center;width:38px;height:38px;background:linear-gradient(135deg,#059669,#10b981);border-radius:50%;border:3px solid white;box-shadow:0 6px 20px rgba(16,185,129,0.4);font-size:18px;z-index:2;">
              🛵
            </div>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22]
      });

      const marker = L.marker([drv.lat, drv.lng], { icon: driverIcon });
      marker.bindPopup(`
        <div style="font-family:'Plus Jakarta Sans',system-ui;padding:4px;min-width:180px;">
          <h4 style="font-weight:800;color:#047857;margin:0 0 4px;">${drv.name}</h4>
          <p style="font-size:11px;margin:2px 0;color:#3f3f46;">${drv.vehicleModel} (${drv.vehicleNumber})</p>
          <div style="display:flex;align-items:center;gap:8px;margin-top:8px;">
            <span style="background:#dcfce7;color:#166534;font-size:10px;font-weight:700;padding:3px 10px;border-radius:999px;">● Dead-Reckoning 60s Ping</span>
            <span style="background:#fef3c7;color:#92400e;font-size:10px;font-weight:700;padding:3px 10px;border-radius:999px;">⭐ ${drv.rating}</span>
          </div>
        </div>
      `);

      group.addLayer(marker);
      activeDriverMarkers.set(drv.id, { marker, baseLat: drv.lat, baseLng: drv.lng });
    });

    // Dead reckoning frame loop for smooth motion
    let startTime = performance.now();
    const animateDeadReckoning = (time: number) => {
      const elapsed = (time - startTime) / 1000;

      activeDriverMarkers.forEach((item, id) => {
        const radius = 0.0004; // ~40 meters micro patrol loop
        const offsetLat = Math.sin(elapsed * 0.2 + id.length) * radius * 0.4;
        const offsetLng = Math.cos(elapsed * 0.2 + id.length) * radius * 0.4;

        item.marker.setLatLng([item.baseLat + offsetLat, item.baseLng + offsetLng]);
      });

      animFrameRef.current = requestAnimationFrame(animateDeadReckoning);
    };

    animFrameRef.current = requestAnimationFrame(animateDeadReckoning);

    // 3. Pickup Marker
    if (pickupLocation) {
      const pickupIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div style="position:relative;display:flex;align-items:center;justify-content:center;">
            <div style="position:absolute;width:40px;height:40px;border-radius:50%;border:2px solid #10b981;animation:pulse-ring 2s ease-out infinite;opacity:0.5;"></div>
            <div style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;background:linear-gradient(135deg,#10b981,#06d6a0);color:white;font-weight:900;font-size:15px;border-radius:50%;border:3px solid white;box-shadow:0 4px 16px rgba(16,185,129,0.4);z-index:2;">
              A
            </div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });
      const marker = L.marker([pickupLocation.lat, pickupLocation.lng], { icon: pickupIcon });
      marker.bindPopup(`
        <div style="font-family:'Plus Jakarta Sans',system-ui;padding:4px;">
          <span style="font-size:10px;font-weight:700;color:#059669;background:#d1fae5;padding:2px 8px;border-radius:6px;">PICKUP</span>
          <p style="font-weight:700;margin:6px 0 0;font-size:12px;color:#18181b;">${pickupLocation.address}</p>
        </div>
      `);
      group.addLayer(marker);
    }

    // 4. Destination Marker
    if (destLocation) {
      const destIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div style="position:relative;display:flex;align-items:center;justify-content:center;">
            <div style="position:absolute;width:40px;height:40px;border-radius:50%;border:2px solid #3b82f6;animation:pulse-ring 2s ease-out infinite;opacity:0.5;"></div>
            <div style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;background:linear-gradient(135deg,#3b82f6,#6366f1);color:white;font-weight:900;font-size:15px;border-radius:50%;border:3px solid white;box-shadow:0 4px 16px rgba(59,130,246,0.4);z-index:2;">
              B
            </div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });
      const marker = L.marker([destLocation.lat, destLocation.lng], { icon: destIcon });
      marker.bindPopup(`
        <div style="font-family:'Plus Jakarta Sans',system-ui;padding:4px;">
          <span style="font-size:10px;font-weight:700;color:#2563eb;background:#dbeafe;padding:2px 8px;border-radius:6px;">TUJUAN</span>
          <p style="font-weight:700;margin:6px 0 0;font-size:12px;color:#18181b;">${destLocation.address}</p>
        </div>
      `);
      group.addLayer(marker);
    }

    // 5. Turn-by-Turn Road Route Polyline via OSRM API
    if (pickupLocation && destLocation) {
      getOSRMRoute(
        pickupLocation.lat,
        pickupLocation.lng,
        destLocation.lat,
        destLocation.lng
      ).then((routeRes) => {
        const polylineCoords = routeRes.geometryCoordinates.length > 1
          ? routeRes.geometryCoordinates
          : [[pickupLocation.lat, pickupLocation.lng], [destLocation.lat, destLocation.lng]];
        const roadDistStr = formatDistanceText(routeRes.distanceKm);

        // Shadow line following exact road curves
        const shadowLine = L.polyline(polylineCoords, {
          color: '#10b981',
          weight: 8,
          opacity: 0.2,
          lineCap: 'round',
          lineJoin: 'round'
        });
        group.addLayer(shadowLine);

        // Main dashed line following exact road curves with Tooltip
        const routeLine = L.polyline(polylineCoords, {
          color: '#10b981',
          weight: 5,
          dashArray: '10, 8',
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round'
        });

        routeLine.bindTooltip(`📍 Jarak Rute Jalan: <b>${roadDistStr}</b>`, {
          permanent: true,
          direction: 'center',
          className: 'glass-dark text-white font-extrabold text-[11px] px-2.5 py-1 rounded-xl shadow-lg border border-emerald-500/30'
        });

        group.addLayer(routeLine);
      });

      // Animated moving driver marker along route
      if (driverProgress && driverProgress > 0) {
        const progress = Math.min(driverProgress / 100, 1);
        const lat = pickupLocation.lat + (destLocation.lat - pickupLocation.lat) * progress;
        const lng = pickupLocation.lng + (destLocation.lng - pickupLocation.lng) * progress;

        const movingDriverIcon = L.divIcon({
          className: 'custom-leaflet-marker',
          html: `
            <div style="position:relative;display:flex;align-items:center;justify-content:center;">
              <div style="position:absolute;width:48px;height:48px;border-radius:50%;border:2px solid #f59e0b;animation:pulse-ring 1.2s ease-out infinite;"></div>
              <div style="display:flex;align-items:center;justify-content:center;width:40px;height:40px;background:linear-gradient(135deg,#f59e0b,#f97316);border-radius:50%;border:3px solid white;box-shadow:0 6px 24px rgba(245,158,11,0.5);font-size:20px;z-index:3;">
                🛵
              </div>
            </div>
          `,
          iconSize: [48, 48],
          iconAnchor: [24, 24]
        });

        L.marker([lat, lng], { icon: movingDriverIcon })
          .bindPopup(`<div style="font-family:system-ui;text-align:center;font-size:12px;"><b>Driver Sedang Menuju</b><br/>${driverProgress}% perjalanan</div>`)
          .addTo(group);
      }

      // ONLY fitBounds ONCE when route location actually changes and user hasn't manually panned
      const newRouteKey = `${pickupLocation.lat.toFixed(5)},${pickupLocation.lng.toFixed(5)}-${destLocation.lat.toFixed(5)},${destLocation.lng.toFixed(5)}`;
      if (newRouteKey !== lastRouteKeyRef.current && !userHasInteractedRef.current) {
        lastRouteKeyRef.current = newRouteKey;
        map.fitBounds(
          [[pickupLocation.lat, pickupLocation.lng], [destLocation.lat, destLocation.lng]],
          { padding: [50, 50] }
        );
      }
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [stores, drivers, pickupLocation, destLocation, selectionMode, driverProgress]);

  return <div ref={mapRef} className="w-full h-full" />;
}
