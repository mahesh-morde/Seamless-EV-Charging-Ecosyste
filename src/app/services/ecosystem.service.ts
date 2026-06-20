import { Injectable } from '@angular/core';
import { TranslationService } from './translation.service';

export interface ChargingStation {
  id: number;
  name: string;
  network: string;
  lat: number;
  lng: number;
  speed: string;
  connector: string;
  price: number;
  status: string;
  guns: { id: string; type: string; status: string }[];
}

export interface LogLine {
  time: string;
  direction: string;
  message: string;
}

export interface SessionRecord {
  date: string;
  station: string;
  network: string;
  energy: number;
  duration: number;
  cost: number;
  status: string;
}

export interface WalletTransaction {
  id: string;
  date: string;
  type: 'payment' | 'topup';
  description: string;
  amount: number;
  status: string;
  method: string;
}

export interface ToastMessage {
  id: number;
  message: string;
  type: string;
}

@Injectable({
  providedIn: 'root'
})
export class EcosystemService {
  // Global State
  isLoggedIn = false;
  loggedInUser: 'user' | 'admin' | null = null;
  walletBalance = 1250.00;
  co2Saved = 184.5;
  vehicleSoc = 71;
  estimatedRange = 245;
  isNetworkOnline = true;
  activeSession: any = null;
  offlineQueue: any[] = [];
  selectedStation: ChargingStation | null = null;
  showThemeMapping = false;
  activeTab = 'dashboard';
  chargingInterval: any = null;
  map: any = null;
  markerLayers: any = null;
  currentRole: 'driver' | 'operator' = 'driver';
  currentTheme: 'dark' | 'light' = 'light';
  carLocation = { lat: 18.5220, lng: 73.8480 };
  gridLoad = 72;
  isGridOverloaded = false;
  userStations: ChargingStation[] = [];

  // Mock Stations Data
  stationsData: ChargingStation[] = [
    { id: 1, name: "Tata Power Fast-Charger - JW Marriott Hotel, SB Road", network: "Tata Power", lat: 18.5327, lng: 73.8300, speed: "DC 60kW", connector: "CCS2", price: 19.00, status: "Available", guns: [{ id: 'A', type: 'CCS2', status: 'Available' }, { id: 'B', type: 'CCS2', status: 'Occupied' }] },
    { id: 2, name: "Zeon Charging - Sayaji Hotel, Wakad", network: "Zeon", lat: 18.5960, lng: 73.7600, speed: "DC 50kW", connector: "CCS2", price: 17.50, status: "Available", guns: [{ id: 'A', type: 'CCS2', status: 'Available' }] },
    { id: 3, name: "ChargeZone Station - Courtyard by Marriott, Hinjewadi", network: "ChargeZone", lat: 18.5912, lng: 73.7388, speed: "DC 120kW", connector: "CCS2", price: 18.00, status: "Occupied", guns: [{ id: 'A', type: 'CCS2', status: 'Occupied' }, { id: 'B', type: 'CCS2', status: 'Occupied' }] },
    { id: 4, name: "Tata Power Charging - Amanora Mall, Hadapsar", network: "Tata Power", lat: 18.5204, lng: 73.9358, speed: "DC 150kW", connector: "CCS2", price: 18.50, status: "Available", guns: [{ id: 'A', type: 'CCS2', status: 'Available' }, { id: 'B', type: 'CCS2', status: 'Available' }] },
    { id: 5, name: "Bolt Smart AC Charger - Phoenix Marketcity, Viman Nagar", network: "Bolt", lat: 18.5624, lng: 73.9168, speed: "AC 7.4kW", connector: "Type 2", price: 12.00, status: "Available", guns: [{ id: 'A', type: 'Type 2', status: 'Available' }] },
    { id: 6, name: "ChargeZone Hub - Hyatt Regency, Weikfield IT Park", network: "ChargeZone", lat: 18.5615, lng: 73.9090, speed: "DC 60kW", connector: "CCS2", price: 17.00, status: "Occupied", guns: [{ id: 'A', type: 'CCS2', status: 'Occupied' }] },
    { id: 7, name: "Bolt Smart AC Point - Season's Mall, Hadapsar", network: "Bolt", lat: 18.5200, lng: 73.9320, speed: "AC 22kW", connector: "Type 2", price: 11.50, status: "Available", guns: [{ id: 'A', type: 'Type 2', status: 'Available' }] }
  ];

