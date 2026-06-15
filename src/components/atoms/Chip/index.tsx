import styles from './Chip.module.css';

interface ChipProps {
  label: string;
  selected?: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export function Chip({ label, selected = false, onClick, disabled = false }: ChipProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${styles.chip} ${selected ? styles.selected : ''}`}
    >
      {label}
    </button>
  );
}
