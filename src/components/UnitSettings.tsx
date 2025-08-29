import React from 'react';
import { SelectButton } from 'primereact/selectbutton';
import { useUnitContext } from '../context/UnitContext';

interface UnitOption {
  label: string;
  value: string;
}

const UnitSettings: React.FC = () => {
  const { unit, setUnit } = useUnitContext();

  const unitOptions: UnitOption[] = [
    { label: 'Milliliters (ml)', value: 'ml' },
    { label: 'Ounces (oz)', value: 'oz' },
  ];

  const handleUnitChange = (newUnit: string) => {
    setUnit(newUnit as 'ml' | 'oz');
  };

  return (
    <div className="settings-section">
      <div className="settings-section-header">
        <i
          className="pi pi-sliders-h settings-icon"
          style={{ color: '#00BCD4' }}
        ></i>
        <h3>Units</h3>
      </div>

      <div className="setting-row">
        <div className="setting-control">
          <SelectButton
            value={unit}
            options={unitOptions}
            onChange={(e) => handleUnitChange(e.value)}
            className="unit-toggle"
          />
        </div>
      </div>
    </div>
  );
};

export default UnitSettings;
