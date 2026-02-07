
export interface RawCsvRow {
  Room: string;
  Device: string;
  "Rack Size (U)": string;
  "Total No. of Device": string;
  "Total No. of PS": string;
  "PSU Rating (Watt)": string;
  "Typical Power (Watt)": string;
  "Max Power (Watt)": string;
  "Total Max Power Consumption (Watt)": string;
  "Power Connection Type": string;
}

export interface PSUConnection {
  pduId: string; // Changed from 'A'|'B' to specific ID
  socketIndex: number; // 0-based index on the PDU
}

export interface Device {
  id: string;
  name: string;
  room: string;
  psuCount: number;
  typicalPower: number;
  powerRatingPerDevice: number;
  connectionType: string;
  // Physical attributes
  uHeight: number;
  uPosition: number | null; // Top-most U position (1-48)
  // New granular connection state
  psuConnections: { [psuIndex: number]: PSUConnection | null };
}

export type SocketType = 'UK' | 'C13' | 'C19';

export interface PDUConfig {
  id: string;
  side: 'A' | 'B'; // Visual side
  index: number; // Pair index (0, 1, 2...)
  
  // Primary Group
  socketType: SocketType;
  socketCount: number;
  
  // Secondary Group
  secondarySocketType?: SocketType;
  secondarySocketCount?: number;

  powerCapacity: number;
}

export interface RackGroup {
  roomId: string;
  devices: Device[];
  totalPower: number;
}

export interface PDUPair {
  id: string;
  capacity: number;
  currentLoad: number;
  devices: Device[];
}

export interface OptimizationResult {
  roomId: string;
  pduPairs: PDUPair[];
  unassignedDevices: Device[];
}
