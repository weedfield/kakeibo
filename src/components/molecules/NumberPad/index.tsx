import styles from './NumberPad.module.scss'

interface NumberPadProps {
  value: string;
  onChange: (value: string) => void;
}

export function NumberPad({ value, onChange }: NumberPadProps) {
  const handlePress = (digit: string) => {
    if (digit === '⌫') {
      onChange(value.slice(0, -1));
    } else if (digit === '000') {
      onChange(value + '000');
    } else {
      onChange(value + digit);
    }
  };

  const buttons = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['000', '0', '⌫'],
  ];

  return (
    <div className={styles.grid}>
      {buttons.map((row, rowIdx) =>
        row.map((btn, btnIdx) => (
          <button
            key={`${rowIdx}-${btnIdx}`}
            onClick={() => handlePress(btn)}
            className={styles.key}
          >
            {btn}
          </button>
        ))
      )}
    </div>
  );
}
