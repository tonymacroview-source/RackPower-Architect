
import { Device, RackGroup } from '../types';

export const parseCSV = (csvText: string): RackGroup[] => {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  // Simple CSV parser that handles quoted strings
  const parseLine = (text: string) => {
    const result: string[] = [];
    let cell = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') inQuotes = !inQuotes;
      else if (char === ',' && !inQuotes) {
        result.push(cell.trim());
        cell = '';
      } else cell += char;
    }
    result.push(cell.trim());
    return result;
  };

  const headers = parseLine(lines[0]).map(h => h.replace(/^"|"$/g, '').trim());
  const getColIndex = (keywords: string[]) => 
    headers.findIndex(h => keywords.some(k => h.toLowerCase().includes(k.toLowerCase())));

  const idxRoom = getColIndex(['Room']);
  const idxDevice = getColIndex(['Device']);
  const idxRackU = getColIndex(['Rack Size', 'Size (U)']);
  const idxQty = getColIndex(['Total No. of Device']);
  const idxPSCount = getColIndex(['Total No. of PS']);
  const idxMaxPowerPerDevice = getColIndex(['Max Power (Watt)']);
  const idxTypicalPower = getColIndex(['Typical Power']);
  const idxTotalMaxPower = getColIndex(['Total Max Power Consumption']);
  const idxConnType = getColIndex(['Connection Type']);
  const idxPSURating = getColIndex(['PSU Rating']);

  const racksMap = new Map<string, Device[]>();

  for (let i = 1; i < lines.length; i++) {
    const row = parseLine(lines[i]);
    if (row.length < headers.length * 0.5) continue;

    const room = row[idxRoom] || 'Unknown Room';
    const deviceName = row[idxDevice] || 'Unknown Device';
    const qty = parseInt(row[idxQty]) || 1;
    const psCountTotal = parseInt(row[idxPSCount]) || 1;
    const psPerDevice = Math.max(1, Math.floor(psCountTotal / qty));
    
    // U Height parsing
    let uHeight = 1;
    const rawU = parseInt(row[idxRackU]);
    if (!isNaN(rawU) && rawU > 0) {
      uHeight = rawU;
    }

    // Power Calc
    let maxPower = 0;
    const rawMax = parseFloat(row[idxMaxPowerPerDevice]);
    const rawTotal = parseFloat(row[idxTotalMaxPower]);
    const rawRating = parseFloat(row[idxPSURating]);

    if (!isNaN(rawMax) && rawMax > 0) maxPower = rawMax;
    else if (!isNaN(rawTotal) && rawTotal > 0) maxPower = rawTotal / qty;
    else if (!isNaN(rawRating)) maxPower = rawRating * psPerDevice;

    let typicalPower = parseFloat(row[idxTypicalPower]);
    if (isNaN(typicalPower)) typicalPower = maxPower * 0.6; // Default to 60% if missing

    const connectionType = row[idxConnType] || 'C13';

    for (let k = 0; k < qty; k++) {
      const device: Device = {
        id: `${room}-${deviceName}-${i}-${k}`.replace(/\s+/g, '-'),
        name: deviceName,
        room,
        psuCount: psPerDevice,
        typicalPower: typicalPower,
        powerRatingPerDevice: maxPower,
        connectionType: connectionType.replace(/^"|"$/g, ''),
        uHeight: uHeight,
        uPosition: null, // Assigned later
        psuConnections: {}
      };

      if (!racksMap.has(room)) racksMap.set(room, []);
      racksMap.get(room)?.push(device);
    }
  }

  const result: RackGroup[] = [];
  racksMap.forEach((devices, roomId) => {
    // Auto-stack logic: Start from U42 going down (leaving some top space)
    let currentU = 42;
    
    // Assign positions
    const positionedDevices = devices.map(d => {
      if (currentU - d.uHeight + 1 >= 1) {
        const pos = currentU;
        currentU -= d.uHeight;
        
        // Auto-patching logic
        // Try to distribute PSUs evenly
        // PSU 0 -> PDU A, Socket X
        // PSU 1 -> PDU B, Socket X
        // Simple sequential socket assignment for now
        // This is a rough heuristic, the visualizer handles the real indices
        const conns: any = {};
        for(let p=0; p<d.psuCount; p++) {
             // We can't really know the socket index globally here without tracking PDU state
             // So we leave it empty and let the Dashboard component handle initial auto-patching 
             // or just leave unconnected. 
             // Let's leave empty to allow user to drag, or simple default in dashboard.
             conns[p] = null;
        }

        return { ...d, uPosition: pos, psuConnections: conns };
      }
      return { ...d, uPosition: null, psuConnections: {} }; // No space left
    });

    const totalPower = positionedDevices.reduce((sum, d) => sum + d.powerRatingPerDevice, 0);
    result.push({ roomId, devices: positionedDevices, totalPower });
  });

  return result;
};
