import React, { useState } from 'react';
import { useWaterContext } from '../context/WaterContext';
import { useToast } from '../context/ToastContext';
import { useUnitContext } from '../context/UnitContext';
import { Button } from 'primereact/button';
import { InputNumber } from 'primereact/inputnumber';

interface DrinkType {
  id: string;
  name: string;
  icon: string;
  imageUrl: string;
  iconClass: string;
}

const AddWaterIntake: React.FC = () => {
  const { addWaterIntake } = useWaterContext();
  const toast = useToast();
  const { unit, formatAmount } = useUnitContext();
  const [selectedDrink, setSelectedDrink] = useState<DrinkType | null>(null);
  const [selectedAmount, setSelectedAmount] = useState<number>(250);

  const drinkTypes: DrinkType[] = [
    {
      id: 'water',
      name: 'Water',
      icon: '',
      imageUrl: 'https://cdn-icons-png.flaticon.com/512/824/824239.png',
      iconClass: 'beverage-water',
    },
    {
      id: 'coffee',
      name: 'Coffee',
      icon: '',
      imageUrl: 'https://cdn-icons-png.flaticon.com/512/751/751621.png',
      iconClass: 'beverage-coffee',
    },
    {
      id: 'tea',
      name: 'Tea',
      icon: '',
      imageUrl: 'https://cdn-icons-png.flaticon.com/512/12257/12257379.png',
      iconClass: 'beverage-tea',
    },
    {
      id: 'juice',
      name: 'Juice',
      icon: '',
      imageUrl: 'https://cdn-icons-png.flaticon.com/512/3165/3165589.png',
      iconClass: 'beverage-juice',
    },
    {
      id: 'milk',
      name: 'Milk',
      icon: '',
      imageUrl: 'https://cdn-icons-png.flaticon.com/512/3528/3528201.png',
      iconClass: 'beverage-milk',
    },
    {
      id: 'soda',
      name: 'Soda',
      icon: '',
      imageUrl: 'https://cdn-icons-png.flaticon.com/512/734/734748.png',
      iconClass: 'beverage-soda',
    },
  ];

  // Define preset amounts based on unit
  const presetAmounts =
    unit === 'ml' ? [100, 200, 250, 300, 500, 750] : [3, 7, 8, 10, 17, 25];

  const handleDrinkSelection = (drink: DrinkType) => {
    setSelectedDrink(drink);
  };

  const handleAddDrink = () => {
    if (selectedDrink && selectedAmount > 0) {
      // Always store in ml in the database
      const amountInMl =
        unit === 'oz' ? Math.round(selectedAmount * 29.5735) : selectedAmount;
      addWaterIntake(amountInMl, selectedDrink.id);
      toast.showSuccess(
        'Drink Added',
        `Added ${formatAmount(selectedAmount)} of ${selectedDrink.name}`
      );
      setSelectedDrink(null);
      setSelectedAmount(250);
    }
  };

  // Creating dialog content with title and close button

  return (
    <div className="add-drink-page">
      <h2 className="section-title">Add Drink</h2>

      <div className="drink-section">
        <h3>Select Drink Type</h3>
        <div className="drink-grid">
          {drinkTypes.map((drink) => (
            <div
              key={drink.id}
              className={`drink-selection-item ${
                selectedDrink?.id === drink.id ? 'selected' : ''
              }`}
              onClick={() => handleDrinkSelection(drink)}
            >
              <div className={`drink-icon ${drink.iconClass}`}>
                <img
                  src={drink.imageUrl}
                  alt={drink.name}
                  className="drink-svg-icon"
                />
              </div>
              <span className="drink-name">{drink.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="amount-section">
        <h3>Select Quantity</h3>

        <div className="preset-amounts">
          {presetAmounts.map((amount) => (
            <button
              key={amount}
              className={`preset-amount-btn ${
                amount === selectedAmount ? 'selected' : ''
              }`}
              onClick={() => setSelectedAmount(amount)}
            >
              {formatAmount(amount)}
            </button>
          ))}
        </div>

        <div className="custom-amount">
          <div className="amount-input-container">
            <Button
              className="p-button-text amount-adjust-btn"
              onClick={() =>
                setSelectedAmount((prev) =>
                  Math.max(
                    unit === 'ml' ? 50 : 2,
                    prev - (unit === 'ml' ? 50 : 1)
                  )
                )
              }
            >
              <i className="pi pi-minus"></i>
            </Button>
            <InputNumber
              value={selectedAmount}
              onValueChange={(e) => {
                const value = e.value as number;
                if (value >= (unit === 'ml' ? 50 : 2)) {
                  setSelectedAmount(value);
                }
              }}
              min={unit === 'ml' ? 50 : 2}
              max={unit === 'ml' ? 3000 : 101}
              step={unit === 'ml' ? 50 : 1}
              showButtons={false}
              suffix={unit === 'ml' ? ' ml' : ' oz'}
              className="amount-input"
              maxLength={5}
            />
            <Button
              className="p-button-text amount-adjust-btn"
              onClick={() =>
                setSelectedAmount((prev) => 
                  Math.min(
                    unit === 'ml' ? 3000 : 101,
                    prev + (unit === 'ml' ? 50 : 1)
                  )
                )
              }
            >
              <i className="pi pi-plus"></i>
            </Button>
          </div>
        </div>
      </div>

      <div className="add-drink-actions">
        <Button
          label={
            selectedDrink
              ? `Add ${selectedDrink.name} (${formatAmount(selectedAmount)})`
              : 'Select a drink type'
          }
          className="add-drink-submit-btn"
          onClick={handleAddDrink}
          style={{ backgroundColor: '#00BCD4', border: 'none' }}
          disabled={!selectedDrink}
        />
      </div>
    </div>
  );
};

export default AddWaterIntake;
