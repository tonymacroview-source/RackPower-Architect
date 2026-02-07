import React from 'react';
import { PDUPair, Device } from '../types';
import { Zap, Server, AlertTriangle, Activity } from 'lucide-react';

interface Props {
  pduPair: PDUPair;
  index: number;
  voltage: number;
  powerFactor: number;
}

const WiringDiagram: React.FC<Props> = ({ pduPair, index, voltage, powerFactor }) => {
  const isOverloaded = pduPair.currentLoad > pduPair.capacity;
  const loadPercentage = (pduPair.currentLoad / pduPair.capacity) * 100;
  
  // Calculate Electrical Stats
  const apparentPowerVA = pduPair.currentLoad / powerFactor;
  const currentAmps = apparentPowerVA / voltage;
  
  // Color determination based on load
  let loadColor = "bg-emerald-500";
  if (loadPercentage > 90) loadColor = "bg-red-500";
  else if (loadPercentage > 80) loadColor = "bg-amber-500";

  return (
    <div className="bg-slate-800 print:bg-white rounded-xl p-6 border border-slate-700 shadow-xl mb-8 break-inside-avoid print:border-slate-300 print:shadow-none">
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-700 print:border-slate-300">
        <div>
          <h3 className="text-xl font-bold text-white print:text-black flex items-center gap-2">
            <Zap className="text-yellow-400 print:text-yellow-600" size={24} />
            PDU Pair #{index + 1}
          </h3>
          <p className="text-slate-400 print:text-slate-600 text-sm mt-1">
             Effective Limit: {Math.round(pduPair.capacity).toLocaleString()}W 
             <span className="opacity-70 mx-1">|</span> 
             PF: {powerFactor}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-mono font-bold text-white print:text-black">
            {Math.round(pduPair.currentLoad).toLocaleString()}W
            <span className="text-slate-500 print:text-slate-400 text-lg mx-2">/</span>
            {Math.round(pduPair.capacity).toLocaleString()}W
          </div>
          <div className="flex justify-end gap-3 text-xs font-mono mt-1 text-slate-400 print:text-slate-600">
             <span title="Apparent Power">{Math.round(apparentPowerVA).toLocaleString()} VA</span>
             <span className="text-slate-600">|</span>
             <span title="Current Draw">{currentAmps.toFixed(1)} A @ {voltage}V</span>
          </div>
          <div className={`text-sm font-bold mt-1 ${loadPercentage > 90 ? 'text-red-400 print:text-red-700' : 'text-emerald-400 print:text-emerald-700'}`}>
            {loadPercentage.toFixed(1)}% Load (A+B Redundancy)
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8 relative">
        {/* PDU A Visual */}
        <div className="w-16 md:w-24 bg-slate-900 print:bg-slate-100 border-2 border-slate-600 print:border-slate-300 rounded-lg flex flex-col items-center py-4 relative z-10 shrink-0">
          <div className="text-xs font-bold text-slate-400 print:text-slate-600 mb-2">FEED A</div>
          <div className="w-8 h-full bg-slate-800 print:bg-slate-200 rounded flex flex-col items-center justify-start gap-1 py-2">
             {/* PDU Outlets simulation */}
             {Array.from({ length: 24 }).map((_, i) => (
               <div key={`a-${i}`} className="w-4 h-2 bg-black print:bg-slate-400 rounded-[1px] opacity-50"></div>
             ))}
          </div>
          <div className="absolute -bottom-6 text-xs text-blue-400 print:text-blue-700 font-bold">PDU A</div>
        </div>

        {/* Devices Stack */}
        <div className="flex-1 flex flex-col gap-2 relative z-0">
          {pduPair.devices.map((device, devIdx) => (
            <div key={device.id} className="relative group">
              
              {/* Connection Lines */}
              <div className="absolute top-1/2 left-0 -ml-4 md:-ml-8 w-4 md:w-8 h-[2px] bg-blue-500 print:bg-blue-600 opacity-30 print:opacity-100"></div>
              <div className="absolute top-1/2 right-0 -mr-4 md:-mr-8 w-4 md:w-8 h-[2px] bg-red-500 print:bg-red-600 opacity-30 print:opacity-100"></div>

              <div className="bg-slate-700 print:bg-white hover:bg-slate-600 transition-colors rounded p-3 flex justify-between items-center border border-slate-600 print:border-slate-300">
                <div className="flex items-center gap-3">
                  <Server size={18} className="text-slate-400 print:text-slate-600" />
                  <div>
                    <div className="text-sm font-semibold text-white print:text-black">{device.name}</div>
                    <div className="text-xs text-slate-400 print:text-slate-600 flex gap-2">
                       <span>PSUs: {device.psuCount}</span>
                       <span>Conn: {device.connectionType}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono text-emerald-300 print:text-black">{device.powerRatingPerDevice}W</div>
                </div>
              </div>
            </div>
          ))}
          {pduPair.devices.length === 0 && (
             <div className="text-center text-slate-500 py-12 italic">No devices assigned</div>
          )}
        </div>

        {/* PDU B Visual */}
        <div className="w-16 md:w-24 bg-slate-900 print:bg-slate-100 border-2 border-slate-600 print:border-slate-300 rounded-lg flex flex-col items-center py-4 relative z-10 shrink-0">
          <div className="text-xs font-bold text-slate-400 print:text-slate-600 mb-2">FEED B</div>
          <div className="w-8 h-full bg-slate-800 print:bg-slate-200 rounded flex flex-col items-center justify-start gap-1 py-2">
             {/* PDU Outlets simulation */}
             {Array.from({ length: 24 }).map((_, i) => (
               <div key={`b-${i}`} className="w-4 h-2 bg-black print:bg-slate-400 rounded-[1px] opacity-50"></div>
             ))}
          </div>
          <div className="absolute -bottom-6 text-xs text-red-400 print:text-red-700 font-bold">PDU B</div>
        </div>

      </div>

      {/* Utilization Bar */}
      <div className="mt-12">
         <div className="flex justify-between text-xs text-slate-400 print:text-slate-600 mb-1">
            <span className="flex items-center gap-2">
              <Activity size={14} />
              Utilization (Real Power)
            </span>
            <span>{Math.round(loadPercentage)}%</span>
         </div>
         <div className="h-4 bg-slate-900 print:bg-slate-200 rounded-full overflow-hidden border border-slate-800 print:border-slate-300">
            <div 
              className={`h-full transition-all duration-500 ${loadColor} print-color-adjust-exact`} 
              style={{ width: `${Math.min(loadPercentage, 100)}%` }}
            ></div>
         </div>
         {isOverloaded && (
           <div className="mt-2 text-red-400 print:text-red-600 text-sm flex items-center gap-2">
             <AlertTriangle size={16} />
             Warning: Capacity exceeded!
           </div>
         )}
      </div>
    </div>
  );
};

export default WiringDiagram;