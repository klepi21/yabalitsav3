'use client';

import { Mail } from 'lucide-react';

interface SupportEmailProps {
  className?: string;
  showIcon?: boolean;
  variant?: 'default' | 'compact' | 'highlighted';
}

export default function SupportEmail({ 
  className = '', 
  showIcon = true, 
  variant = 'default' 
}: SupportEmailProps) {
  const baseClasses = "inline-flex items-center text-emerald-600 hover:text-emerald-500 transition-colors";

  const variantClasses = {
    default: "text-lg font-medium",
    compact: "text-sm font-medium",
    highlighted: "text-lg font-semibold bg-emerald-600/10 px-4 py-2 rounded-lg hover:bg-emerald-600/20"
  };

  const classes = `${baseClasses} ${variantClasses[variant]} ${className}`;

  return (
    <a 
      href="mailto:support@yabalitsa.com"
      className={classes}
    >
      {showIcon && <Mail className="h-5 w-5 mr-2" />}
      <span>support@yabalitsa.com</span>
    </a>
  );
}
