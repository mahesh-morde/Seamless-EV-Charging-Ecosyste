import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EcosystemService, ChargingStation } from '../../services/ecosystem.service';

declare const L: any;

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './map.component.html',
  styleUrls: []
})
export class MapComponent implements AfterViewInit {
  tileLayerInstance: any = null;
  stationMarkersMap: { [key: number]: any } = {};
  routePolyline: any = null;

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

  constructor(public eco: EcosystemService) {}

  ngAfterViewInit() {
    this.initLeafletMap();
    this.eco.registerThemeCallback(() => {
      this.onThemeChanged();
    });
    // Automatically retrieve live location on component load
    setTimeout(() => {
      this.locateUser();
    }, 100);
  }

  initLeafletMap() {
    // Expose a window bridge for the Leaflet popup buttons
    (window as any).angularMapComponent = this;

    if (!this.eco.map) {
      this.eco.map = L.map("leaflet-map-container").setView([18.5204, 73.8567], 13);
      
      this.tileLayerInstance = L.tileLayer(this.getMapTileUrl(), {
          attribution: '&copy; OpenStreetMap &copy; CARTO',
          subdomains: 'abcd',
          maxZoom: 20
      }).addTo(this.eco.map);

      this.eco.markerLayers = L.layerGroup().addTo(this.eco.map);
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
      this.eco.showToast("Retrieving your physical coordinates...", "info");
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          this.eco.carLocation = { lat, lng };
          this.eco.generateLocalStations(lat, lng);
          this.eco.showToast("Location synchronized successfully! Real-time petrol pumps updated.", "success");
          if (this.eco.map) {
            this.eco.map.setView([lat, lng], 14);
          }
          this.renderMapMarkers();
        },
        (error) => {
          let errorMsg = "Unable to fetch live location.";
          if (error.code === error.PERMISSION_DENIED) {
            errorMsg = "Location access denied. Please enable browser location permissions.";
          }
          this.eco.showToast(errorMsg, "warning");
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      this.eco.showToast("HTML5 Geolocation is not supported by your browser.", "danger");
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
        
        const customIcon = L.divIcon({
            className: "custom-map-marker",
            html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 2.5px solid #fff; box-shadow: 0 0 10px ${color}; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; color: white;">${i + 1}</div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });

        const marker = L.marker([st.lat, st.lng], { icon: customIcon }).addTo(this.eco.markerLayers);
        this.stationMarkersMap[st.id] = marker;
        
        const gunsHtml = st.guns.map(g => `
          <span style="padding: 2px 6px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px; background: rgba(0,0,0,0.2); font-size: 10px; border: 1px solid rgba(255,255,255,0.06); color: ${g.status === 'Available' ? 'var(--neon-green)' : 'var(--text-secondary)'}">
            <i class="fa-solid fa-plug" style="font-size: 8px;"></i> Gun ${g.id}: ${g.status}
          </span>
        `).join(' ');

        const popupContent = `
            <div class="map-popup">
                <h4 style="display: flex; align-items: center; gap: 6px;">
                  <span style="background-color: ${color}; width: 18px; height: 18px; border-radius: 50%; color: white; font-size: 10px; display: inline-flex; align-items: center; justify-content: center; font-weight: bold;">${i + 1}</span>
                  ${st.name}
                </h4>
                <p><strong>Provider:</strong> ${st.network}</p>
                <p><strong>Speed:</strong> ${st.speed} (${st.connector})</p>
                <p><strong>Price:</strong> ₹${st.price.toFixed(2)}/kWh</p>
                <div style="margin: 6px 0; display: flex; flex-wrap: wrap; gap: 4px;">
                  ${gunsHtml}
                </div>
                ${st.status === 'Available' ? `<button class="btn btn-primary btn-sm" style="width: 100%; margin-top: 6px;" onclick="window.angularMapComponent.selectStation(${st.id})">Initiate Session</button>` : ''}
            </div>
        `;
        
        marker.bindPopup(popupContent);
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
            <h4 style="color: #3b82f6;"><i class="fa-solid fa-car-side"></i> Connected EV</h4>
            <p style="margin-bottom: 4px;"><strong>Vehicle:</strong> Mahindra XUV400</p>
            <p style="margin-bottom: 4px;"><strong>Battery SOC:</strong> ${this.eco.vehicleSoc.toFixed(0)}%</p>
            <p style="margin-bottom: 0;"><strong>Estimated Range:</strong> ${this.eco.estimatedRange} km</p>
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
    const marker = this.stationMarkersMap[st.id];
    if (marker) {
      setTimeout(() => marker.openPopup(), 100);
    }
    this.drawRouteToStation(st);
    if (st.status === 'Available') {
      this.eco.selectStation(st.id);
    } else {
      this.eco.showToast(`Station ${st.name} is currently occupied.`, 'warning');
    }
  }

  drawRouteToStation(st: ChargingStation) {
    if (this.routePolyline && this.eco.map) {
      this.eco.map.removeLayer(this.routePolyline);
    }
    
    if (!this.eco.map) return;

    const start = [this.eco.carLocation.lat, this.eco.carLocation.lng];
    const end = [st.lat, st.lng];

    this.routePolyline = L.polyline([start, end], {
        color: '#3b82f6',
        weight: 5,
        opacity: 0.85,
        className: 'glowing-route-line'
    }).addTo(this.eco.map);

    // Zoom to bounds showing both car and station
    const bounds = L.latLngBounds([start, end]);
    this.eco.map.fitBounds(bounds, { padding: [50, 50] });
  }
}
