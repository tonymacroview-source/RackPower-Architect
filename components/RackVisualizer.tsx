
import React, { useState } from 'react';
import { Device, PSUConnection, PDUConfig, SocketType } from '../types';
import { Plug, Zap } from 'lucide-react';

interface Props {
  devices: Device[];
  onMoveDevice: (deviceId: string, targetU: number) => void;
  onUpdateConnection: (deviceId: string, psuIndex: number, pduId: string | null, socketIndex: number|null) => void;
  pdus: PDUConfig[];
  pduLoads: Record<string, { typical: number, max: number }>;
  powerFactor: number;
  safetyMargin: number;
  pduPhysicalHeight: number; // in cm
  pduPhysicalWidth: number; // in cm
  pduCordLength: number; // in m
}

const U_HEIGHT_PX = 30; // Reduced from 45
const RACK_U_COUNT = 48;
const RACK_HEADER_HEIGHT = 16;
const RACK_HEIGHT_PX = (RACK_U_COUNT * U_HEIGHT_PX) + (RACK_HEADER_HEIGHT * 2);

// Layout Constants (Pixels)
const TABLE_WIDTH = 300; // New summary table on the left
const PDU_COL_WIDTH = 80; 
const PDU_WIDTH = 60; 
const RACK_WIDTH = 420;
const WIRE_GAP = 120;
const PDU_VERTICAL_GAP = 20;

const PDU_HEADER_H = 40;
const PDU_FOOTER_H = 40;
const SOCKET_H = 14; 
const SOCKET_GAP = 4;
const SOCKET_PADDING = 8;

// Updated Styles for White Background (Paper Mode)
const THEME = {
  bg: 'bg-white',
  text: 'text-slate-900',
  textDim: 'text-slate-500',
  border: 'border-slate-300',
  rackBg: 'bg-slate-100',
  rackBorder: 'border-slate-400',
  deviceBg: 'bg-white',
  deviceBorder: 'border-slate-300',
  deviceHover: 'hover:bg-blue-50',
  rail: 'bg-slate-300'
};

const SocketIcon = ({ type, used, label, hovered }: { type: SocketType, used: boolean, label: string, hovered: boolean }) => {
    const baseClass = `relative border rounded flex flex-col items-center justify-center shadow-sm transition-colors duration-200 
      ${used ? 'border-emerald-500 bg-emerald-100' : (hovered ? 'border-blue-400 bg-blue-50' : 'border-slate-400 bg-slate-50')}
    `;

    const style = { height: `${SOCKET_H}px`, width: '28px' };

    // Common styling for pins
    const pinClass = (isUsed: boolean) => isUsed ? 'bg-emerald-500' : 'bg-slate-400';

    if (type === 'UK') {
        return (
            <div className={baseClass} style={style}>
                <div className="flex gap-[2px] items-center">
                    <div className={`w-[2px] h-[3px] ${pinClass(used)} rounded-sm`}></div>
                    <div className={`w-[2px] h-[3px] ${pinClass(used)} rounded-sm`}></div>
                    <div className={`w-[2px] h-[3px] ${pinClass(used)} rounded-sm`}></div>
                </div>
                <span className="absolute -left-8 text-[8px] text-slate-500 w-6 text-right font-mono">{label}</span>
            </div>
        );
    }
    if (type === 'C13') {
         return (
            <div className={baseClass} style={style}>
                 <div className="flex gap-[2px]">
                    <div className={`w-[2px] h-[2px] ${pinClass(used)} rounded-full`}></div>
                    <div className={`w-[2px] h-[2px] ${pinClass(used)} rounded-full`}></div>
                    <div className={`w-[2px] h-[2px] ${pinClass(used)} rounded-full`}></div>
                </div>
                <span className="absolute -left-8 text-[8px] text-slate-500 w-6 text-right font-mono">{label}</span>
            </div>
         );
    }
    // C19
    return (
        <div className={baseClass} style={style}>
             <div className="flex gap-[2px]">
                <div className={`w-[2px] h-[3px] ${pinClass(used)}`}></div>
                <div className={`w-[2px] h-[3px] ${pinClass(used)}`}></div>
             </div>
             <span className="absolute -left-8 text-[8px] text-slate-500 w-6 text-right font-mono">{label}</span>
        </div>
    );
};

