import { useId } from 'react';
import { Search, X } from 'lucide-react';

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
};

export default function SearchBar({
  value,
  onChange,
  placeholder = 'Buscar...',
  label = 'Buscar registros',
}: SearchBarProps) {
  const id = useId();

  return (
    <div className="shared-search">
      <label className="shared-sr-only" htmlFor={id}>
        {label}
      </label>

      <Search size={18} aria-hidden="true" />

      <input
        id={id}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />

      {value && (
        <button
          type="button"
          aria-label="Limpiar búsqueda"
          onClick={() => onChange('')}
        >
          <X size={17} />
        </button>
      )}
    </div>
  );
}
