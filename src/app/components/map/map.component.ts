import { Component, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EcosystemService, ChargingStation } from '../../services/ecosystem.service';
import { TranslatePipe } from '../../services/translate.pipe';
import { TranslationService } from '../../services/translation.service';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';

declare const L: any;

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements AfterViewInit, OnDestroy {
  tileLayerInstance: any = null;
  stationMarkersMap: { [key: number]: any } = {};
  routePolyline: any = null;
  searchQuery = '';
  calculatedDistance: number | null = null;
  calculatedDuration: number | null = null;

  private themeCallback = () => this.onThemeChanged();
  private langCallback = () => this.renderMapMarkers();

  private zoomSubject = new Subject<{ lat: number; lng: number; zoom: number }>();
  private destroy$ = new Subject<void>();

  // Onboarding Form State
  showOnboardForm = false;
  isPickingLocation = false;
  tempMarker: any = null;
  isDragged = false;
  modalPosition = { x: 0, y: 0 };
  private dragStartMouse = { x: 0, y: 0 };
  private dragStartModal = { x: 0, y: 0 };
  private dragListener: any = null;
  private dragEndListener: any = null;

  newStation = {
    name: '',
    network: 'Tata Power',
    lat: 0,
    lng: 0,
    speed: 'DC 150kW',
    connector: 'CCS2',
    price: 18.00,
    gunsCount: 2,
    agreeTC: false,
    certifySpecs: false
  };

  // Filters State
  filterNetworks: { [key: string]: boolean } = {
    'Tata Power': true,
    'Zeon': true,
    'ChargeZone': true,
    'Bolt': true
  };
  filterConnectors: { [key: string]: boolean } = {
    'CCS2': true,
    'Type 2': true
  };
  filterStatuses: { [key: string]: boolean } = {
    'Available': true,
    'Occupied': true
  };

  constructor(public eco: EcosystemService, public ts: TranslationService, private router: Router) {}

  ngAfterViewInit() {
    this.eco.registerThemeCallback(this.themeCallback);
    this.ts.registerLangCallback(this.langCallback);

    // Dynamic zoom updating using RxJS switchMap to ensure only the latest API call resolves
    this.zoomSubject.pipe(
      switchMap(({ lat, lng, zoom }) => {
        const radius = Math.max(1000, Math.min(15000, Math.round(4000 * Math.pow(2, 14 - zoom))));
        return this.eco.fetchStationsObservable(lat, lng, radius);
      }),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.renderMapMarkers();
    });

    this.loadDataAndInitMap();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.eco.unregisterThemeCallback(this.themeCallback);
    this.ts.unregisterLangCallback(this.langCallback);
    if (this.eco.map) {
      this.eco.map.remove();
      this.eco.map = null;
    }
    this.eco.markerLayers = null;
  }

  async loadDataAndInitMap() {
    await Promise.all([
      this.eco.ensureStationsLoaded(),
      this.eco.ensureNetworkColorsLoaded()
    ]);
    this.initLeafletMap();
    // Automatically retrieve live location on component load
    setTimeout(() => {
      this.locateUser();
    }, 100);
  }

  initLeafletMap() {
    // Expose a window bridge for the Leaflet popup buttons
    (window as any).angularMapComponent = this;

    if (!this.eco.map) {
      this.eco.map = L.map("leaflet-map-container").setView([this.eco.carLocation.lat, this.eco.carLocation.lng], 13);
      
      this.tileLayerInstance = L.tileLayer(this.getMapTileUrl(), {
          attribution: '&copy; OpenStreetMap &copy; CARTO',
          subdomains: 'abcd',
          maxZoom: 20
      }).addTo(this.eco.map);

      this.eco.markerLayers = L.layerGroup().addTo(this.eco.map);

      // Listen for click on the map to pick coordinates when coordinate picker is active
      this.eco.map.on('click', (e: any) => {
        if (this.isPickingLocation) {
          this.newStation.lat = parseFloat(e.latlng.lat.toFixed(6));
          this.newStation.lng = parseFloat(e.latlng.lng.toFixed(6));
          this.isPickingLocation = false;
          this.eco.showToast('TOAST_COORDS_SELECTED', 'success', { lat: this.newStation.lat, lng: this.newStation.lng });
          this.drawTempMarker(this.newStation.lat, this.newStation.lng);
        }
      });

      // Listen for zoom events to update stations dynamically
      this.eco.map.on('zoomend', () => {
        const center = this.eco.map.getCenter();
        const zoom = this.eco.map.getZoom();
        this.zoomSubject.next({ lat: center.lat, lng: center.lng, zoom });
      });
    } else {
      // If it exists, reposition map view container
      setTimeout(() => this.eco.map.invalidateSize(), 50);
    }

    this.renderMapMarkers();
  }

  onThemeChanged() {
    if (this.eco.map && this.tileLayerInstance) {
      this.eco.map.removeLayer(this.tileLayerInstance);
      this.tileLayerInstance = L.tileLayer(this.getMapTileUrl(), {
          attribution: '&copy; OpenStreetMap &copy; CARTO',
          subdomains: 'abcd',
          maxZoom: 20
      }).addTo(this.eco.map);
    }
    this.renderMapMarkers();
  }

  getMapTileUrl(): string {
    return this.eco.currentTheme === 'dark'
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
  }

  onFilterChange() {
    this.renderMapMarkers();
  }

  locateUser() {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      this.eco.showToast('TOAST_RETRIEVING_COORDS', 'info');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          this.syncLocation(lat, lng, 'TOAST_LOC_SYNC_SUCCESS');
        },
        (error) => {
          console.warn('HTML5 geolocation with high accuracy failed, trying low accuracy...', error);
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const lat = pos.coords.latitude;
              const lng = pos.coords.longitude;
              this.syncLocation(lat, lng, 'TOAST_LOC_SYNC_SUCCESS');
            },
            (err) => {
              console.warn('HTML5 geolocation failed or disabled, using Sheraton Grand Bengaluru Whitefield fallback...', err);
              let errorKey = 'TOAST_LOC_FETCH_FAILED';
              if (error.code === error.PERMISSION_DENIED) {
                errorKey = 'TOAST_LOC_DENIED';
                this.eco.showToast(errorKey, 'warning');
              }
              this.useDefaultLocation();
            },
            { enableHighAccuracy: false, timeout: 4000 }
          );
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      this.useDefaultLocation();
    }
  }

  useDefaultLocation() {
    const lat = 12.9839;
    const lng = 77.7523;
    this.syncLocation(lat, lng, 'TOAST_LOC_SYNC_SUCCESS');
  }

  syncLocation(lat: number, lng: number, toastKey: string) {
    this.eco.carLocation = { lat, lng };
    this.eco.generateLocalStations(lat, lng).then(() => {
      this.eco.showToast(toastKey, 'success');
      if (this.eco.map) {
        this.eco.map.setView([lat, lng], 14);
      }
      this.renderMapMarkers();
    });
  }

  async fallbackToIpLocation() {
    // 1. Try Geolocation-DB
    try {
      console.log('Trying Geolocation-DB...');
      const res = await fetch('https://geolocation-db.com/json/');
      const data = await res.json();
      if (data && data.latitude !== undefined && data.longitude !== undefined) {
        const lat = parseFloat(data.latitude);
        const lng = parseFloat(data.longitude);
        console.log('Resolved via Geolocation-DB:', lat, lng);
        this.syncLocation(lat, lng, 'TOAST_LOC_SYNC_SUCCESS');
        return;
      }
    } catch (e) {
      console.warn('Geolocation-DB fallback failed, trying next...', e);
    }

    // 2. Try FreeIPAPI
    try {
      console.log('Trying FreeIPAPI...');
      const res = await fetch('https://freeipapi.com/api/json');
      const data = await res.json();
      if (data && data.latitude !== undefined && data.longitude !== undefined) {
        const lat = parseFloat(data.latitude);
        const lng = parseFloat(data.longitude);
        console.log('Resolved via FreeIPAPI:', lat, lng);
        this.syncLocation(lat, lng, 'TOAST_LOC_SYNC_SUCCESS');
        return;
      }
    } catch (e) {
      console.warn('FreeIPAPI fallback failed, trying next...', e);
    }

    // 3. Try IPWho.is
    try {
      console.log('Trying IPWho.is...');
      const res = await fetch('https://ipwho.is/');
      const data = await res.json();
      if (data && data.success && data.latitude !== undefined && data.longitude !== undefined) {
        const lat = parseFloat(data.latitude);
        const lng = parseFloat(data.longitude);
        console.log('Resolved via IPWho.is:', lat, lng);
        this.syncLocation(lat, lng, 'TOAST_LOC_SYNC_SUCCESS');
        return;
      }
    } catch (e) {
      console.warn('IPWho.is fallback failed, trying next...', e);
    }

    // 4. Try IPApi.co
    try {
      console.log('Trying IPApi.co...');
      const res = await fetch('https://ipapi.co/json/');
      const data = await res.json();
      if (data && data.latitude !== undefined && data.longitude !== undefined) {
        const lat = parseFloat(data.latitude);
        const lng = parseFloat(data.longitude);
        console.log('Resolved via IPApi.co:', lat, lng);
        this.syncLocation(lat, lng, 'TOAST_LOC_SYNC_SUCCESS');
        return;
      }
    } catch (e) {
      console.warn('IPApi.co fallback failed, staying in default (Sheraton Grand Bengaluru Whitefield)...', e);
    }

    // If all fail, fallback to defaults (Sheraton Grand Bengaluru Whitefield)
    const defaultLat = 12.9839;
    const defaultLng = 77.7523;
    this.syncLocation(defaultLat, defaultLng, 'TOAST_LOC_SYNC_SUCCESS');
  }

  async searchLocation() {
    if (!this.searchQuery.trim()) return;
    this.eco.showToast('TOAST_SEARCHING_FOR', 'info', { query: this.searchQuery });
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(this.searchQuery)}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data && data.length > 0) {
        const result = data[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        
        this.eco.carLocation = { lat, lng };
        await this.eco.generateLocalStations(lat, lng);
        
        this.eco.showToast('TOAST_FOUND_LOCATION', 'success', { name: result.display_name });
        
        if (this.eco.map) {
          this.eco.map.setView([lat, lng], 14);
        }
        this.renderMapMarkers();
      } else {
        this.eco.showToast('TOAST_LOCATION_NOT_FOUND', 'warning');
      }
    } catch (e) {
      console.error('Geocoding search failed', e);
      this.eco.showToast('TOAST_SEARCH_FAILED', 'danger');
    }
  }

  get filteredStations(): ChargingStation[] {
    return this.eco.stationsData.filter(st => {
      const matchesNetwork = this.filterNetworks[st.network];
      const matchesConnector = this.filterConnectors[st.connector];
      const matchesStatus = this.filterStatuses[st.status];
      return matchesNetwork && matchesConnector && matchesStatus;
    });
  }

  renderMapMarkers() {
    if (!this.eco.markerLayers) return;
    this.eco.markerLayers.clearLayers();
    this.stationMarkersMap = {};

    if (this.routePolyline && this.eco.map) {
      this.eco.map.removeLayer(this.routePolyline);
      this.routePolyline = null;
    }

    // 1. Draw Charging Stations with numbers
    this.filteredStations.forEach((st, i) => {
        const color = this.eco.networkColors[st.network];
        
        const isPetrolPump = st.id >= 500;
        const markerHtml = isPetrolPump
          ? `<i class="fa-solid fa-gas-pump" style="font-size: 10px; color: white;"></i>`
          : `${i + 1}`;

        const customIcon = L.divIcon({
            className: "custom-map-marker",
            html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 2.5px solid #fff; box-shadow: 0 0 10px ${color}; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; color: white;">${markerHtml}</div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });

        const marker = L.marker([st.lat, st.lng], { icon: customIcon }).addTo(this.eco.markerLayers);
        this.stationMarkersMap[st.id] = marker;
        
        marker.on('click', () => {
            this.selectStation(st.id);
        });
    });

    // 2. Draw Vehicle Location Marker with Pulse Ring
    const carIcon = L.divIcon({
        className: "custom-car-marker",
        html: `<div style="position: relative; width: 22px; height: 22px;">
                 <div style="position: absolute; top: -4px; left: -4px; width: 30px; height: 30px; border-radius: 50%; background-color: rgba(59, 130, 246, 0.45); animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                 <div style="background-color: #3b82f6; width: 22px; height: 22px; border-radius: 50%; border: 3px solid #ffffff; box-shadow: 0 0 12px rgba(59,130,246,0.65); display: flex; align-items: center; justify-content: center; position: relative; z-index: 5;">
                   <i class="fa-solid fa-car-side" style="color: white; font-size: 10px;"></i>
                 </div>
               </div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
    });

    const carMarker = L.marker([this.eco.carLocation.lat, this.eco.carLocation.lng], { icon: carIcon }).addTo(this.eco.markerLayers);
    carMarker.bindPopup(`
        <div class="map-popup">
            <h4 style="color: #3b82f6;"><i class="fa-solid fa-car-side"></i> ${this.ts.translate('CONNECTED_EV')}</h4>
            <p style="margin-bottom: 4px;"><strong>${this.ts.translate('VEHICLE')}:</strong> ${this.ts.translate('VEHICLE_NAME')}</p>
            <p style="margin-bottom: 4px;"><strong>${this.ts.translate('BATTERY_SOC')}:</strong> ${this.eco.vehicleSoc.toFixed(0)}%</p>
            <p style="margin-bottom: 0;"><strong>${this.ts.translate('ESTIMATED_RANGE')}:</strong> ${this.eco.estimatedRange} km</p>
        </div>
    `);

    // Draw route if a station is currently selected
    if (this.eco.selectedStation) {
      const selected = this.filteredStations.find(s => s.id === this.eco.selectedStation?.id);
      if (selected) {
        this.drawRouteToStation(selected);
      }
    }
  }

  get selectedStationDistance(): number | null {
    if (this.calculatedDistance !== null) return this.calculatedDistance;
    if (!this.eco.selectedStation) return null;
    const start = L.latLng(this.eco.carLocation.lat, this.eco.carLocation.lng);
    const end = L.latLng(this.eco.selectedStation.lat, this.eco.selectedStation.lng);
    const distanceMeters = start.distanceTo(end);
    return parseFloat((distanceMeters / 1000).toFixed(2));
  }

  get selectedStationDuration(): number | null {
    if (this.calculatedDuration !== null) return this.calculatedDuration;
    const dist = this.selectedStationDistance;
    if (dist === null) return null;
    const averageSpeedKmh = 30;
    const durationHours = dist / averageSpeedKmh;
    return Math.round(durationHours * 60);
  }

  get selectedStationCanReach(): boolean {
    const dist = this.selectedStationDistance;
    if (dist === null) return false;
    return this.eco.estimatedRange >= dist;
  }

  deselectStation() {
    this.eco.selectedStation = null;
    this.calculatedDistance = null;
    this.calculatedDuration = null;
    this.renderMapMarkers();
  }

  startChargingFromRoute() {
    if (this.eco.selectedStation && this.eco.selectedStation.status === 'Available') {
      this.eco.startPlugAndChargeSimulation();
      this.router.navigate(['/dashboard']);
    }
  }

  selectStation(stationId: number) {
    this.eco.selectStation(stationId);
    const st = this.eco.stationsData.find(s => s.id === stationId);
    if (st) {
      this.drawRouteToStation(st);
    }
  }

  onStationItemClick(st: ChargingStation) {
    if (this.eco.map) {
      this.eco.map.setView([st.lat, st.lng], 14);
    }
    this.drawRouteToStation(st);
    if (st.status === 'Available') {
      this.eco.selectStation(st.id);
    } else {
      this.eco.showToast('TOAST_STATION_OCCUPIED', 'warning', { name: st.name });
    }
  }

  async drawRouteToStation(st: ChargingStation) {
    if (this.routePolyline && this.eco.map) {
      this.eco.map.removeLayer(this.routePolyline);
      this.routePolyline = null;
    }
    
    if (!this.eco.map) return;

    const startLat = this.eco.carLocation.lat;
    const startLng = this.eco.carLocation.lng;
    const endLat = st.lat;
    const endLng = st.lng;

    let points: [number, number][] = [[startLat, startLng], [endLat, endLng]];

    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data && data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        this.calculatedDistance = parseFloat((route.distance / 1000).toFixed(2));
        this.calculatedDuration = Math.round(route.duration / 60);
        
        const coords = route.geometry.coordinates;
        points = coords.map((c: any) => [c[1], c[0]]);
      } else {
        this.fallbackRouteMetrics(st);
      }
    } catch (e) {
      console.error('Failed to retrieve road route from OSRM, falling back to straight line', e);
      this.fallbackRouteMetrics(st);
    }

    if (this.eco.map) {
      this.routePolyline = L.polyline(points, {
          color: '#3b82f6',
          weight: 5,
          opacity: 0.85,
          className: 'glowing-route-line'
      }).addTo(this.eco.map);

      const tooltipText = `${this.calculatedDuration} ${this.ts.translate('MINS')} (${this.calculatedDistance} km)`;
      this.routePolyline.bindTooltip(tooltipText, {
          permanent: true,
          direction: 'center',
          className: 'route-tooltip-bubble'
      }).openTooltip();

      const bounds = L.latLngBounds(points);
      this.eco.map.fitBounds(bounds, { padding: [50, 50] });
    }
  }

  fallbackRouteMetrics(st: ChargingStation) {
    const start = L.latLng(this.eco.carLocation.lat, this.eco.carLocation.lng);
    const end = L.latLng(st.lat, st.lng);
    const distanceMeters = start.distanceTo(end);
    this.calculatedDistance = parseFloat((distanceMeters / 1000).toFixed(2));
    
    const averageSpeedKmh = 30;
    const durationHours = this.calculatedDistance / averageSpeedKmh;
    this.calculatedDuration = Math.round(durationHours * 60);
  }

  openOnboardForm() {
    this.showOnboardForm = true;
    this.isPickingLocation = false;
    this.isDragged = false; // Reset drag position on open
    this.newStation.lat = parseFloat(this.eco.carLocation.lat.toFixed(6));
    this.newStation.lng = parseFloat(this.eco.carLocation.lng.toFixed(6));
    this.drawTempMarker(this.newStation.lat, this.newStation.lng);
  }

  closeOnboardForm() {
    this.showOnboardForm = false;
    this.isPickingLocation = false;
    this.removeTempMarker();
  }

  toggleMapPicker() {
    this.isPickingLocation = !this.isPickingLocation;
    if (this.isPickingLocation) {
      this.eco.showToast('TOAST_CLICK_MAP_COORDS', 'info');
    }
  }

  onCoordInput() {
    if (this.newStation.lat && this.newStation.lng) {
      this.drawTempMarker(this.newStation.lat, this.newStation.lng);
    }
  }

  drawTempMarker(lat: number, lng: number) {
    this.removeTempMarker();
    if (!this.eco.map) return;

    const tempIcon = L.divIcon({
      className: "temp-map-marker",
      html: `<div style="background-color: var(--neon-purple); width: 22px; height: 22px; border-radius: 50%; border: 2.5px solid #fff; box-shadow: 0 0 10px var(--neon-purple); display: flex; align-items: center; justify-content: center; position: relative;">
               <div style="position: absolute; width: 30px; height: 30px; border-radius: 50%; background-color: rgba(168, 85, 247, 0.45); animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
               <i class="fa-solid fa-plus" style="color: white; font-size: 10px; position: relative; z-index: 5;"></i>
             </div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11]
    });

    this.tempMarker = L.marker([lat, lng], { icon: tempIcon }).addTo(this.eco.map);
    this.eco.map.setView([lat, lng], this.eco.map.getZoom());
  }

  removeTempMarker() {
    if (this.tempMarker && this.eco.map) {
      this.eco.map.removeLayer(this.tempMarker);
      this.tempMarker = null;
    }
  }

  submitOnboardForm(event: Event) {
    event.preventDefault();
    if (!this.newStation.name || !this.newStation.name.trim() ||
        this.newStation.lat === undefined || this.newStation.lat === null || (this.newStation.lat as any) === '' ||
        this.newStation.lng === undefined || this.newStation.lng === null || (this.newStation.lng as any) === '' ||
        this.newStation.price === undefined || this.newStation.price === null || (this.newStation.price as any) === '' ||
        this.newStation.gunsCount === undefined || this.newStation.gunsCount === null || (this.newStation.gunsCount as any) === '' || this.newStation.gunsCount <= 0) {
      this.eco.showToast('TOAST_FILL_FIELDS_CORRECTLY', 'warning');
      return;
    }

    if (!this.newStation.agreeTC || !this.newStation.certifySpecs) {
      this.eco.showToast('TOAST_ACCEPT_TERMS', 'warning');
      return;
    }

    const guns = [];
    for (let i = 0; i < this.newStation.gunsCount; i++) {
      guns.push({
        id: String.fromCharCode(65 + i),
        type: this.newStation.connector,
        status: 'Available'
      });
    }

    const stationDataToOnboard = {
      name: this.newStation.name,
      network: this.newStation.network,
      lat: this.newStation.lat,
      lng: this.newStation.lng,
      speed: this.newStation.speed,
      connector: this.newStation.connector,
      price: this.newStation.price,
      guns: guns
    };

    this.eco.onboardStation(stationDataToOnboard);
    
    this.removeTempMarker();
    this.showOnboardForm = false;
    this.isPickingLocation = false;
    
    this.newStation = {
      name: '',
      network: 'Tata Power',
      lat: 0,
      lng: 0,
      speed: 'DC 150kW',
      connector: 'CCS2',
      price: 18.00,
      gunsCount: 2,
      agreeTC: false,
      certifySpecs: false
    };

    this.renderMapMarkers();
  }

  onDragStart(event: MouseEvent) {
    if (event.button !== 0) return;
    
    const target = event.target as HTMLElement;
    if (target.closest('button')) return;

    event.preventDefault();

    const modalEl = document.querySelector('.bottom-middle-modal') as HTMLElement;
    const parentEl = document.querySelector('.map-wrapper') as HTMLElement;
    if (!modalEl || !parentEl) return;

    const modalRect = modalEl.getBoundingClientRect();
    const parentRect = parentEl.getBoundingClientRect();

    if (!this.isDragged) {
      this.modalPosition.x = modalRect.left - parentRect.left;
      this.modalPosition.y = modalRect.top - parentRect.top;
      this.isDragged = true;
    }

    this.dragStartMouse.x = event.clientX;
    this.dragStartMouse.y = event.clientY;
    this.dragStartModal.x = this.modalPosition.x;
    this.dragStartModal.y = this.modalPosition.y;

    this.dragListener = (moveEvent: MouseEvent) => this.onDragMove(moveEvent, parentRect);
    this.dragEndListener = () => this.onDragEnd();

    document.addEventListener('mousemove', this.dragListener);
    document.addEventListener('mouseup', this.dragEndListener);
  }

  onDragMove(event: MouseEvent, parentRect: DOMRect) {
    const deltaX = event.clientX - this.dragStartMouse.x;
    const deltaY = event.clientY - this.dragStartMouse.y;

    let newX = this.dragStartModal.x + deltaX;
    let newY = this.dragStartModal.y + deltaY;

    const modalEl = document.querySelector('.bottom-middle-modal') as HTMLElement;
    if (modalEl) {
      const modalWidth = modalEl.offsetWidth;
      const modalHeight = modalEl.offsetHeight;

      newX = Math.max(0, Math.min(newX, parentRect.width - modalWidth));
      newY = Math.max(0, Math.min(newY, parentRect.height - modalHeight));
    }

    this.modalPosition.x = newX;
    this.modalPosition.y = newY;
  }

  onDragEnd() {
    document.removeEventListener('mousemove', this.dragListener);
    document.removeEventListener('mouseup', this.dragEndListener);
  }
}
