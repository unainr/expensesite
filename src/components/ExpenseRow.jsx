"use client";
import { useState, useEffect } from "react";

export default function ExpenseRow({ id, data, onChange, onDelete }) {
  const [localData, setLocalData] = useState(data);

  useEffect(() => {
    setLocalData(data);
  }, [data]);

  const handleChange = (field, value) => {
    const newData = { ...localData, [field]: value };

    // Auto-calculate Total if Weight and Rate are changed
    if (field === "weight" || field === "rate") {
      const w = parseFloat(field === "weight" ? value : localData.weight) || 0;
      const r = parseFloat(field === "rate" ? value : localData.rate) || 0;
      newData.total = w * r;
    }

    setLocalData(newData);
    onChange(id, newData);
  };

  return (
    <div className="glass-input group animate-in fade-in slide-in-from-bottom-2 mb-2 grid grid-cols-12 items-center gap-4 rounded-lg p-3 transition-all duration-300 hover:bg-white/5">
      {/* Type Dropdown */}
      <div className="col-span-3 sm:col-span-2">
        <select
          className="w-full border-b border-transparent bg-transparent text-sm font-medium text-gray-200 transition-colors outline-none focus:border-purple-500"
          value={localData.commodityType}
          onChange={(e) => handleChange("commodityType", e.target.value)}
        >
          <option value="" className="bg-slate-900">
            Select Grade
          </option>
          <option value="3/6" className="bg-slate-900">
            3/6
          </option>
          <option value="6/10" className="bg-slate-900">
            6/10
          </option>
          <option value="10/20" className="bg-slate-900">
            10/20
          </option>
          <option value="20/40" className="bg-slate-900">
            20/40
          </option>
          <option value="40/60" className="bg-slate-900">
            40/60
          </option>
          <option value="Custom" className="bg-slate-900">
            Custom
          </option>
        </select>
      </div>

      {/* Weight Input */}
      <div className="col-span-3 sm:col-span-2">
        <input
          type="number"
          placeholder="Wgt"
          className="w-full border-b border-transparent bg-transparent text-center transition-colors outline-none focus:border-cyan-500"
          value={localData.weight}
          onChange={(e) => handleChange("weight", e.target.value)}
        />
      </div>

      {/* Rate Input */}
      <div className="col-span-2 sm:col-span-2">
        <input
          type="number"
          placeholder="Rate"
          className="w-full border-b border-transparent bg-transparent text-center text-gray-400 transition-colors outline-none focus:border-green-500"
          value={localData.rate}
          onChange={(e) => handleChange("rate", e.target.value)}
        />
      </div>

      {/* Total Display/Input */}
      <div className="col-span-3 sm:col-span-3">
        <input
          type="number"
          placeholder="Total"
          className="w-full border-b border-transparent bg-transparent text-right font-bold text-white transition-colors outline-none focus:border-pink-500"
          value={localData.total || ""}
          onChange={(e) => handleChange("total", e.target.value)} // Allow manual override
        />
      </div>

      {/* Actions */}
      <div className="col-span-1 flex items-center justify-end gap-2 opacity-40 transition-opacity group-hover:opacity-100 sm:col-span-3">
        {/* Delete Button */}
        <button
          onClick={() => onDelete(id)}
          className="p-1 transition-colors hover:text-red-400"
          title="Delete Row"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="h-5 w-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18 18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
