import { Device, RackGroup, OptimizationResult, PDUPair } from '../types';

export const optimizePowerDistribution = (
  racks: RackGroup[],
  pduCapacityVA: number, // Treated as VA (Volts * Amps)
  safetyMargin: number, // Percentage 0-100
  powerFactor: number // 0.0 - 1.0
): OptimizationResult[] => {
  // PDU Capacity is technically in VA (e.g. 32A * 230V = 7360VA).
  // Real Power Limit (Watts) = VA * PF.
  // Then apply Safety Margin.
  const effectiveWattCapacity = pduCapacityVA * powerFactor * (safetyMargin / 100);

  return racks.map(rack => {
    // 1. Sort devices by power (Descending) to handle large items first
    const sortedDevices = [...rack.devices].sort((a, b) => b.powerRatingPerDevice - a.powerRatingPerDevice);
    
    // 2. Determine minimum number of PDUs required (Bin Packing Lower Bound)
    // We pre-allocate this many to encourage spreading load, rather than filling one by one.
    const totalPower = sortedDevices.reduce((sum, d) => sum + d.powerRatingPerDevice, 0);
    const minPDUs = Math.ceil(totalPower / effectiveWattCapacity);
    
    const pduPairs: PDUPair[] = [];

    // Initialize minimum required PDUs
    for (let i = 0; i < Math.max(1, minPDUs); i++) {
       pduPairs.push({
          id: `PDU-Pair-${i + 1}`,
          capacity: effectiveWattCapacity,
          currentLoad: 0,
          devices: []
       });
    }
    
    // 3. Assign devices to PDU pairs using "Least Loaded" strategy (Best Fit for balancing)
    sortedDevices.forEach(device => {
      // Find all PDUs that can fit this device
      const validPDUs = pduPairs.filter(p => p.currentLoad + device.powerRatingPerDevice <= effectiveWattCapacity);

      if (validPDUs.length > 0) {
        // Sort valid PDUs by current load (Ascending) to find the least loaded one
        validPDUs.sort((a, b) => a.currentLoad - b.currentLoad);
        
        // Place in the least loaded PDU
        const selectedPDU = validPDUs[0];
        selectedPDU.devices.push(device);
        selectedPDU.currentLoad += device.powerRatingPerDevice;
      } else {
        // If it doesn't fit in any existing, create a new one
        const newPair: PDUPair = {
          id: `PDU-Pair-${pduPairs.length + 1}`,
          capacity: effectiveWattCapacity, 
          currentLoad: device.powerRatingPerDevice,
          devices: [device]
        };
        pduPairs.push(newPair);
      }
    });

    // Filter out any pre-allocated PDUs that ended up empty (edge case, though unlikely with the algo)
    const activePairs = pduPairs.filter(p => p.devices.length > 0);

    return {
      roomId: rack.roomId,
      pduPairs: activePairs,
      unassignedDevices: []
    };
  });
};