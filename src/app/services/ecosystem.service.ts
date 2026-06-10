import { Injectable } from '@angular/core';

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

  // Mock Stations Data
  stationsData: ChargingStation[] = [
    { id: 1, name: "IOCL Petrol Pump - Tata Power Fast-Charger", network: "Tata Power", lat: 18.5252, lng: 73.8540, speed: "DC 150kW", connector: "CCS2", price: 18.00, status: "Available", guns: [{ id: 'A', type: 'CCS2', status: 'Available' }, { id: 'B', type: 'CCS2', status: 'Occupied' }] },
    { id: 2, name: "HPCL Fuel Oasis - Zeon Fast-Charge Zone", network: "Zeon", lat: 18.5140, lng: 73.8420, speed: "DC 50kW", connector: "CCS2", price: 16.50, status: "Available", guns: [{ id: 'A', type: 'CCS2', status: 'Available' }] },
    { id: 3, name: "BPCL Highway Stop - ChargeZone Hub", network: "ChargeZone", lat: 18.5300, lng: 73.8750, speed: "DC 120kW", connector: "CCS2", price: 17.50, status: "Occupied", guns: [{ id: 'A', type: 'CCS2', status: 'Occupied' }, { id: 'B', type: 'CCS2', status: 'Occupied' }] },
    { id: 4, name: "Jio-bp Pulse Petrol Pump EV Hub", network: "Tata Power", lat: 18.5020, lng: 73.8180, speed: "DC 150kW", connector: "CCS2", price: 19.50, status: "Available", guns: [{ id: 'A', type: 'CCS2', status: 'Available' }, { id: 'B', type: 'CCS2', status: 'Available' }] },
    { id: 5, name: "Bolt Smart AC Charger S2", network: "Bolt", lat: 18.5410, lng: 73.8310, speed: "AC 7.4kW", connector: "Type 2", price: 12.00, status: "Available", guns: [{ id: 'A', type: 'Type 2', status: 'Available' }] },
    { id: 6, name: "Zeon TechPark Charger B4", network: "Zeon", lat: 18.5580, lng: 73.8990, speed: "DC 60kW", connector: "CCS2", price: 17.00, status: "Occupied", guns: [{ id: 'A', type: 'CCS2', status: 'Occupied' }] },
    { id: 7, name: "Bolt Residency AC Point S8", network: "Bolt", lat: 18.5204, lng: 73.8660, speed: "AC 22kW", connector: "Type 2", price: 11.50, status: "Available", guns: [{ id: 'A', type: 'Type 2', status: 'Available' }] }
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

  ocppLogs: LogLine[] = [
    { time: new Date().toLocaleTimeString(), direction: 'SYSTEM', message: 'Terminal initialized. Waiting for connection...' }
  ];

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
  showToast(message: string, type = 'info') {
    const id = this.toastCounter++;
    this.toasts.push({ id, message, type });
    setTimeout(() => {
      this.toasts = this.toasts.filter(t => t.id !== id);
    }, 4500);
  }

  selectStation(stationId: number) {
    const station = this.stationsData.find(s => s.id === stationId);
    if (station) {
      this.selectedStation = station;
      this.activeTab = 'dashboard';
      this.showToast(`Selected station: ${station.name}. Pre-authorization initiated via ISO 15118.`, 'info');
    }
  }

  clearLogs() {
    this.ocppLogs = [
      { time: new Date().toLocaleTimeString(), direction: 'SYSTEM', message: 'Terminal cleared by operator.' }
    ];
  }

  toggleRole() {
    this.currentRole = this.currentRole === 'driver' ? 'operator' : 'driver';
    this.showToast(`Switched perspective to: ${this.currentRole === 'driver' ? 'Driver Companion' : 'Grid Operations Console'}`, 'success');
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
    this.showToast(`Theme switched to ${this.currentTheme.toUpperCase()} mode.`, 'info');
    this.notifyThemeChange();
  }

  toggleGridOverload() {
    this.isGridOverloaded = !this.isGridOverloaded;
    this.gridLoad = this.isGridOverloaded ? 92 : 72;
    
    if (this.isGridOverloaded) {
      this.logOcppMessage('RECEIVE', `[2, "${this.generateOcppId()}", "SetChargingProfile", {"chargingProfile": {"profileId": 101, "stackLevel": 1, "chargingProfilePurpose": "TxProfile", "chargingProfileKind": "Absolute", "chargingSchedule": {"duration": 1800, "chargingRateUnit": "W", "chargingSchedulePeriod": [{"startPeriod": 0, "limit": 70000}]}}}]`);
      this.logOcppMessage('SYSTEM', "Smart Grid Command: Local charging output throttled to 70kW due to substation load-shedding.");
      this.showToast("Grid capacity warning! Substation load-shedding activated.", "warning");
      if (this.activeSession) {
        this.activeSession.kwRate = Math.min(this.activeSession.kwRate, 70);
      }
    } else {
      this.logOcppMessage('SYSTEM', "Smart Grid Recovery: Grid load normalized. Restoring maximum port capacity.");
      this.showToast("Grid load normalized. Charging limits restored.", "success");
    }
  }

  generateLocalStations(lat: number, lng: number) {
    this.stationsData = [
      { id: 11, name: "IOCL Petrol Pump - Tata Power Fast-Charger", network: "Tata Power", lat: lat + 0.0035, lng: lng + 0.0041, speed: "DC 150kW", connector: "CCS2", price: 18.50, status: "Available", guns: [{ id: 'A', type: 'CCS2', status: 'Available' }, { id: 'B', type: 'CCS2', status: 'Occupied' }] },
      { id: 12, name: "BPCL Highway Oasis - Zeon Charger Zone", network: "Zeon", lat: lat - 0.0042, lng: lng + 0.0053, speed: "DC 120kW", connector: "CCS2", price: 17.00, status: "Available", guns: [{ id: 'A', type: 'CCS2', status: 'Available' }, { id: 'B', type: 'CCS2', status: 'Available' }] },
      { id: 13, name: "HPCL Fuel Point - ChargeZone EV Hub", network: "ChargeZone", lat: lat + 0.0063, lng: lng - 0.0032, speed: "DC 60kW", connector: "CCS2", price: 16.50, status: "Occupied", guns: [{ id: 'A', type: 'CCS2', status: 'Occupied' }] },
      { id: 14, name: "Jio-bp Pulse Petrol Pump Charging Point", network: "Tata Power", lat: lat - 0.0024, lng: lng - 0.0051, speed: "DC 120kW", connector: "CCS2", price: 18.00, status: "Available", guns: [{ id: 'A', type: 'CCS2', status: 'Available' }, { id: 'B', type: 'CCS2', status: 'Occupied' }] },
      { id: 15, name: "Shell Retail Fuel Station - Bolt AC Point", network: "Bolt", lat: lat + 0.0012, lng: lng - 0.0019, speed: "AC 7.4kW", connector: "Type 2", price: 12.00, status: "Available", guns: [{ id: 'A', type: 'Type 2', status: 'Available' }] },
      { id: 16, name: "Highway Fuel Stop Petrol Pump - Zeon DC03", network: "Zeon", lat: lat + 0.0085, lng: lng + 0.0091, speed: "DC 50kW", connector: "CCS2", price: 17.50, status: "Available", guns: [{ id: 'A', type: 'CCS2', status: 'Available' }] }
    ];
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
      this.logOcppMessage('SYSTEM', `Physical cable connection detected. Connector type: ${this.selectedStation?.connector}. Locking connector...`);
      this.showToast("Connector plugged in successfully.", 'success');
    }, 1000);

    setTimeout(() => {
      this.handshakeSteps.tls = 'active';
      this.logOcppMessage('SEND', `[2, "${this.generateOcppId()}", "SignCertificate", {"keyType": "ECDSA", "publicKey": "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE7v... "}]`);
      
      setTimeout(() => {
        this.handshakeSteps.tls = 'completed';
        this.logOcppMessage('RECEIVE', `[3, "msg-auth-cert", "SignCertificateResponse", {"status": "Accepted"}]`);
        this.logOcppMessage('SYSTEM', `Secure TLS channel established. Contract Certificate Valid.`);
      }, 1200);
    }, 2500);

    setTimeout(() => {
      this.handshakeSteps.auth = 'active';
      this.logOcppMessage('SEND', `[2, "${this.generateOcppId()}", "Authorize", {"idToken": {"idToken": "IN-VOLT-MAHINDRA-983D", "type": "EMAID"}}]`);
      
      setTimeout(() => {
        if (this.walletBalance < 100) {
          this.handshakeSteps.auth = 'error';
          this.logOcppMessage('RECEIVE', `[3, "msg-auth-id", "AuthorizeResponse", {"idTokenInfo": {"status": "Blocked", "reason": "Insufficient Wallet Funds"}}]`);
          this.showToast("Unified Wallet balance too low to authorize transaction.", 'danger');
          this.resetChargingUI();
          return;
        }
        
        this.handshakeSteps.auth = 'completed';
        this.logOcppMessage('RECEIVE', `[3, "msg-auth-id", "AuthorizeResponse", {"idTokenInfo": {"status": "Accepted", "groupIdToken": "VoltStreamUnifiedPay"}}]`);
        this.logOcppMessage('SYSTEM', `Contract Verified. ISO 15118 authentication successful. Payment pre-authorized.`);
      }, 1500);
    }, 4500);

    setTimeout(() => {
      if (this.walletBalance < 100) return;
      
      this.handshakeSteps.charge = 'active';
      this.logOcppMessage('SEND', `[2, "${this.generateOcppId()}", "TransactionEvent", {"eventType": "Started", "transactionId": "tx-volt-${Date.now()}", "timestamp": "${new Date().toISOString()}", "triggerReason": "CablePluggedIn", "seqNo": 0, "evse": {"id": 1, "connectorId": 1}}]`);
      
      setTimeout(() => {
        this.handshakeSteps.charge = 'completed';
        this.logOcppMessage('RECEIVE', `[3, "msg-tx-start", "TransactionEventResponse", {"totalCost": 0.0}]`);
        this.logOcppMessage('SYSTEM', `OCPP Energy Transaction started. Relays closed. Energizing...`);
        
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

    this.showToast(`Charging started at ${speedkW} kW.`, 'success');

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
    this.showToast("Stopping charging transaction...", 'warning');

    this.logOcppMessage('SEND', `[2, "${this.generateOcppId()}", "TransactionEvent", {"eventType": "Ended", "transactionId": "tx-volt-${Date.now()}", "timestamp": "${new Date().toISOString()}", "triggerReason": "StopAuthorize", "seqNo": 1, "meterValue": [{"timestamp": "${new Date().toISOString()}", "sampledValue": [{"value": "${this.activeSession.energyDelivered.toFixed(2)}"}]}]}]`);
    
    setTimeout(() => {
        this.logOcppMessage('RECEIVE', `[3, "msg-tx-stop", "TransactionEventResponse", {"totalCost": ${this.activeSession.cost.toFixed(2)}, "idTokenInfo": {"status": "Accepted"}}]`);
        this.logOcppMessage('SYSTEM', `Relays open. Charger de-energized. Please unplug the connector.`);
        
        // Settle wallet
        this.deductUnifiedWallet(this.activeSession.cost);
        
        // Save record
        this.saveTransactionRecord();
        
        // Reset UI
        this.resetChargingUI();
        
        this.showToast("Charging session complete. Transaction settled.", 'success');
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

  logOcppMessage(direction: string, message: string) {
    if (!this.isNetworkOnline && direction !== 'SYSTEM') {
      this.offlineQueue.push({ direction, message });
      return;
    }

    const time = new Date().toLocaleTimeString();
    this.ocppLogs.push({ time, direction, message });
    
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
      this.logOcppMessage('SYSTEM', "Network link recovered. Synchronizing cached telemetry with Central Management System...");
      this.flushOfflineQueue();
    } else {
      this.logOcppMessage('SYSTEM', "WARNING: Web-Socket link disconnected. Local transaction recovery buffer initiated.");
      this.showToast("Network connection lost. Offline buffer enabled.", 'warning');
    }
  }

  flushOfflineQueue() {
    if (this.offlineQueue.length === 0) return;
    
    this.showToast(`Flushing ${this.offlineQueue.length} cached transaction messages.`, 'success');
    
    const queueToFlush = [...this.offlineQueue];
    this.offlineQueue = [];

    queueToFlush.forEach((item, index) => {
        setTimeout(() => {
            this.logOcppMessage(item.direction, `[RECOVERY-FLUSH] ${item.message}`);
            if (index === queueToFlush.length - 1) {
                this.logOcppMessage('SYSTEM', "Offline cache synchronization complete. Network status fully aligned.");
            }
        }, index * 200);
    });
  }

  simulateHardReset() {
    this.showToast("Sending remote OCPP Hard Reset command...", 'warning');
    this.logOcppMessage('RECEIVE', `[2, "${this.generateOcppId()}", "Reset", {"type": "Hard"}]`);
    
    setTimeout(() => {
        this.logOcppMessage('SEND', `[3, "msg-reboot", "ResetResponse", {"status": "Accepted"}]`);
        this.logOcppMessage('SYSTEM', "Initiating Charger Hard Reset. Halting transactions...");
        
        if (this.activeSession) {
            clearInterval(this.chargingInterval);
            this.resetChargingUI();
        }
        
        setTimeout(() => {
            this.logOcppMessage('SYSTEM', "Charger booting up...");
            this.logOcppMessage('SEND', `[2, "${this.generateOcppId()}", "BootNotification", {"chargerModel": "VoltStream-DC150", "chargerVendor": "VoltStream Tech"}]`);
            this.logOcppMessage('RECEIVE', `[3, "msg-boot", "BootNotificationResponse", {"status": "Accepted", "currentTime": "${new Date().toISOString()}", "interval": 60}]`);
            this.logOcppMessage('SYSTEM', "Charger fully booted. Status: Available.");
            this.showToast("Charger successfully rebooted and online.", 'success');
        }, 2000);
    }, 1000);
  }
}
