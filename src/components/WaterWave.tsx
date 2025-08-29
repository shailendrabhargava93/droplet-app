import React from 'react';
import { Knob } from 'primereact/knob';
import { useUnitContext } from '../context/UnitContext';

interface WaveProps {
  progress: number;
  current: number;
  goal: number;
}

const WaterWave: React.FC<WaveProps> = ({ progress, current, goal }) => {
  const { formatAmount } = useUnitContext();

  return (
    <div className="water-circle-container">
      <Knob
        value={progress}
        size={180}
        readOnly
        strokeWidth={6}
        valueColor="#00BCD4"
        rangeColor="#E0F7FA"
        textColor="transparent"
        valueTemplate=""
        style={{ borderRadius: '50%', padding: '2px' }}
        className="custom-knob"
      />
      <div className="water-circle-text">
        <span className="water-amount">{formatAmount(current)}</span>
        <span className="water-goal">of {formatAmount(goal)}</span>
      </div>
    </div>
  );
};

export default WaterWave;
