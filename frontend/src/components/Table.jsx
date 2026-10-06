export function Table({
  columns,
  rows,
  emptyMessage = 'No records available.',
  allowOverflow = false,
  getRowClassName,
}) {
  return (
    <div className={`rounded-3xl border border-slate-200 bg-white ${allowOverflow ? 'overflow-visible' : 'overflow-hidden'}`}>
      <div className={allowOverflow ? 'overflow-x-auto overflow-y-visible' : 'overflow-x-auto'}>
        <table className="min-w-full divide-y divide-slate-200 text-left">
          <thead className="bg-brand-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-brand-800"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.length ? (
              rows.map((row) => (
                <tr key={row.id || row.title} className={getRowClassName ? getRowClassName(row) : ''}>
                  {columns.map((column) => (
                    <td key={column.key} className="px-5 py-4 text-sm text-slate-700">
                      {column.render ? column.render(row[column.key], row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-5 py-8 text-center text-sm text-slate-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
