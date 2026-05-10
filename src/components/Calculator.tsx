import React, { useState } from 'react';
import { Delete, Equal, Minus, Pin, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CalculatorProps {
  onUnlock: (passcode: string) => void;
}

export default function Calculator({ onUnlock }: CalculatorProps) {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');

  const handleNumber = (num: string) => {
    if (display === '0') {
      setDisplay(num);
    } else {
      setDisplay(display + num);
    }
  };

  const handleOperator = (op: string) => {
    setEquation(display + ' ' + op + ' ');
    setDisplay('0');
  };

  const handleClear = () => {
    setDisplay('0');
    setEquation('');
  };

  const handleCalculate = () => {
    try {
      // Check for unlock code first
      // We'll treat the current display as a potential passcode
      onUnlock(display);

      // Traditional calculation
      const fullEquation = equation + display;
      // Using direct eval for simplicity in calculator demo, but usually avoiding it in production
      // Here it's okay for a math expression.
      // eslint-disable-next-line no-eval
      const result = eval(fullEquation.replace('x', '*'));
      setDisplay(String(result));
      setEquation('');
    } catch (e) {
      setDisplay('Error');
    }
  };

  const buttons = [
    { label: 'C', type: 'clear', action: handleClear },
    { label: '÷', type: 'operator', action: () => handleOperator('/') },
    { label: 'x', type: 'operator', action: () => handleOperator('*') },
    { label: '7', type: 'num', action: () => handleNumber('7') },
    { label: '8', type: 'num', action: () => handleNumber('8') },
    { label: '9', type: 'num', action: () => handleNumber('9') },
    { label: '-', type: 'operator', action: () => handleOperator('-') },
    { label: '4', type: 'num', action: () => handleNumber('4') },
    { label: '5', type: 'num', action: () => handleNumber('5') },
    { label: '6', type: 'num', action: () => handleNumber('6') },
    { label: '+', type: 'operator', action: () => handleOperator('+') },
    { label: '1', type: 'num', action: () => handleNumber('1') },
    { label: '2', type: 'num', action: () => handleNumber('2') },
    { label: '3', type: 'num', action: () => handleNumber('3') },
    { label: '0', type: 'num', action: () => handleNumber('0'), className: 'col-span-2' },
    { label: '.', type: 'num', action: () => handleNumber('.') },
    { label: '=', type: 'equal', action: handleCalculate },
  ];

  return (
    <div className="w-full max-w-md mx-auto bg-[#1A1C1E] p-4 sm:p-6 rounded-[32px] sm:rounded-[40px] shadow-2xl border border-white/5">
      <div className="mb-4 sm:mb-8 px-4 py-4 sm:py-8 text-right min-h-[120px] sm:min-h-[140px] flex flex-col justify-end">
        <div className="text-gray-500 text-base sm:text-lg font-mono mb-2 overflow-hidden支撑 whitespace-nowrap">
          {equation}
        </div>
        <div className="text-white text-5xl sm:text-6xl font-light tracking-tighter overflow-hidden overflow-ellipsis">
          {display}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 sm:gap-4">
        {buttons.map((btn) => (
          <button
            key={btn.label}
            onClick={btn.action}
            className={`
              ${btn.className || ''}
              h-14 sm:h-16 rounded-full text-lg sm:text-xl font-medium transition-all active:scale-95 flex items-center justify-center
              ${btn.type === 'num' ? 'bg-[#2D2F31] text-white hover:bg-[#3D3F41]' : ''}
              ${btn.type === 'operator' ? 'bg-[#3E4348] text-[#8AB4F8] hover:bg-[#4E5358]' : ''}
              ${btn.type === 'clear' ? 'bg-[#5F6368] text-white hover:bg-[#6F7378]' : ''}
              ${btn.type === 'equal' ? 'bg-[#8AB4F8] text-[#1A1C1E] hover:bg-[#99C2FF]' : ''}
            `}
          >
            {btn.label}
          </button>
        ))}
      </div>
      
      <div className="mt-8 text-center">
        <p className="text-gray-600 text-xs font-mono uppercase tracking-[0.2em]">Secure Hardware Calc</p>
      </div>
    </div>
  );
}
