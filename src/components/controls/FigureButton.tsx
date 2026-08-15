import type { ButtonHTMLAttributes, ReactNode } from 'react';

export interface FigureButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'type'> {
  children: ReactNode;
  testId: string;
  variant: 'primary' | 'secondary';
}

export default function FigureButton({
  children,
  testId,
  variant,
  ...buttonProps
}: FigureButtonProps) {
  return (
    <button
      {...buttonProps}
      className={`figure-button figure-button--${variant}`}
      data-testid={testId}
      type="button"
    >
      {children}
    </button>
  );
}