  networkColors: { [key: string]: string } = {
    "Tata Power": "#06b6d4",
    "Zeon": "#10b981",
    "ChargeZone": "#a855f7",
    "Bolt": "#fbbf24"
  };

  sessionHistory: SessionRecord[] = [
    { date: "2026-06-08 18:32", station: "Zeon Fast-Charge Zone A2", network: "Zeon", energy: 35.4, duration: 35, cost: 637.20, status: "Paid (VoltStream)" },
    { date: "2026-06-05 10:14", station: "Tata Power Substation DC03", network: "Tata Power", energy: 18.2, duration: 20, cost: 327.60, status: "Paid (VoltStream)" },
    { date: "2026-06-01 14:02", station: "ChargeZone Highway Hub B1", network: "ChargeZone", energy: 44.5, duration: 48, cost: 845.50, status: "Paid (VoltStream)" }
  ];

  walletTransactions: WalletTransaction[] = [
    { id: "TX-1001", date: "2026-06-08 18:32", type: "payment", description: "Zeon Fast-Charge Zone A2", amount: 637.20, status: "Success", method: "Zeon" },
    { id: "TX-1002", date: "2026-06-07 12:00", type: "topup", description: "Fund Added via UPI", amount: 1000.00, status: "Success", method: "UPI" },
    { id: "TX-1003", date: "2026-06-05 10:14", type: "payment", description: "Tata Power Substation DC03", amount: 327.60, status: "Success", method: "Tata Power" },
    { id: "TX-1004", date: "2026-06-03 15:30", type: "topup", description: "Fund Added via Card", amount: 500.00, status: "Success", method: "CARD" },
    { id: "TX-1005", date: "2026-06-01 14:02", type: "payment", description: "ChargeZone Highway Hub B1", amount: 845.50, status: "Success", method: "ChargeZone" },
    { id: "TX-1006", date: "2026-05-30 09:00", type: "topup", description: "Fund Added via UPI", amount: 1500.00, status: "Success", method: "UPI" }
  ];

  ocppLogs: LogLine[] = [];

  toasts: ToastMessage[] = [];
  toastCounter = 0;

  // ISO 15118 simulation timeline state
  handshakeSteps = {
    connect: 'disabled',
    tls: 'disabled',
    auth: 'disabled',
    charge: 'disabled'
  };
  plugged = false;
  connected = false;
  plugStatus = 'Unplugged';

  // Listeners for chart updates
  private chartCallbacks: (() => void)[] = [];
  images: any = {};

  constructor(private ts: TranslationService) {
    this.loadImages();
    this.checkSession();
    this.logOcppMessage('SYSTEM', 'LOG_TERMINAL_INIT');
  }

