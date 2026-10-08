import React, { ReactNode } from 'react';

interface Column<T> {
  header: string;
  accessor: (row: T) => ReactNode;
  width?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (row: T) => string;
  emptyMessage?: string;
  rowClassName?: (row: T) => string;
}

export function DataTable<T>({ data, columns, keyExtractor, emptyMessage = 'Nenhum dado encontrado', rowClassName }: DataTableProps<T>) {
  if (!data || data.length === 0) {
    return (
      <div className="h-10 box-border px-3 rounded border border-tc-border flex items-center bg-tc-bg text-tc-text-muted text-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden border border-tc-border rounded-lg bg-tc-bg">
      <table className="w-full text-left border-collapse text-sm">
        <thead className="bg-tc-surface-2 border-b border-tc-border">
          <tr>
            {columns.map((col, i) => (
              <th key={i} className="py-2 px-4 font-semibold text-tc-text-muted" style={{ width: col.width }}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={keyExtractor(row)} className={i !== data.length - 1 ? 'border-b border-tc-border' : ''}>
              {columns.map((col, j) => (
                <td key={j} className="py-2 px-4">
                  {col.accessor(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
