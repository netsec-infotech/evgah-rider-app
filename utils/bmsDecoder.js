/**
 * BMS Decoder & Modbus Telemetry Engine
 * Directly compatible with DL-Series / HiLink BMS protocol implemented in evegah-bms
 */

export function hexToBytes(hexString) {
  if (!hexString || typeof hexString !== 'string') return [];
  const clean = hexString.replace(/[^0-9a-fA-F]/g, '');
  const bytes = [];
  for (let i = 0; i < clean.length; i += 2) {
    bytes.push(parseInt(clean.substring(i, i + 2), 16));
  }
  return bytes;
}

/**
 * Parses raw Modbus RTU telemetry payload from DL-series BMS (62 registers / 124 bytes).
 * Exactly matches evegah-bms logic:
 *   - bytes 0-25: 13 cell voltages (mV)
 *   - bytes 64-71: Temperature sensors T1-T4 (raw - 40 = °C)
 *   - bytes 80-81: Pack voltage (0.1V)
 *   - bytes 82-83: Current (signed, offset 30000, unit 0.1A)
 *   - bytes 84-85: SOC % (unit 0.1%)
 *   - bytes 86-89: Max / min cell voltages (mV)
 *   - bytes 90-91: SOH % (0-100)
 *   - bytes 96-97: Remaining capacity (0.1Ah)
 *   - bytes 102-103: Cycles
 *   - bytes 112-113: Voltage delta (mV)
 *   - bytes 114-115: Power (Watts)
 */
export function parseModbusFrame(rawPayload) {
  let bytes = Array.isArray(rawPayload) ? rawPayload : hexToBytes(rawPayload);
  if (!bytes || bytes.length < 26) {
    return null;
  }

  // If full RTU frame with header [0xD2, 0x03, byteCount, ...], strip header & CRC
  if (bytes[0] === 0xd2 && bytes[1] === 0x03 && bytes.length >= 5) {
    const byteCount = bytes[2];
    bytes = bytes.slice(3, 3 + byteCount);
  }

  const reg = (offset) => {
    if (offset + 1 >= bytes.length) return 0;
    return (bytes[offset] << 8) | bytes[offset + 1];
  };

  // 1. Cell Voltages (13 series cells in mV)
  const cellVoltages = [];
  for (let i = 0; i < 13; i++) {
    const mv = reg(i * 2);
    if (mv >= 1000 && mv <= 5000) {
      cellVoltages.push(mv);
    } else if (cellVoltages.length > 0) {
      break;
    }
  }

  // 2. Temperature Sensors (T1-T4, raw - 40 = °C)
  let temperature = 32.0;
  for (let i = 0; i < 4; i++) {
    const rawTemp = reg(64 + i * 2);
    if (rawTemp !== 0x00ff && rawTemp > 0 && rawTemp < 200) {
      temperature = Number((rawTemp - 40).toFixed(1));
      break;
    }
  }

  // 3. Pack Voltage (unit 0.1V)
  let voltage = 52.6;
  const rawVolt = reg(80);
  if (rawVolt > 0 && rawVolt < 10000) {
    voltage = Number((rawVolt / 10.0).toFixed(1));
  } else if (cellVoltages.length > 0) {
    const sumMv = cellVoltages.reduce((a, v) => a + v, 0);
    voltage = Number((sumMv / 1000.0).toFixed(2));
  }

  // 4. SOC % (unit 0.1% or direct)
  let soc = 85;
  const rawSoc = reg(84);
  if (rawSoc > 0) {
    soc = rawSoc > 100 ? Math.round(rawSoc / 10.0) : rawSoc;
  }

  // 5. Current (signed, offset 30000, unit 0.1A)
  let current = 0.0;
  const rawCurrent = reg(82);
  if (rawCurrent > 0) {
    current = Number(((rawCurrent - 30000) / 10.0).toFixed(1));
  }

  // 6. Remaining Capacity (unit 0.1Ah)
  let remainingCapacity = 30.0;
  const rawCap = reg(96);
  if (rawCap > 0) {
    remainingCapacity = Number((rawCap / 10.0).toFixed(1));
  }

  // 7. SOH % (0-100)
  let health = 98;
  const rawSoh = reg(90);
  if (rawSoh >= 0 && rawSoh <= 100) {
    health = rawSoh;
  }

  // 8. Cycles
  let cycles = 120;
  const rawCycles = reg(102);
  if (rawCycles >= 0 && rawCycles < 50000) {
    cycles = rawCycles;
  }

  // 9. Delta & Power
  const voltDiffMv = reg(112) || (cellVoltages.length > 1 ? Math.max(...cellVoltages) - Math.min(...cellVoltages) : 10);
  const powerWatts = reg(114) || Math.round(Math.abs(voltage * current));

  return {
    voltage,
    current,
    soc: Math.max(0, Math.min(100, soc)),
    health: Math.max(0, Math.min(100, health)),
    temperature,
    cycles,
    remainingCapacity,
    voltDiffMv,
    powerWatts,
    cellVoltages,
  };
}

/**
 * Computes safety thresholds, alarms, and faults matching evegah-bms
 */
export function evaluateBmsFaults(bms) {
  const faults = [];
  if (!bms) return faults;

  if (bms.temperature > 55.0) {
    faults.push(`High Temp Alert: ${bms.temperature.toFixed(1)}°C (>55°C limit)`);
  } else if (bms.temperature < -10.0) {
    faults.push(`Low Temp Alert: ${bms.temperature.toFixed(1)}°C`);
  }

  if (bms.voltage > 58.8) {
    faults.push(`Over-Voltage Alert: ${bms.voltage.toFixed(1)}V (>58.8V limit)`);
  } else if (bms.voltage < 42.0 && bms.voltage > 10.0) {
    faults.push(`Under-Voltage Alert: ${bms.voltage.toFixed(1)}V (<42.0V limit)`);
  }

  if (bms.voltDiffMv && bms.voltDiffMv > 150) {
    faults.push(`Cell Imbalance: ${bms.voltDiffMv}mV delta (>150mV)`);
  }

  if (bms.soc <= 10.0 && bms.soc > 0.0) {
    faults.push(`Critical Low Battery: ${bms.soc}% SOC`);
  }

  return faults;
}

/**
 * Formats 13 cells with relative bar percentages, highlighting min/max cell
 */
export function formatCellMatrix(cellVoltages = [], nominalVoltage = 52.6) {
  let cells = [];
  if (Array.isArray(cellVoltages) && cellVoltages.length > 0) {
    cells = cellVoltages.map((v) => (v > 100 ? v : Math.round(v * 1000)));
  } else {
    // Generate nominal balanced cell voltages if raw array is empty
    const avgMv = Math.round((nominalVoltage / 13) * 1000);
    cells = Array.from({ length: 13 }, (_, i) => avgMv + ((i % 3) - 1) * 6);
  }

  const maxVal = Math.max(...cells);
  const minVal = Math.min(...cells);

  return cells.map((mv, index) => {
    const v = Number((mv / 1000).toFixed(3));
    // Normal Li-ion range is 3.0V (0%) to 4.2V (100%)
    const pct = Math.max(0, Math.min(100, Math.round(((v - 3.0) / 1.2) * 100)));
    return {
      index: index + 1,
      name: `Cell ${String(index + 1).padStart(2, '0')}`,
      voltageV: v,
      voltageMv: mv,
      pct,
      isMax: mv === maxVal && cells.length > 1,
      isMin: mv === minVal && cells.length > 1,
      status: mv > 4250 ? 'high' : mv < 3100 ? 'low' : 'normal',
    };
  });
}
