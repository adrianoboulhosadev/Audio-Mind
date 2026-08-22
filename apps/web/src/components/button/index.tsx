import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { BUTTON_BASE_CLASS, BUTTON_VARIANT_CLASSES, type ButtonVariant } from './data/button-variants'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  children: ReactNode
}

export function Button({ variant = 'primary', className = '', children, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      {...props}
      className={`${BUTTON_BASE_CLASS} ${BUTTON_VARIANT_CLASSES[variant]} ${className}`}
    >
      {children}
    </button>
  )
}