const RackVisualizer: React.FC<Props> = ({ 
  devices, 
  onMoveDevice, 
  onUpdateConnection,
  pdus,
  pduLoads,
  powerFactor,
  safetyMargin,
  pduPhysicalHeight,
  pduPhysicalWidth,
  pduCordLength
}) => {
  const [draggedDevice, setDraggedDevice] = useState<string | null>(null);
  const [draggedCable, setDraggedCable] = useState<{deviceId: string, psuIndex: number} | null>(null);
  const [hoveredSocket, setHoveredSocket] = useState<{pduId: string, index: number} | null>(null);

  const pdusA = pdus.filter(p => p.side === 'A');
  const pdusB = pdus.filter(p => p.side === 'B');

  // --- Layout Calculations ---
  
  // Shift everything by TABLE_WIDTH
  const rackLeftX = TABLE_WIDTH + PDU_COL_WIDTH + WIRE_GAP;
  const rackRightX = rackLeftX + RACK_WIDTH;
  const totalWidth = rackRightX + WIRE_GAP + PDU_COL_WIDTH;

  const getPDUHeight = (socketCount: number) => {
      const contentH = (socketCount * SOCKET_H) + ((socketCount - 1) * SOCKET_GAP);
      return PDU_HEADER_H + SOCKET_PADDING + contentH + SOCKET_PADDING + PDU_FOOTER_H;
  };

  const getGroupStartY = (groupPdus: PDUConfig[]) => {
      if (groupPdus.length === 0) return 0;
      const totalH = groupPdus.reduce((sum, p) => sum + getPDUHeight(p.socketCount + (p.secondarySocketCount || 0)), 0) + ((groupPdus.length - 1) * PDU_VERTICAL_GAP);
      return Math.max(0, (RACK_HEIGHT_PX - totalH) / 2);
  };

  const startYA = getGroupStartY(pdusA);
  const startYB = getGroupStartY(pdusB);

  const getPDURect = (pdu: PDUConfig) => {
      const isA = pdu.side === 'A';
      const group = isA ? pdusA : pdusB;
      const indexInGroup = group.findIndex(p => p.id === pdu.id);
      
      let y = isA ? startYA : startYB;
      for (let i = 0; i < indexInGroup; i++) {
          const totalSockets = group[i].socketCount + (group[i].secondarySocketCount || 0);
          y += getPDUHeight(totalSockets) + PDU_VERTICAL_GAP;
      }

      const totalSockets = pdu.socketCount + (pdu.secondarySocketCount || 0);

      // X calculation includes TABLE_WIDTH shift
      const x = isA 
        ? TABLE_WIDTH + (PDU_COL_WIDTH - PDU_WIDTH) / 2
        : rackRightX + WIRE_GAP + ((PDU_COL_WIDTH - PDU_WIDTH) / 2);

      return { x, y, width: PDU_WIDTH, height: getPDUHeight(totalSockets) };
  };

  // --- Drag & Drop (Unchanged logic) ---
  const handleDeviceDragStart = (e: React.DragEvent, device: Device) => {
    e.dataTransfer.setData('type', 'device');
    e.dataTransfer.setData('deviceId', device.id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedDevice(device.id);
  };

  const handleRackDragOver = (e: React.DragEvent) => {
    e.preventDefault(); 
    e.dataTransfer.dropEffect = 'move';
  };

  const handleRackDrop = (e: React.DragEvent, targetU: number) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('type');
    if (type !== 'device') return;
    const deviceId = e.dataTransfer.getData('deviceId');
    onMoveDevice(deviceId, targetU);
    setDraggedDevice(null);
  };

  const handleCableDragStart = (e: React.DragEvent, deviceId: string, psuIndex: number) => {
    e.stopPropagation(); 
    e.dataTransfer.setData('type', 'cable');
    e.dataTransfer.setData('deviceId', deviceId);
    e.dataTransfer.setData('psuIndex', psuIndex.toString());
    e.dataTransfer.effectAllowed = 'link';
    setDraggedCable({ deviceId, psuIndex });
  };

  const handleSocketDrop = (e: React.DragEvent, pduId: string, socketIndex: number, isOccupied: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setHoveredSocket(null);
    if (isOccupied) return;

    const type = e.dataTransfer.getData('type');
    if (type === 'cable') {
        const deviceId = e.dataTransfer.getData('deviceId');
        const psuIndex = parseInt(e.dataTransfer.getData('psuIndex'));
        onUpdateConnection(deviceId, psuIndex, pduId, socketIndex);
    }
    setDraggedCable(null);
  };

  const handleSocketDragOver = (e: React.DragEvent, pduId: string, index: number, isOccupied: boolean) => {
    e.preventDefault();
    if (isOccupied) {
        e.dataTransfer.dropEffect = 'none';
    } else {
        e.dataTransfer.dropEffect = 'link';
        setHoveredSocket({ pduId, index });
    }
  };

  // --- Rendering ---

  const occupationMap = new Map<number, Device>();
  devices.forEach(d => {
    if (d.uPosition) {
      for (let i = 0; i < d.uHeight; i++) {
        occupationMap.set(d.uPosition - i, d);
      }
    }
  });

  const renderSummaryTable = () => {
    const totalMax = devices.reduce((s, d) => s + d.powerRatingPerDevice, 0);
    const totalTyp = devices.reduce((s, d) => s + d.typicalPower, 0);
    
    // Group loads by Pair Index
    const pairLoads: Record<number, { a: number, b: number }> = {};
    pdus.forEach(p => {
        if (!pairLoads[p.index]) pairLoads[p.index] = { a: 0, b: 0 };
        const load = pduLoads[p.id].max;
        if (p.side === 'A') pairLoads[p.index].a = load;
        else pairLoads[p.index].b = load;
    });

    const primaryPDU = pdus[0];

    return (
        <div 
            className="absolute top-0 left-0 h-full border-r border-slate-300 bg-slate-50 p-6 flex flex-col text-slate-900"
            style={{ width: TABLE_WIDTH }}
        >
            <h2 className="text-xl font-bold text-slate-800 mb-6 border-b border-slate-300 pb-2">Rack Summary</h2>
            
            <div className="space-y-6">
                
                {/* PDU Specifications */}
                <div>
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">PDU Specs</h3>
                    <table className="w-full text-xs text-left bg-white border border-slate-200 rounded overflow-hidden">
                        <tbody className="divide-y divide-slate-100">
                            <tr>
                                <td className="p-2 font-semibold text-slate-600">Physical Height</td>
                                <td className="p-2 font-mono text-slate-800">{pduPhysicalHeight} cm</td>
                            </tr>
                            <tr>
                                <td className="p-2 font-semibold text-slate-600">Physical Width</td>
                                <td className="p-2 font-mono text-slate-800">{pduPhysicalWidth} cm</td>
                            </tr>
                            <tr>
                                <td className="p-2 font-semibold text-slate-600">Cord Length</td>
                                <td className="p-2 font-mono text-slate-800">{pduCordLength} m</td>
                            </tr>
                            <tr>
                                <td className="p-2 font-semibold text-slate-600">Max Capacity</td>
                                <td className="p-2 font-mono text-slate-800">{primaryPDU ? primaryPDU.powerCapacity : 0} W</td>
                            </tr>
                            <tr>
                                <td className="p-2 font-semibold text-slate-600">Outlets</td>
                                <td className="p-2 font-mono text-slate-800">
                                    {primaryPDU ? (
                                        <>
                                            {primaryPDU.socketCount}x{primaryPDU.socketType}
                                            {primaryPDU.secondarySocketCount ? ` + ${primaryPDU.secondarySocketCount}x${primaryPDU.secondarySocketType}` : ''}
                                        </>
                                    ) : '-'}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div>
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Total Consumption</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-3 rounded border border-slate-200">
                            <div className="text-xs text-slate-500">Max Load</div>
                            <div className="text-lg font-mono font-bold text-slate-800">{Math.round(totalMax)}W</div>
                        </div>
                        <div className="bg-white p-3 rounded border border-slate-200">
                            <div className="text-xs text-slate-500">Typical</div>
                            <div className="text-lg font-mono font-bold text-emerald-600">{Math.round(totalTyp)}W</div>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Device Count</h3>
                    <div className="bg-white p-3 rounded border border-slate-200">
                         <div className="text-3xl font-bold text-slate-800">{devices.length}</div>
                         <div className="text-xs text-slate-500">Rack Mounted Assets</div>
                    </div>
                </div>

                <div>
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">PDU Load Balance</h3>
                    <table className="w-full text-xs text-left bg-white border border-slate-200 rounded overflow-hidden">
                        <thead className="bg-slate-100 text-slate-600">
                            <tr>
                                <th className="p-2 border-b">Pair</th>
                                <th className="p-2 border-b">Feed A</th>
                                <th className="p-2 border-b">Feed B</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {Object.entries(pairLoads).map(([idx, loads]) => {
                                const capacity = pdus.find(p => p.index === parseInt(idx))?.powerCapacity || 1;
                                const safeCap = capacity * powerFactor * (safetyMargin/100);
                                const isOverA = loads.a > safeCap;
                                const isOverB = loads.b > safeCap;

                                return (
                                    <tr key={idx}>
                                        <td className="p-2 font-mono text-slate-700">#{parseInt(idx)+1}</td>
                                        <td className={`p-2 font-mono ${isOverA ? 'text-red-600 font-bold' : 'text-slate-700'}`}>{Math.round(loads.a)}W</td>
                                        <td className={`p-2 font-mono ${isOverB ? 'text-red-600 font-bold' : 'text-slate-700'}`}>{Math.round(loads.b)}W</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="mt-auto pt-8 text-xs text-slate-400">
                    <p>Generated by PDU Planner</p>
                    <p>{new Date().toLocaleDateString()}</p>
                </div>
            </div>
        </div>
    );
  };

  const renderRack = () => {
    const slots = [];
    for (let u = RACK_U_COUNT; u >= 1; u--) {
      const device = occupationMap.get(u);
      
      if (device && device.uPosition === u) {
        const heightPx = device.uHeight * U_HEIGHT_PX;
        const isDragging = draggedDevice === device.id;
        
        slots.push(
          <div 
            key={`u-${u}`} 
            draggable
            onDragStart={(e) => handleDeviceDragStart(e, device)}
            className={`w-full relative border-b ${THEME.deviceBorder} ${THEME.deviceBg} ${THEME.deviceHover} transition-colors group flex items-center px-2 box-border cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-50 dashed border-2 border-blue-500' : ''}`}
            style={{ height: `${heightPx}px` }}
          >
            {/* Rails */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${THEME.rail}`}></div>
            <div className={`absolute right-0 top-0 bottom-0 w-1 ${THEME.rail}`}></div>
            
            {/* Device Info */}
            <div className="flex-1 flex items-center gap-2 overflow-hidden pointer-events-none z-10 mr-2 min-w-0 h-full">
                <span className={`${THEME.textDim} font-mono text-[10px] w-5 shrink-0 text-right`}>{u}</span>
                
                {/* Single Row Layout */}
                <div className="flex items-center justify-between w-full overflow-hidden h-full pr-1">
                    {/* Device Name */}
                    <div className="flex items-center h-full min-w-0 overflow-hidden flex-1">
                        <span className={`text-xs ${THEME.text} font-bold truncate leading-tight`} title={device.name}>
                            {device.name}
                        </span>
                    </div>
                    
                    {/* Power Ratings & U Height - Aligned Right */}
                    <div className="flex gap-2 text-[10px] items-center shrink-0 ml-2 h-full">
                        <span className="text-blue-600 whitespace-nowrap leading-tight" title="Typical Power">
                            T:{Math.round(device.typicalPower)}
                        </span>
                        <span className="text-red-600 whitespace-nowrap leading-tight" title="Max Power">
                            M:{Math.round(device.powerRatingPerDevice)}
                        </span>
                        <span className="border border-slate-300 px-1 rounded whitespace-nowrap text-[9px] h-5 flex items-center justify-center text-slate-500 bg-slate-100 min-w-[20px] leading-tight">
                            {device.uHeight}U
                        </span>
                    </div>
                </div>
            </div>

            {/* PSU Ports */}
            <div className="flex items-center gap-1 z-20 shrink-0">
                {Array.from({length: device.psuCount}).map((_, idx) => {
                    const isConnected = !!device.psuConnections[idx];
                    return (
                        <div 
                            key={`psu-${idx}`}
                            draggable
                            onDragStart={(e) => handleCableDragStart(e, device.id, idx)}
                            className={`w-5 h-5 rounded flex items-center justify-center cursor-pointer hover:scale-110 transition-transform ${isConnected ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-500'}`}
                            title={`PSU #${idx+1} - Drag to PDU`}
                        >
                            <Plug size={10} />
                        </div>
                    );
                })}
            </div>
          </div>
        );
        u = u - device.uHeight + 1;
      } 
      else if (!device) {
        slots.push(
          <div 
            key={`u-${u}`} 
            onDragOver={handleRackDragOver}
            onDrop={(e) => handleRackDrop(e, u)}
            className="w-full border-b border-slate-200 flex items-center px-2 hover:bg-blue-50 transition-colors"
            style={{ height: `${U_HEIGHT_PX}px` }}
          >
            <span className="text-slate-400 font-mono text-[10px] w-6 select-none">{u}</span>
            <div className="w-full h-full flex items-center justify-center opacity-0 hover:opacity-100">
                 <div className="w-full h-px border-t border-dashed border-slate-300"></div>
            </div>
          </div>
        );
      }
    }
    return slots;
  };

  const renderSocket = (pdu: PDUConfig, index: number) => {
      // Find occupancy and details for dragging
      let connectedDevice: Device | undefined;
      let connectedPsuIndex: number = -1;

      for (const d of devices) {
        Object.entries(d.psuConnections).forEach(([key, val]) => {
            const conn = val as PSUConnection | null;
            if (conn && conn.pduId === pdu.id && conn.socketIndex === index) {
                connectedDevice = d;
                connectedPsuIndex = parseInt(key);
            }
        });
        if (connectedDevice) break;
      }
      
      const isOccupied = !!connectedDevice;
      const isHovered = hoveredSocket?.pduId === pdu.id && hoveredSocket?.index === index;
      
      // Determine Type based on index
      // 0 to socketCount-1 = Primary
      // socketCount to Total-1 = Secondary
      const isSecondary = index >= pdu.socketCount;
      const currentType = isSecondary ? (pdu.secondarySocketType || 'C19') : pdu.socketType;

      return (
        <div 
            key={`${pdu.id}-${index}`}
            draggable={isOccupied}
            onDragStart={(e) => {
                if (isOccupied && connectedDevice) {
                    handleCableDragStart(e, connectedDevice.id, connectedPsuIndex);
                }
            }}
            onDragOver={(e) => handleSocketDragOver(e, pdu.id, index, isOccupied)}
            onDragLeave={() => setHoveredSocket(null)}
            onDrop={(e) => handleSocketDrop(e, pdu.id, index, isOccupied)}
            className={`flex items-center flex-shrink-0 ${isOccupied ? 'cursor-grab active:cursor-grabbing' : ''}`}
            style={{ marginBottom: `${SOCKET_GAP}px` }}
        >
           <SocketIcon type={currentType} used={isOccupied} label={`${index+1}`} hovered={isHovered} />
        </div>
      );
  };

  const renderCables = () => {
    const lines = [];
    const sortedDevices = [...devices].filter(d => d.uPosition).sort((a, b) => (b.uPosition || 0) - (a.uPosition || 0));

    sortedDevices.forEach(d => {
        if (!d.uPosition) return;

        const uTopY = (RACK_U_COUNT - d.uPosition) * U_HEIGHT_PX;
        const deviceCenterY = RACK_HEADER_HEIGHT + uTopY + (d.uHeight * U_HEIGHT_PX / 2);

        Object.entries(d.psuConnections).forEach(([psuIdxStr, c]) => {
            const conn = c as PSUConnection | null;
            if (!conn) return;

            const pdu = pdus.find(p => p.id === conn.pduId);
            if (!pdu) return;

            const pduRect = getPDURect(pdu);
            const socketRelativeY = PDU_HEADER_H + SOCKET_PADDING + (conn.socketIndex * (SOCKET_H + SOCKET_GAP)) + (SOCKET_H / 2);
            const socketY = pduRect.y + socketRelativeY;
            const pduCenterX = pduRect.x + (pduRect.width / 2);
            const deviceX = pdu.side === 'A' ? rackLeftX : rackRightX;

            const dist = Math.abs(deviceX - pduCenterX);
            const cp1X = deviceX + (pdu.side === 'A' ? -dist * 0.5 : dist * 0.5);
            const cp2X = pduCenterX; 

            const color = pdu.side === 'A' ? '#3b82f6' : '#ef4444';

            lines.push(
                <path 
                   key={`cable-${d.id}-${psuIdxStr}`}
                   d={`M ${deviceX} ${deviceCenterY} C ${cp1X} ${deviceCenterY}, ${cp2X} ${socketY}, ${pduCenterX} ${socketY}`}
                   fill="none"
                   stroke={color}
                   strokeWidth="2"
                   strokeOpacity="0.8"
                   className="hover:stroke-[3px] hover:stroke-opacity-100 transition-all pointer-events-auto"
                   onClick={() => onUpdateConnection(d.id, parseInt(psuIdxStr), null, null)}
                />
            );
            
            lines.push(<circle key={`d1-${d.id}-${psuIdxStr}`} cx={deviceX} cy={deviceCenterY} r="3" fill={color} />);
            lines.push(<circle key={`d2-${d.id}-${psuIdxStr}`} cx={pduCenterX} cy={socketY} r="3" fill={color} />);
        });
    });

    return (
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-50" width={totalWidth} height={RACK_HEIGHT_PX + 200}>
            {lines}
        </svg>
    );
  };

  return (
    <div 
        className={`relative ${THEME.bg} ${THEME.text} rounded-xl border ${THEME.border} select-none my-8 overflow-hidden`}
        style={{ width: totalWidth, height: RACK_HEIGHT_PX + 200 }} 
    >
      
      {/* Summary Table on Left */}
      {renderSummaryTable()}

      {/* Render PDUs */}
      {pdus.map(pdu => {
          const rect = getPDURect(pdu);
          const load = pduLoads[pdu.id];
          const effectiveCap = pdu.powerCapacity * powerFactor * (safetyMargin / 100);
          const isOverloaded = load.max > effectiveCap;
          const pct = Math.min(100, (load.max / effectiveCap) * 100);

          const totalSockets = pdu.socketCount + (pdu.secondarySocketCount || 0);

          return (
            <React.Fragment key={pdu.id}>
                {/* Ruler removed as requested */}
                <div 
                    className="absolute flex flex-col z-10"
                    style={{ 
                        left: rect.x, 
                        top: rect.y,
                        width: rect.width, 
                        height: rect.height
                    }}
                >
                    <div className={`w-full flex flex-col items-center bg-white border ${isOverloaded ? 'border-red-500' : 'border-slate-300'} rounded-lg h-full shadow-sm`}>
                        {/* Header */}
                        <div 
                            className={`shrink-0 w-full flex flex-col items-center justify-center text-[10px] font-bold ${pdu.side === 'A' ? 'text-blue-600' : 'text-red-600'} border-b border-slate-200`}
                            style={{ height: PDU_HEADER_H }}
                        >
                            <Zap size={12} fill="currentColor" />
                            <span>{pdu.id}</span>
                        </div>
                        
                        {/* Sockets */}
                        <div className="flex-1 w-full flex flex-col items-center" style={{ padding: `${SOCKET_PADDING}px 0` }}>
                            {Array.from({ length: totalSockets }).map((_, i) => renderSocket(pdu, i))}
                        </div>
                        
                        {/* Footer / Load Bar */}
                        <div 
                            className="shrink-0 w-full p-1 flex flex-col justify-end border-t border-slate-200"
                            style={{ height: PDU_FOOTER_H }}
                        >
                            <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden mb-1">
                                <div className={`h-full ${isOverloaded ? 'bg-red-500' : (pdu.side === 'A' ? 'bg-blue-500' : 'bg-red-500')}`} style={{ width: `${pct}%` }}></div>
                            </div>
                            <div className={`text-[9px] text-center ${isOverloaded ? 'text-red-600' : 'text-slate-500'}`}>{Math.round(load.max)}W</div>
                        </div>
                    </div>
                </div>
            </React.Fragment>
          );
      })}

      {/* Render Rack */}
      <div 
        className={`absolute top-0 w-[420px] ${THEME.rackBg} border-x-4 ${THEME.rackBorder} z-20 flex flex-col shadow-lg`}
        style={{ left: rackLeftX, height: RACK_HEIGHT_PX }}
      >
         <div className="h-4 shrink-0 bg-slate-300 w-full border-b border-slate-400"></div>
         <div className="flex-1 flex flex-col w-full relative">
             {renderRack()}
         </div>
         <div className="h-4 shrink-0 bg-slate-300 w-full border-t border-slate-400"></div>
      </div>
      
      {/* Render Cables Last (Top Layer) */}
      {renderCables()}

    </div>
  );
};

export default RackVisualizer;
