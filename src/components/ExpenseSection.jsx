"use client";
import ExpenseRow from "./ExpenseRow";

export default function ExpenseSection({
  title,
  rows,
  onRowChange,
  onRowDelete,
  onAddRow,
}) {
  const totalWeight = rows.reduce(
    (sum, row) => sum + (parseFloat(row.weight) || 0),
    0,
  );
  const totalAmount = rows.reduce(
    (sum, row) => sum + (parseFloat(row.total) || 0),
    0,
  );

  return (
    <div className="glass-panel mb-8 rounded-2xl p-6 transition-all duration-500 hover:shadow-[0_0_40px_-10px_rgba(168,85,247,0.3)]">
      <div className="mb-4 flex items-end justify-between border-b border-white/10 pb-2">
        <h2 className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-xl font-bold text-transparent">
          {title}
        </h2>
        <div className="text-right">
          <div className="text-xs text-slate-400">Section Total</div>
          <div className="text-lg font-bold text-white">
            {totalAmount.toLocaleString("en-US", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            })}
          </div>
        </div>
      </div>

      <div className="mb-2 grid grid-cols-12 gap-4 px-3 text-xs font-semibold tracking-wider text-slate-400 uppercase">
        <div className="col-span-2">Type</div>
        <div className="col-span-2 text-center">Wgt</div>
        <div className="col-span-2 text-center">Rate</div>
        <div className="col-span-3 text-right">Amount</div>
        <div className="col-span-3 text-right">Actions</div>
      </div>

      <div className="space-y-2">
        {rows.map((row) => (
          <ExpenseRow
            key={row.id}
            id={row.id}
            data={row}
            onChange={(id, data) => onRowChange(title, id, data)}
            onDelete={(id) => onRowDelete(title, id)}
          />
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-4">
        <div className="font-mono text-sm text-slate-300">
          Total Weight:{" "}
          <span className="text-cyan-300">{totalWeight.toFixed(3)}</span>
        </div>
        <button
          onClick={() => onAddRow(title)}
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium transition-all hover:scale-105 hover:bg-white/10 active:scale-95"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="h-4 w-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          Add Row
        </button>
      </div>
    </div>
  );
}
