
export const DEFAULT_CSV = `Room,Device,Rack Size (U),Total No. of Device,Total No. of PS,PSU Rating (Watt),Typical Power (Watt),Max Power (Watt),Total Max Power Consumption (Watt),Power Connection Type
MG3_RACK_03,Cisco Nexus C93180YC-FX3,1,4,8,650,,600,2400,C13
MG3_RACK_03,Lenovo DB720S,1,2,4,650,,349,698,C13
MG3_RACK_03,H3C UniServer R4700 G6,1,10,20,1300,,863.3,8633,C13
MG3_RACK_03,Lenovo ThinkSystem DG5200,2,1,2,1600,826.9,1079,1079,C13
MG3_RACK_03,HPE ProLiant DL380 Gen10,2,2,4,,,1600,3200,C13
MG3_RACK_03,1U Router (ASR 1001-HX class),1,1,2,,,400,400,C13
MG3_RACK_03,1U KVM Console,1,1,1,,,,20,C13`;

export const PDU_VARIANTS = [
  { name: 'Standard 16A (3.6kW)', power: 3680 },
  { name: 'Standard 32A (7.3kW)', power: 7360 },
  { name: 'High Density 63A (14.4kW)', power: 14400 },
  { name: '3-Phase 16A (11kW)', power: 11000 },
  { name: '3-Phase 32A (22kW)', power: 22000 },
];