  checkSession() {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const sessionStr = localStorage.getItem('voltstream_session');
        if (sessionStr) {
          const session = JSON.parse(sessionStr);
          if (session && session.username && session.expiry && session.expiry > Date.now()) {
            this.isLoggedIn = true;
            this.loggedInUser = session.username;
            this.currentRole = session.username === 'user' ? 'driver' : 'operator';
          } else {
            localStorage.removeItem('voltstream_session');
          }
        }
      } catch (e) {
        console.error('Failed to parse session from localStorage', e);
      }
    }
  }

  async loadImages() {
    try {
      const response = await fetch('./images.json');
      const data = await response.json();
      this.images = {};
      for (const key of Object.keys(data)) {
        this.images[key] = data[key].replace(/^public\//, '');
      }
    } catch (e) {
      console.error('Failed to load images.json', e);
    }
  }

  registerChartCallback(cb: () => void) {
    this.chartCallbacks.push(cb);
  }

  unregisterChartCallback(cb: () => void) {
    this.chartCallbacks = this.chartCallbacks.filter(c => c !== cb);
  }

  notifyCharts() {
    this.chartCallbacks.forEach(cb => cb());
  }

  // Listeners for theme updates
  private themeCallbacks: (() => void)[] = [];

  registerThemeCallback(cb: () => void) {
    this.themeCallbacks.push(cb);
  }

  notifyThemeChange() {
    this.themeCallbacks.forEach(cb => cb());
  }

  // Toast notifier
  showToast(messageKey: string, type = 'info', params?: any) {
    let msg = this.ts.translate(messageKey);
    if (params) {
      Object.keys(params).forEach(k => {
        msg = msg.replace(`{{${k}}}`, params[k]);
      });
    }
    const id = this.toastCounter++;
    this.toasts.push({ id, message: msg, type });
    setTimeout(() => {
      this.toasts = this.toasts.filter(t => t.id !== id);
    }, 4500);
  }

  selectStation(stationId: number) {
    const station = this.stationsData.find(s => s.id === stationId);
    if (station) {
      this.selectedStation = station;
      this.showToast('TOAST_SELECTED_STATION', 'info', { name: station.name });
    }
  }

  clearLogs() {
    this.ocppLogs = [
      { time: new Date().toLocaleTimeString(), direction: 'SYSTEM', message: this.ts.translate('LOG_TERMINAL_CLEARED') }
    ];
  }

  login(username: string, password: string): boolean {
    const u = username.trim().toLowerCase();
    if ((u === 'user' || u === 'admin') && password === 'password') {
      this.isLoggedIn = true;
      this.loggedInUser = u as 'user' | 'admin';
      this.currentRole = u === 'user' ? 'driver' : 'operator';

      if (typeof window !== 'undefined' && window.localStorage) {
        const expiry = Date.now() + 60 * 60 * 1000; // 1 hour expiry
        localStorage.setItem('voltstream_session', JSON.stringify({
          username: u,
          expiry: expiry
        }));
      }

      this.showToast('TOAST_LOGIN_SUCCESS', 'success', { name: u.toUpperCase() });
      return true;
    }
    this.showToast('TOAST_LOGIN_FAILED', 'danger');
    return false;
  }

  logout() {
    this.isLoggedIn = false;
    this.loggedInUser = null;
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('voltstream_session');
    }
    this.showToast('TOAST_LOGGED_OUT', 'info');
  }

  toggleRole() {
    this.currentRole = this.currentRole === 'driver' ? 'operator' : 'driver';
    const roleTranslated = this.currentRole === 'driver' 
      ? this.ts.translate('DRIVER_COMPANION') 
      : this.ts.translate('GRID_OPERATIONS');
    this.showToast('TOAST_SWITCHED_PERSPECTIVE', 'success', { role: roleTranslated });
    if (this.currentRole === 'driver' && this.activeTab === 'ocpp') {
      this.activeTab = 'dashboard';
    }
  }

  toggleTheme() {
    this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    if (typeof document !== 'undefined') {
      if (this.currentTheme === 'light') {
        document.body.classList.add('light-mode');
      } else {
        document.body.classList.remove('light-mode');
      }
    }
    this.showToast('TOAST_THEME_SWITCHED', 'info', { theme: this.currentTheme.toUpperCase() });
    this.notifyThemeChange();
  }

  toggleGridOverload() {
    this.isGridOverloaded = !this.isGridOverloaded;
    this.gridLoad = this.isGridOverloaded ? 92 : 72;
    
    if (this.isGridOverloaded) {
      this.logOcppMessage('RECEIVE', `[2, "${this.generateOcppId()}", "SetChargingProfile", {"chargingProfile": {"profileId": 101, "stackLevel": 1, "chargingProfilePurpose": "TxProfile", "chargingProfileKind": "Absolute", "chargingSchedule": {"duration": 1800, "chargingRateUnit": "W", "chargingSchedulePeriod": [{"startPeriod": 0, "limit": 70000}]}}}]`);
      this.logOcppMessage('SYSTEM', 'LOG_GRID_THROTTLE');
      this.showToast('TOAST_GRID_WARNING', 'warning');
      if (this.activeSession) {
        this.activeSession.kwRate = Math.min(this.activeSession.kwRate, 70);
      }
    } else {
      this.logOcppMessage('SYSTEM', 'LOG_GRID_NORMAL');
      this.showToast('TOAST_GRID_NORMALIZED', 'success');
    }
  }

  async generateLocalStations(lat: number, lng: number) {
    this.stationsData = [
      { id: 11, name: "Tata Power - Westin Hotel EV Zone", network: "Tata Power", lat: lat + 0.0035, lng: lng + 0.0041, speed: "DC 150kW", connector: "CCS2", price: 18.50, status: "Available", guns: [{ id: 'A', type: 'CCS2', status: 'Available' }, { id: 'B', type: 'CCS2', status: 'Occupied' }] },
      { id: 12, name: "Zeon Charging Hub - Shell Fuel Hub", network: "Zeon", lat: lat - 0.0042, lng: lng + 0.0053, speed: "DC 120kW", connector: "CCS2", price: 17.00, status: "Available", guns: [{ id: 'A', type: 'CCS2', status: 'Available' }, { id: 'B', type: 'CCS2', status: 'Available' }] },
      { id: 13, name: "ChargeZone Hub - Vivanta Hotel EV Point", network: "ChargeZone", lat: lat + 0.0063, lng: lng - 0.0032, speed: "DC 60kW", connector: "CCS2", price: 16.50, status: "Occupied", guns: [{ id: 'A', type: 'CCS2', status: 'Occupied' }] },
      { id: 14, name: "Tata Power - Radisson EV Station", network: "Tata Power", lat: lat - 0.0024, lng: lng - 0.0051, speed: "DC 120kW", connector: "CCS2", price: 18.00, status: "Available", guns: [{ id: 'A', type: 'CCS2', status: 'Available' }, { id: 'B', type: 'CCS2', status: 'Occupied' }] },
      { id: 15, name: "Bolt Smart AC - Decathlon Sports Hub", network: "Bolt", lat: lat + 0.0012, lng: lng - 0.0019, speed: "AC 7.4kW", connector: "Type 2", price: 12.00, status: "Available", guns: [{ id: 'A', type: 'Type 2', status: 'Available' }] },
      { id: 16, name: "Zeon Charging - Express Highway Station", network: "Zeon", lat: lat + 0.0085, lng: lng + 0.0091, speed: "DC 50kW", connector: "CCS2", price: 17.50, status: "Available", guns: [{ id: 'A', type: 'CCS2', status: 'Available' }] }
    ];

    try {
      const url = `https://overpass-api.de/api/interpreter?data=[out:json][timeout:15];node["amenity"="fuel"](around:4000,${lat},${lng});out;`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data && data.elements) {
        data.elements.forEach((element: any, idx: number) => {
          const name = element.tags.name || element.tags.brand || "Petrol Pump Charging Hub";
          const networks = ["Tata Power", "Zeon", "ChargeZone", "Bolt"];
          const brand = element.tags.brand ? element.tags.brand.toLowerCase() : "";
          let net = networks[idx % networks.length];
          if (brand.includes("tata")) net = "Tata Power";
          else if (brand.includes("zeon")) net = "Zeon";
          else if (brand.includes("charge")) net = "ChargeZone";
          else if (brand.includes("bolt")) net = "Bolt";

          const displayName = element.tags.name 
            ? `${element.tags.name} (EV Interop Hub)` 
            : `${element.tags.brand || 'Petrol Pump'} EV Charging Point`;

          const isAC = idx % 3 === 0;

          this.stationsData.push({
            id: 500 + idx,
            name: displayName,
            network: net,
            lat: element.lat,
            lng: element.lon,
            speed: isAC ? "AC 22kW" : "DC 60kW",
            connector: isAC ? "Type 2" : "CCS2",
            price: isAC ? 12.50 : 18.00,
            status: idx % 3 === 0 ? "Occupied" : "Available",
            guns: isAC 
              ? [{ id: 'A', type: 'Type 2', status: 'Available' }]
              : [{ id: 'A', type: 'CCS2', status: 'Available' }, { id: 'B', type: 'CCS2', status: 'Occupied' }]
          });
        });
      }
    } catch (e) {
      console.error("Failed to query real-time petrol pumps from OpenStreetMap", e);
    }

    this.stationsData.push(...this.userStations);
  }

  onboardStation(station: Omit<ChargingStation, 'id' | 'status'>) {
    const all = [...this.stationsData, ...this.userStations];
    const newId = all.length > 0 ? Math.max(...all.map(s => s.id)) + 1 : 100;
    const newStation: ChargingStation = {
      ...station,
      id: newId,
      status: 'Available'
    };
    this.userStations.push(newStation);
    this.stationsData.push(newStation);
    this.showToast('TOAST_ONBOARD_SUCCESS', 'success', { name: newStation.name });
    this.notifyCharts();
  }

  // ISO 15118 Plug & Charge
  startPlugAndChargeSimulation() {
    this.plugged = true;
    this.handshakeSteps = {
      connect: 'disabled',
      tls: 'disabled',
      auth: 'disabled',
      charge: 'disabled'
    };

    setTimeout(() => {
      this.connected = true;
      this.plugStatus = 'Connected';
      this.handshakeSteps.connect = 'completed';
      this.logOcppMessage('SYSTEM', 'LOG_PHYSICAL_CABLE', { connector: this.selectedStation?.connector || 'CCS2' });
      this.showToast('TOAST_CABLE_PLUGGED', 'success');
    }, 1000);

    setTimeout(() => {
      this.handshakeSteps.tls = 'active';
      this.logOcppMessage('SEND', `[2, "${this.generateOcppId()}", "SignCertificate", {"keyType": "ECDSA", "publicKey": "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE7v... "}]`);
      
      setTimeout(() => {
        this.handshakeSteps.tls = 'completed';
        this.logOcppMessage('RECEIVE', `[3, "msg-auth-cert", "SignCertificateResponse", {"status": "Accepted"}]`);
        this.logOcppMessage('SYSTEM', 'LOG_TLS_SECURE');
      }, 1200);
    }, 2500);

    setTimeout(() => {
      this.handshakeSteps.auth = 'active';
      this.logOcppMessage('SEND', `[2, "${this.generateOcppId()}", "Authorize", {"idToken": {"idToken": "IN-VOLT-MAHINDRA-983D", "type": "EMAID"}}]`);
      
      setTimeout(() => {
        if (this.walletBalance < 100) {
          this.handshakeSteps.auth = 'error';
          this.logOcppMessage('RECEIVE', `[3, "msg-auth-id", "AuthorizeResponse", {"idTokenInfo": {"status": "Blocked", "reason": "Insufficient Wallet Funds"}}]`);
          this.showToast('TOAST_WALLET_LOW', 'danger');
          this.resetChargingUI();
          return;
        }
        
        this.handshakeSteps.auth = 'completed';
        this.logOcppMessage('RECEIVE', `[3, "msg-auth-id", "AuthorizeResponse", {"idTokenInfo": {"status": "Accepted", "groupIdToken": "VoltStreamUnifiedPay"}}]`);
        this.logOcppMessage('SYSTEM', 'LOG_CONTRACT_VERIFIED');
      }, 1500);
    }, 4500);

    setTimeout(() => {
      if (this.walletBalance < 100) return;
      
      this.handshakeSteps.charge = 'active';
      this.logOcppMessage('SEND', `[2, "${this.generateOcppId()}", "TransactionEvent", {"eventType": "Started", "transactionId": "tx-volt-${Date.now()}", "timestamp": "${new Date().toISOString()}", "triggerReason": "CablePluggedIn", "seqNo": 0, "evse": {"id": 1, "connectorId": 1}}]`);
      
      setTimeout(() => {
        this.handshakeSteps.charge = 'completed';
        this.logOcppMessage('RECEIVE', `[3, "msg-tx-start", "TransactionEventResponse", {"totalCost": 0.0}]`);
        this.logOcppMessage('SYSTEM', 'LOG_TX_STARTED');
        
        this.startChargingTransaction();
      }, 1500);
    }, 7000);
  }

  startChargingTransaction() {
    if (!this.selectedStation) return;
    
    const speed = this.selectedStation.speed;
    const speedkW = speed.includes("150kW") ? 150 : 
                    speed.includes("120kW") ? 120 : 
                    speed.includes("60kW") ? 60 : 
                    speed.includes("50kW") ? 50 : 22;

    this.activeSession = {
      station: this.selectedStation,
      energyDelivered: 0.0,
      cost: 0.0,
      duration: 0,
      startSoc: this.vehicleSoc,
      kwRate: parseFloat((speedkW + (Math.random() * 4 - 2)).toFixed(1))
    };

    this.showToast('TOAST_CHARGING_STARTED', 'success', { speed: speedkW });

    this.chargingInterval = setInterval(() => {
      if (this.vehicleSoc >= 100) {
        this.stopChargingSession();
        return;
      }

      const socIncrement = (speedkW / 3600) * 8;
      this.vehicleSoc = Math.min(100, this.vehicleSoc + socIncrement);
      
      this.activeSession.kwRate = parseFloat((speedkW + (Math.random() * 4 - 2)).toFixed(1));
      this.activeSession.energyDelivered += (speedkW / 3600) * 12;
      this.activeSession.cost = this.activeSession.energyDelivered * (this.selectedStation?.price || 15);
      this.activeSession.duration += 1;
      
      this.estimatedRange = Math.round(this.vehicleSoc * 3.7);
      this.sendOcppTelemetryUpdate();
    }, 1500);
  }

  stopChargingSession() {
    if (!this.activeSession) return;
    
    clearInterval(this.chargingInterval);
    this.showToast('TOAST_CHARGING_STOPPING', 'warning');

    this.logOcppMessage('SEND', `[2, "${this.generateOcppId()}", "TransactionEvent", {"eventType": "Ended", "transactionId": "tx-volt-${Date.now()}", "timestamp": "${new Date().toISOString()}", "triggerReason": "StopAuthorize", "seqNo": 1, "meterValue": [{"timestamp": "${new Date().toISOString()}", "sampledValue": [{"value": "${this.activeSession.energyDelivered.toFixed(2)}"}]}]}]`);
    
    setTimeout(() => {
        this.logOcppMessage('RECEIVE', `[3, "msg-tx-stop", "TransactionEventResponse", {"totalCost": ${this.activeSession.cost.toFixed(2)}, "idTokenInfo": {"status": "Accepted"}}]`);
        this.logOcppMessage('SYSTEM', 'LOG_TX_ENDED');
        
        // Settle wallet
        this.deductUnifiedWallet(this.activeSession.cost);
        
        // Save record
        this.saveTransactionRecord();
        
        // Reset UI
        this.resetChargingUI();
        
        this.showToast('TOAST_SESSION_COMPLETE', 'success');
    }, 1500);
  }

  deductUnifiedWallet(cost: number) {
    this.walletBalance = Math.max(0, this.walletBalance - cost);
    const carbonSavedThisSession = this.activeSession.energyDelivered * 0.72;
    this.co2Saved += carbonSavedThisSession;
  }

  saveTransactionRecord() {
    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    
    const newRecord: SessionRecord = {
      date: formattedDate,
      station: this.activeSession.station.name,
      network: this.activeSession.station.network,
      energy: parseFloat(this.activeSession.energyDelivered.toFixed(2)),
      duration: this.activeSession.duration,
      cost: parseFloat(this.activeSession.cost.toFixed(2)),
      status: "Paid (VoltStream)"
    };
    
    this.sessionHistory.unshift(newRecord);

    const txId = 'TX-' + Math.floor(100000 + Math.random() * 900000);
    this.walletTransactions.unshift({
      id: txId,
      date: formattedDate,
      type: 'payment',
      description: `${this.activeSession.station.name} (${newRecord.energy} kWh in ${newRecord.duration} mins)`,
      amount: newRecord.cost,
      status: 'Success',
      method: newRecord.network
    });

    this.notifyCharts();
  }

  resetChargingUI() {
    this.activeSession = null;
    this.selectedStation = null;
    this.plugged = false;
    this.connected = false;
    this.plugStatus = 'Unplugged';
    this.handshakeSteps = {
      connect: 'disabled',
      tls: 'disabled',
      auth: 'disabled',
      charge: 'disabled'
    };
  }

  logOcppMessage(direction: string, message: string, params?: any) {
    let msg = this.ts ? this.ts.translate(message) : message;
    if (params) {
      Object.keys(params).forEach(k => {
        msg = msg.replace(`{{${k}}}`, params[k]);
      });
    }

    if (!this.isNetworkOnline && direction !== 'SYSTEM') {
      this.offlineQueue.push({ direction, message: msg });
      return;
    }

    const time = new Date().toLocaleTimeString();
    this.ocppLogs.push({ time, direction, message: msg });
    
    setTimeout(() => {
      const el = document.getElementById("ocpp-logs-output");
      if (el) el.scrollTop = el.scrollHeight;
    }, 10);
  }

  sendOcppTelemetryUpdate() {
    if (!this.activeSession) return;
    const msg = `[2, "${this.generateOcppId()}", "TransactionEvent", {"eventType": "Updated", "transactionId": "tx-volt", "timestamp": "${new Date().toISOString()}", "seqNo": 1, "meterValue": [{"timestamp": "${new Date().toISOString()}", "sampledValue": [{"value": "${this.activeSession.energyDelivered.toFixed(2)}", "measurand": "Energy.Active.Import.Register"}, {"value": "${this.vehicleSoc.toFixed(1)}", "measurand": "SoC"}]}]}]`;
    this.logOcppMessage('SEND', msg);
  }

  generateOcppId() {
    return Math.random().toString(36).substring(2, 11).toUpperCase();
  }

  toggleNetworkConnection() {
    this.isNetworkOnline = !this.isNetworkOnline;

    if (this.isNetworkOnline) {
      this.logOcppMessage('SYSTEM', 'LOG_NETWORK_RECOVERED');
      this.flushOfflineQueue();
    } else {
      this.logOcppMessage('SYSTEM', 'LOG_NETWORK_WARNING');
      this.showToast('TOAST_NETWORK_LOST', 'warning');
    }
  }

  flushOfflineQueue() {
    if (this.offlineQueue.length === 0) return;
    
    this.showToast('TOAST_FLUSHING', 'success', { count: this.offlineQueue.length });
    
    const queueToFlush = [...this.offlineQueue];
    this.offlineQueue = [];

    queueToFlush.forEach((item, index) => {
        setTimeout(() => {
            this.logOcppMessage(item.direction, `[RECOVERY-FLUSH] ${item.message}`);
            if (index === queueToFlush.length - 1) {
                this.logOcppMessage('SYSTEM', 'LOG_CACHE_SYNCED');
            }
        }, index * 200);
    });
  }

  simulateHardReset() {
    this.showToast('TOAST_RESET_SENT', 'warning');
    this.logOcppMessage('RECEIVE', `[2, "${this.generateOcppId()}", "Reset", {"type": "Hard"}]`);
    
    setTimeout(() => {
        this.logOcppMessage('SEND', `[3, "msg-reboot", "ResetResponse", {"status": "Accepted"}]`);
        this.logOcppMessage('SYSTEM', 'LOG_RESET_INIT');
        
        if (this.activeSession) {
            clearInterval(this.chargingInterval);
            this.resetChargingUI();
        }
        
        setTimeout(() => {
            this.logOcppMessage('SYSTEM', 'LOG_BOOTING');
            this.logOcppMessage('SEND', `[2, "${this.generateOcppId()}", "BootNotification", {"chargerModel": "VoltStream-DC150", "chargerVendor": "VoltStream Tech"}]`);
            this.logOcppMessage('RECEIVE', `[3, "msg-boot", "BootNotificationResponse", {"status": "Accepted", "currentTime": "${new Date().toISOString()}", "interval": 60}]`);
            this.logOcppMessage('SYSTEM', 'LOG_BOOTED');
            this.showToast('TOAST_RESET_SUCCESS', 'success');
        }, 2000);
    }, 1000);
  }
}
