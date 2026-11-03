
import type { ReactNode } from 'react';
import EmptyState from './EmptyState';

export type DataColumn<T> = {
  key: keyof T | string;
  header: string;
  align?: 'left' | 'center' | 'right';
  render?: (item: T) => ReactNode;
};

type DataTableProps<T> = {
  columns: DataColumn<T>[];
  items: T[];
  getRowId: (item: T) => string | number;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
};

export default function DataTable<T>({
  columns,
  items,
  getRowId,
  emptyTitle = 'No hay registros',
  emptyDescription = 'Todavía no hay información para mostrar.',
  emptyAction,
}: DataTableProps<T>) {
  if (items.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }

  return (
    <div className="shared-table-wrapper">
      <table className="shared-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={String(column.key)}
                scope="col"
                style={{ textAlign: column.align ?? 'left' }}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {items.map((item) => (
            <tr key={getRowId(item)}>
              {columns.map((column) => {
                const rawValue = (
                  item as unknown as Record<string, unknown>
                )[String(column.key)];

                return (
                  <td
                    key={String(column.key)}
                    style={{ textAlign: column.align ?? 'left' }}
                  >
                    {column.render
                      ? column.render(item)
                      : String(rawValue ?? '—')}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
