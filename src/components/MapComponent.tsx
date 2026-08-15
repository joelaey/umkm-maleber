'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Store, DriverInfo, PlacePOI } from '@/types';
import { MALEBER_CENTER, INITIAL_PLACES } from '@/lib/mockData';
import { calculateRoadDistance, formatDistanceText, getOSRMRoute, searchRealPlacesOSM, snapPointToPolyline, getDistanceMeters } from '@/lib/geoUtils';
import { Layers, Target, Compass, MapPin, Search } from 'lucide-react';

const globalOsrmCache = new Map<string, any>();

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
  isHistoricalView?: boolean;
  forceStreetMode?: boolean;
  hideControls?: boolean;
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
  center = { lat: MALEBER_CENTER.lat, lng: MALEBER_CENTER.lng },
  isHistoricalView = false,
  forceStreetMode = false,
  hideControls = false
}: MapComponentProps) {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [L, setL] = useState<any>(null);
  const [mapTileMode, setMapTileMode] = useState<'satellite' | 'street'>(
    (isHistoricalView || forceStreetMode) ? 'street' : 'satellite'
  );
  const triggerResetRef = useRef<(() => void) | null>(null);
  const triggerFocusUserLocationRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (isHistoricalView || forceStreetMode) {
      setMapTileMode('street');
    }
  }, [isHistoricalView, forceStreetMode]);

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
      
      {/* Google Maps Style Live Search Bar (Hidden in Route View, Historical View & Selection Mode) */}
      {!isHistoricalView && !selectionMode && !hideControls && (!pickupLocation || !destLocation) && (
        <div className="absolute z-[1000] max-w-[220px] sm:max-w-xs w-full top-3 left-3">
          <div className="relative">
            <div className="glass-dark border border-emerald-500/30 rounded-2xl p-1.5 flex items-center gap-2 shadow-2xl">
              <Search className="w-4 h-4 text-emerald-400 ml-1.5 shrink-0" />
              <input
                type="text"
                placeholder="Cari lokasi atau alamat..."
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
                    <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="font-bold text-xs text-white group-hover:text-emerald-400 transition-colors line-clamp-1">{item.name}</h5>
                      <p className="text-[10px] text-zinc-400 line-clamp-1">{item.address}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Map Control Bar Top Floating (Hidden when viewing travel route or when hideControls is true) */}
      {!isHistoricalView && !hideControls && (!pickupLocation || !destLocation) && (
        <div className={`absolute z-[1000] flex items-center gap-1.5 transition-all ${
          selectionMode ? 'top-16 right-3' : 'top-3 right-3'
        }`}>
          {/* Toggle Satellite vs Street Map */}
          <button
            type="button"
            onClick={() => setMapTileMode(mapTileMode === 'satellite' ? 'street' : 'satellite')}
            className={`glass-dark hover:bg-zinc-800/90 text-white px-2.5 h-9 rounded-2xl shadow-xl flex items-center gap-1.5 cursor-pointer transition-all border ${
              mapTileMode === 'satellite' ? 'border-amber-400/60 bg-amber-950/60' : 'border-emerald-500/30'
            } active:scale-95`}
            title={mapTileMode === 'satellite' ? 'Ubah ke Mode Peta Street/Jalan' : 'Ubah ke Mode Peta Satelit'}
          >
            <Layers className={`w-4 h-4 ${mapTileMode === 'satellite' ? 'text-amber-400' : 'text-emerald-400'}`} />
            <span className="text-[10px] font-extrabold uppercase text-white">
              {mapTileMode === 'satellite' ? 'Satelit' : 'Street'}
            </span>
          </button>

          {/* Live User GPS Location Lock Button */}
          <button
            type="button"
            onClick={() => triggerFocusUserLocationRef.current && triggerFocusUserLocationRef.current()}
            className="glass-dark hover:bg-zinc-800/90 text-white w-9 h-9 rounded-2xl shadow-xl flex items-center justify-center cursor-pointer transition-all border border-emerald-500/30 active:scale-95"
            title="Fokus Kamera Ke Lokasi Saya (Live GPS)"
          >
            <Compass className="w-4 h-4 text-emerald-400" />
          </button>

          {/* Reset Camera Center Button */}
          <button
            type="button"
            onClick={() => triggerResetRef.current && triggerResetRef.current()}
            className="glass-dark hover:bg-zinc-800/90 text-white w-9 h-9 rounded-2xl shadow-xl flex items-center justify-center cursor-pointer transition-all border border-emerald-500/30 active:scale-95"
            title="Fokus Kamera Ke Rute Perjalanan"
          >
            <Target className="w-4 h-4 text-emerald-400" />
          </button>
        </div>
      )}

      {/* Status Badge Indicator (Hidden in Route View, Selection Mode or when hideControls is true) */}
      {!isHistoricalView && !selectionMode && !hideControls && (!pickupLocation || !destLocation) && (
        <div className="absolute bottom-3 left-3 z-[1000] pointer-events-none">
          <div className="bg-zinc-900/90 backdrop-blur-md text-emerald-400 text-[10px] font-bold px-3 py-1.5 rounded-full border border-emerald-500/30 shadow-lg flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Live Tracking GPS (Ping 60s)</span>
          </div>
        </div>
      )}

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
          isHistoricalView={isHistoricalView}
          hideControls={hideControls}
          forceStreetMode={forceStreetMode}
          onRegisterReset={(resetFn) => (triggerResetRef.current = resetFn)}
          onRegisterFocusUserLocation={(focusFn) => (triggerFocusUserLocationRef.current = focusFn)}
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
  isHistoricalView,
  hideControls,
  onRegisterReset,
  onRegisterFocusUserLocation
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
  isHistoricalView?: boolean;
  hideControls?: boolean;
  forceStreetMode?: boolean;
  onRegisterReset: (fn: () => void) => void;
  onRegisterFocusUserLocation: (fn: () => void) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletInstance = useRef<any>(null);
  const layerGroupRef = useRef<any>(null);
  const baseTileLayerRef = useRef<any>(null);
  const roadOverlayLayerRef = useRef<any>(null);
  const labelOverlayLayerRef = useRef<any>(null);
  const clickHandlerRef = useRef<any>(null);
  const animFrameRef = useRef<number | null>(null);

  const lastRouteKeyRef = useRef<string>('');
  const userHasInteractedRef = useRef<boolean>(false);

  const driversRef = useRef(drivers);
  const centerRef = useRef(center);
  const pickupLocationRef = useRef(pickupLocation);
  const destLocationRef = useRef(destLocation);

  useEffect(() => {
    driversRef.current = drivers;
    centerRef.current = center;
    pickupLocationRef.current = pickupLocation;
    destLocationRef.current = destLocation;
  }, [drivers, center, pickupLocation, destLocation]);

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

    if (!isHistoricalView && !hideControls && (!pickupLocation || !destLocation)) {
      L.control.zoom({ position: 'bottomright' }).addTo(map);
    }

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

    // Auto-center map on load: Prioritize Driver location if in Driver Mode, otherwise safeLat/safeLng
    if (drivers && drivers.length > 0 && typeof drivers[0].lat === 'number' && typeof drivers[0].lng === 'number') {
      map.setView([drivers[0].lat, drivers[0].lng], 17);
    } else if (typeof window !== 'undefined' && 'geolocation' in navigator && !pickupLocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (leafletInstance.current && !userHasInteractedRef.current && !pickupLocation && (!drivers || drivers.length === 0)) {
            const { latitude, longitude } = pos.coords;
            leafletInstance.current.setView([latitude, longitude], 17, { animate: true });
          }
        },
        () => {},
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 10000 }
      );
    }

    // Register reset function (Uses dynamic refs to avoid stale closures)
    onRegisterReset(() => {
      userHasInteractedRef.current = false;
      if (!leafletInstance.current) return;

      const curDrivers = driversRef.current;
      const curCenter = centerRef.current;
      const curPickup = pickupLocationRef.current;
      const curDest = destLocationRef.current;

      if (curDrivers && curDrivers.length > 0 && typeof curDrivers[0].lat === 'number' && typeof curDrivers[0].lng === 'number') {
        leafletInstance.current.setView([curDrivers[0].lat, curDrivers[0].lng], 17, { animate: true });
      } else if (curPickup && curDest) {
        leafletInstance.current.fitBounds(
          [[curPickup.lat, curPickup.lng], [curDest.lat, curDest.lng]],
          { padding: [50, 50] }
        );
      } else if (curCenter && typeof curCenter.lat === 'number') {
        leafletInstance.current.setView([curCenter.lat, curCenter.lng], 17, { animate: true });
      }
    });

    // Register focus user location callback (Uses dynamic refs for 100% accurate driver focus)
    onRegisterFocusUserLocation(() => {
      userHasInteractedRef.current = false;

      if (!leafletInstance.current) return;

      const curDrivers = driversRef.current;
      const curCenter = centerRef.current;

      // 1. Prioritize Driver Pin Position
      if (curDrivers && curDrivers.length > 0 && typeof curDrivers[0].lat === 'number' && typeof curDrivers[0].lng === 'number') {
        leafletInstance.current.setView([curDrivers[0].lat, curDrivers[0].lng], 17, { animate: true });
        return;
      }

      // 2. Prioritize explicitly passed center prop
      if (curCenter && typeof curCenter.lat === 'number') {
        leafletInstance.current.setView([curCenter.lat, curCenter.lng], 17, { animate: true });
        return;
      }

      // 3. Device Geolocation fallback for buyer mode
      if (typeof window !== 'undefined' && 'geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            leafletInstance.current?.setView([latitude, longitude], 17, { animate: true });
          },
          () => {},
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 10000 }
        );
      }
    });

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (leafletInstance.current) {
        try {
          leafletInstance.current.off();
          leafletInstance.current.remove();
        } catch (e) {}
        leafletInstance.current = null;
      }
    };
  }, []);

  // Dynamically re-center map when center prop updates
  useEffect(() => {
    if (leafletInstance.current && center && typeof center.lat === 'number' && typeof center.lng === 'number') {
      // Always re-center in selection mode (fullscreen picker), otherwise respect user interaction
      if (selectionMode || !userHasInteractedRef.current) {
        leafletInstance.current.setView([center.lat, center.lng], zoom || 16, { animate: true });
      }
    }
  }, [center?.lat, center?.lng, zoom]);

  // Update Tile Layer (Satellite Hybrid vs Standard Street Map)
  useEffect(() => {
    const map = leafletInstance.current;
    if (!map) return;

    if (baseTileLayerRef.current) map.removeLayer(baseTileLayerRef.current);
    if (roadOverlayLayerRef.current) map.removeLayer(roadOverlayLayerRef.current);
    if (labelOverlayLayerRef.current) map.removeLayer(labelOverlayLayerRef.current);

    if (tileMode === 'satellite') {
      // 1. High Resolution Esri World Imagery Satellite Base
      baseTileLayerRef.current = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: '&copy; Esri &bull; Desa Maleber Satellite',
          maxZoom: 19
        }
      ).addTo(map);

      // 2. Roads & Transportation Network Overlay
      roadOverlayLayerRef.current = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 19,
          opacity: 0.95
        }
      ).addTo(map);

      // 3. Street Names, Landmarks & Place Labels Overlay (Hybrid Satellite View)
      labelOverlayLayerRef.current = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png',
        {
          attribution: '&copy; OpenStreetMap &bull; Maleber Street Labels',
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

    const hasActiveRouteTracking = Boolean(pickupLocation && destLocation);

    // 0. Places of Interest Markers (Only in default map view)
    if (!selectionMode && !hasActiveRouteTracking) {
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
              <span style="font-weight:800;color:#92400e;font-size:12px;">${store.rating || '0.0'}</span>
              <span style="font-size:10px;color:#92400e;opacity:0.7;">(${store.reviewCount || 0} ulasan)</span>
            </div>
          </div>
        `);
        group.addLayer(marker);
      });
    }

    // 2. Dead-Reckoning Algorithmic Driver Motion (Skip in Historical View or Live Route Tracking)
    const activeDriverMarkers: Map<string, any> = new Map();

    if (!isHistoricalView && !hasActiveRouteTracking) {
      // Standby mode: Render online drivers near pickup location
      const driversToRender = activeRouteStatus ? drivers.slice(0, 1) : drivers;

      driversToRender.forEach((drv) => {
        if (!drv.isOnline) return;

        // Filter: only show online drivers within 1.5km (1500m) radius of pickup location when in pre-order mode
        if (!activeRouteStatus && pickupLocation) {
          const distM = getDistanceMeters(pickupLocation.lat, pickupLocation.lng, drv.lat, drv.lng);
          if (distM > 1500) return;
        }

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
              <span style="background:#dcfce7;color:#166534;font-size:10px;font-weight:700;padding:3px 10px;border-radius:999px;">● Driver Maleber</span>
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
          if (item.marker && item.marker._map && item.marker._icon) {
            try {
              const radius = 0.0004; // ~40 meters micro patrol loop
              const offsetLat = Math.sin(elapsed * 0.2 + id.length) * radius * 0.4;
              const offsetLng = Math.cos(elapsed * 0.2 + id.length) * radius * 0.4;

              item.marker.setLatLng([item.baseLat + offsetLat, item.baseLng + offsetLng]);
            } catch (e) {}
          }
        });

        animFrameRef.current = requestAnimationFrame(animateDeadReckoning);
      };

      animFrameRef.current = requestAnimationFrame(animateDeadReckoning);
    }

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

    // 5. Solid Contrast Polyline with Gojek-style Progress Dimming, Map Matching, & Flicker-free Caching
    if (pickupLocation && destLocation) {
      const isPreOrderMode = !activeRouteStatus;
      const activeDriver = (!isHistoricalView && !isPreOrderMode) ? drivers.find((d) => d.isOnline) : null;
      const startLat = (isHistoricalView || isPreOrderMode) ? pickupLocation.lat : (activeDriver ? activeDriver.lat : pickupLocation.lat);
      const startLng = (isHistoricalView || isPreOrderMode) ? pickupLocation.lng : (activeDriver ? activeDriver.lng : pickupLocation.lng);

      const drawRouteOnGroup = (routeRes: any) => {
        const polylineCoords = routeRes.geometryCoordinates.length > 1
          ? routeRes.geometryCoordinates
          : [[startLat, startLng], [destLocation.lat, destLocation.lng]];
        const roadDistStr = formatDistanceText(routeRes.distanceKm);
        const etaMins = routeRes.durationMins || Math.max(1, Math.round(routeRes.distanceKm * 3));

        // Modern Soft Emerald Halo Line (Clean Modern Navigation Style)
        const haloLine = L.polyline(polylineCoords, {
          color: '#34d399',
          weight: 10,
          opacity: 0.25,
          lineCap: 'round',
          lineJoin: 'round'
        });
        group.addLayer(haloLine);

        // Delayed fitBounds and invalidateSize to ensure modal rendering is finished & camera centered on route
        setTimeout(() => {
          if (map && map._container && map._leaflet_id && polylineCoords.length > 0) {
            try {
              map.invalidateSize();
              const bounds = L.latLngBounds(polylineCoords);
              map.fitBounds(bounds, { padding: [45, 45], maxZoom: 16 });
            } catch (err) {
              // Safely handle unmounted DOM container cleanup
            }
          }
        }, 150);

        if (isHistoricalView) {
          // STATIC HISTORICAL VIEW: Lock map interactions & draw single solid completed route line
          const solidHistoricalLine = L.polyline(polylineCoords, {
            color: '#10b981',
            weight: 8,
            opacity: 1.0,
            lineCap: 'round',
            lineJoin: 'round'
          });

          group.addLayer(solidHistoricalLine);

          // Disable dragging/zooming for static snapshot effect
          map.dragging.disable();
          map.touchZoom.disable();
          map.doubleClickZoom.disable();
          map.scrollWheelZoom.disable();
          map.boxZoom.disable();
        } else {
          // LIVE ACTIVE VIEW: Map Matching & Progress Splitting
          let splitIndex = 0;
          let driverSnappedCoord: [number, number] | null = null;

          if (activeDriver) {
            const snap = snapPointToPolyline([activeDriver.lat, activeDriver.lng], polylineCoords as [number, number][]);
            driverSnappedCoord = snap.snapped;
            splitIndex = snap.index;
          } else if (driverProgress && driverProgress > 0) {
            splitIndex = Math.floor((driverProgress / 100) * (polylineCoords.length - 1));
          }

          if (splitIndex > 0 && splitIndex < polylineCoords.length) {
            // Passed Route (Greyed Out / Dimmed behind driver)
            const passedCoords = polylineCoords.slice(0, splitIndex + 1);
            if (driverSnappedCoord) passedCoords[passedCoords.length - 1] = driverSnappedCoord;

            const passedLine = L.polyline(passedCoords, {
              color: '#94a3b8',
              weight: 6,
              opacity: 0.6,
              lineCap: 'round',
              lineJoin: 'round'
            });
            group.addLayer(passedLine);

            // Remaining Route (Vibrant Solid Emerald Green ahead of driver)
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
            // Entire Solid Vibrant Route Line
            const mainRouteLine = L.polyline(polylineCoords, {
              color: '#059669',
              weight: 6,
              opacity: 1.0,
              lineCap: 'round',
              lineJoin: 'round'
            });

            group.addLayer(mainRouteLine);
          }

          // Render Snapped Driver Marker directly ON Polyline in Live View
          if (activeDriver && driverSnappedCoord) {
            const snappedDriverIcon = L.divIcon({
              className: 'custom-leaflet-marker',
              html: `
                <div style="position:relative;display:flex;align-items:center;justify-content:center;">
                  <div style="position:absolute;width:48px;height:48px;border-radius:50%;border:2.5px solid #059669;animation:pulse-ring 1.2s ease-out infinite;"></div>
                  <div style="display:flex;align-items:center;justify-content:center;width:40px;height:40px;background:linear-gradient(135deg,#059669,#10b981);border-radius:50%;border:3px solid white;box-shadow:0 6px 24px rgba(5,150,105,0.5);font-size:20px;z-index:3;">
                    🛵
                  </div>
                </div>
              `,
              iconSize: [48, 48],
              iconAnchor: [24, 24]
            });

            L.marker(driverSnappedCoord, { icon: snappedDriverIcon })
              .bindPopup(`<div style="font-family:system-ui;text-align:center;font-size:12px;"><b>${activeDriver.name}</b><br/>Estimasi Tiba: ~${etaMins} Menit</div>`)
              .addTo(group);
          }
        }
      };

      const routeKey = `${startLat.toFixed(4)},${startLng.toFixed(4)}-${destLocation.lat.toFixed(4)},${destLocation.lng.toFixed(4)}`;
      if (globalOsrmCache.has(routeKey)) {
        // Synchronous immediate draw to eliminate route flickering
        drawRouteOnGroup(globalOsrmCache.get(routeKey));
      } else {
        getOSRMRoute(startLat, startLng, destLocation.lat, destLocation.lng).then((routeRes) => {
          globalOsrmCache.set(routeKey, routeRes);
          drawRouteOnGroup(routeRes);
        });
      }

      // ONLY fitBounds ONCE when route location actually changes and user hasn't manually panned
      const newRouteKey = `${pickupLocation.lat.toFixed(5)},${pickupLocation.lng.toFixed(5)}-${destLocation.lat.toFixed(5)},${destLocation.lng.toFixed(5)}`;
      if (newRouteKey !== lastRouteKeyRef.current && !userHasInteractedRef.current && map && map._container && map._leaflet_id) {
        try {
          lastRouteKeyRef.current = newRouteKey;
          map.fitBounds(
            [[pickupLocation.lat, pickupLocation.lng], [destLocation.lat, destLocation.lng]],
            { padding: [50, 50] }
          );
        } catch (err) {
          // Safe catch for unmounted Leaflet container
        }
      }
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [stores, drivers, pickupLocation, destLocation, selectionMode, driverProgress]);

  return <div ref={mapRef} className="w-full h-full" />;
}
