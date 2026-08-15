import type { ChangeEvent } from 'react';

export interface ParameterSliderProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  disabled: boolean;
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
}

export default function ParameterSlider({
  id,
  label,
  value,
  min,
  max,
  step,
  disabled,
  onChange,
  formatValue = String,
}: ParameterSliderProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.currentTarget.valueAsNumber);
  };

  return (
    <div className="parameter-slider">
      <div className="parameter-slider__heading">
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id}>{formatValue(value)}</output>
      </div>
      <input
        aria-valuetext={formatValue(value)}
        className="parameter-slider__input"
        data-testid={id}
        disabled={disabled}
        id={id}
        max={max}
        min={min}
        onChange={handleChange}
        step={step}
        type="range"
        value={value}
      />
      <div aria-hidden="true" className="parameter-slider__range">
        <span>{formatValue(min)}</span>
        <span>{formatValue(max)}</span>
      </div>
    </div>
  );
}
