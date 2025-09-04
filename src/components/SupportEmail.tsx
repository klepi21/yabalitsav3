'use client';

import { EnvelopeIcon } from '@heroicons/react/24/outline';

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
  const baseClasses = "inline-flex items-center text-football-green hover:text-football-green-light transition-colors";
  
  const variantClasses = {
    default: "text-lg font-medium",
    compact: "text-sm font-medium",
    highlighted: "text-lg font-semibold bg-football-green/10 px-4 py-2 rounded-lg hover:bg-football-green/20"
  };

  const classes = `${baseClasses} ${variantClasses[variant]} ${className}`;

  return (
    <a 
      href="mailto:support@yabalitsa.com"
      className={classes}
    >
      {showIcon && <EnvelopeIcon className="h-5 w-5 mr-2" />}
      <span>support@yabalitsa.com</span>
    </a>
  );
}
