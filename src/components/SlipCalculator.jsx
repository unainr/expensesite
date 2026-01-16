"use client";
import { useState, useEffect } from "react";
import { client, databases, APPWRITE_CONFIG } from "../lib/appwrite";
import { ID } from "appwrite";

// Grades matching the user's handwritten notes
const GRADES = ["3/6", "6/10", "10/20", "20/40", "40/60", "80/140", "Custom"];

export default function SlipCalculator() {
  const [sections, setSections] = useState([
    { id: "s1", title: "(A+)", rows: [] },
    { id: "s2", title: "(A)", rows: [] },
  ]);
  const [purchaseAmount, setPurchaseAmount] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Initialize with some empty rows if needed
  useEffect(() => {
    if (sections[0].rows.length === 0) {
      addRow(0);
    }
  }, []);

  const uuid = () => Math.random().toString(36).substr(2, 9);

  const addRow = (sectionIndex) => {
    const newSections = [...sections];
    newSections[sectionIndex].rows.push({
      id: uuid(),
      commodityType: "",
      weight: "",
      rate: "",
      total: "",
      isManual: false, // track if user manually edited total
    });
    setSections(newSections);
  };

  const removeRow = (sectionIndex, rowIndex) => {
    const newSections = [...sections];
    newSections[sectionIndex].rows.splice(rowIndex, 1);
    setSections(newSections);
  };

  const updateRow = (sectionIndex, rowIndex, field, value) => {
    const newSections = [...sections];
    const row = newSections[sectionIndex].rows[rowIndex];
    row[field] = value;

    // Auto-calculate logic
    if (field === "weight" || field === "rate") {
      const w = parseFloat(row.weight) || 0;
      const r = parseFloat(row.rate) || 0;
      if (!row.isManual) {
        row.total = w * r > 0 ? w * r : "";
      }
    }

    // If user manually edits total, flag it so we don't overwrite it automatically (unless they clear it)
    if (field === "total") {
      row.isManual = true;
    }

    setSections(newSections);
  };

  const addSection = () => {
    setSections([...sections, { id: uuid(), title: "New Section", rows: [] }]);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (!client.config.project) {
        alert("Appwrite Project ID not set in .env.local");
        setIsSaving(false);
        return;
      }

      const promises = [];
      sections.forEach((section) => {
        section.rows.forEach((row) => {
          if (!row.commodityType && !row.weight) return; // Skip empty
          promises.push(
            databases.createDocument(
              APPWRITE_CONFIG.databaseId,
              APPWRITE_CONFIG.collectionId,
              ID.unique(),
              {
                commodityType: row.commodityType,
                weight: parseFloat(row.weight) || 0,
                rate: parseFloat(row.rate) || 0,
                total: parseFloat(row.total) || 0,
                section: section.title,
              },
            ),
          );
        });
      });

      await Promise.all(promises);
      alert("Saved successfully!");
    } catch (e) {
      console.error(e);
      alert("Error saving: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Grand Totals
  const totalWeight = sections.reduce(
    (acc, sec) =>
      acc + sec.rows.reduce((s, r) => s + (parseFloat(r.weight) || 0), 0),
    0,
  );
  const totalAmount = sections.reduce(
    (acc, sec) =>
      acc + sec.rows.reduce((s, r) => s + (parseFloat(r.total) || 0), 0),
    0,
  );
  const profitLoss = totalAmount - (parseFloat(purchaseAmount) || 0);

  return (
    <div className="mx-auto min-h-screen max-w-3xl bg-[#0f172a] pb-20">
      {/* Top Bar / Controls */}
      <div className="mb-6 flex items-center justify-between border-b border-gray-800 p-4">
        <h2 className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-xl font-bold text-transparent">
          Expense Slip
        </h2>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-blue-500"
          >
            {isSaving ? "Saving..." : "Save Data"}
          </button>
        </div>
      </div>

      {/* Main Slip Container */}
      <div className="mx-2 overflow-hidden rounded-xl border border-gray-800 bg-slate-900/50 shadow-2xl backdrop-blur-md md:mx-auto">
        {/* Purchase Amount Row */}
        <div className="flex items-center justify-between border-b border-gray-800 bg-gray-800/30 p-4">
          <span className="font-medium text-gray-400">Purchase Amount</span>
          <input
            type="number"
            placeholder="0.00"
            value={purchaseAmount}
            onChange={(e) => setPurchaseAmount(e.target.value)}
            className="w-40 bg-transparent text-right text-xl font-bold text-white outline-none placeholder:text-gray-600"
          />
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-12 gap-2 border-b border-gray-700 bg-gray-800/50 p-3 text-xs font-bold tracking-wider text-gray-400 uppercase">
          <div className="col-span-3">Grade</div>
          <div className="col-span-3 text-center">Weight</div>
          <div className="col-span-3 text-center">Rate</div>
          <div className="col-span-3 text-right">Total</div>
        </div>

        {/* Sections Map */}
        {sections.map((section, sIdx) => {
          const sectionWeight = section.rows.reduce(
            (sum, r) => sum + (parseFloat(r.weight) || 0),
            0,
          );
          const sectionTotal = section.rows.reduce(
            (sum, r) => sum + (parseFloat(r.total) || 0),
            0,
          );

          return (
            <div key={section.id} className="border-b border-gray-800">
              {/* Section Title Row */}
              <div className="flex items-center justify-between bg-gray-800/20 p-2">
                <input
                  value={section.title}
                  onChange={(e) => {
                    const newSec = [...sections];
                    newSec[sIdx].title = e.target.value;
                    setSections(newSec);
                  }}
                  className="w-full bg-transparent font-bold text-blue-400 outline-none"
                />
                <button
                  onClick={() => addRow(sIdx)}
                  className="rounded bg-gray-700 px-2 py-1 text-xs text-white hover:bg-gray-600"
                >
                  + Row
                </button>
              </div>

              {/* Rows */}
              {section.rows.map((row, rIdx) => (
                <div
                  key={row.id}
                  className="group relative grid grid-cols-12 items-center gap-2 border-b border-gray-800/50 p-2 transition-colors hover:bg-white/5"
                >
                  {/* Grade Select */}
                  <div className="relative col-span-3">
                    <select
                      className="w-full appearance-none bg-transparent py-1 text-sm font-medium text-gray-300 outline-none"
                      value={row.commodityType}
                      onChange={(e) =>
                        updateRow(sIdx, rIdx, "commodityType", e.target.value)
                      }
                    >
                      <option value="" className="bg-slate-800">
                        Select
                      </option>
                      {GRADES.map((g) => (
                        <option key={g} value={g} className="bg-slate-800">
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Weight */}
                  <div className="col-span-3">
                    <input
                      type="number"
                      placeholder="0"
                      value={row.weight}
                      onChange={(e) =>
                        updateRow(sIdx, rIdx, "weight", e.target.value)
                      }
                      className="w-full bg-transparent text-center text-gray-300 outline-none placeholder:text-gray-700"
                    />
                  </div>

                  {/* Rate */}
                  <div className="col-span-3">
                    <input
                      type="number"
                      placeholder="0"
                      value={row.rate}
                      onChange={(e) =>
                        updateRow(sIdx, rIdx, "rate", e.target.value)
                      }
                      className="w-full bg-transparent text-center text-gray-300 outline-none placeholder:text-gray-700"
                    />
                  </div>

                  {/* Total */}
                  <div className="col-span-3">
                    <input
                      type="number"
                      placeholder="0"
                      value={row.total}
                      onChange={(e) =>
                        updateRow(sIdx, rIdx, "total", e.target.value)
                      }
                      className="w-full bg-transparent text-right font-bold text-white outline-none placeholder:text-gray-700"
                    />
                  </div>

                  {/* Delete Row Hover Button */}
                  <button
                    onClick={() => removeRow(sIdx, rIdx)}
                    className="absolute top-0 right-0 bottom-0 flex w-6 items-center justify-center font-bold text-red-500 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-500/10"
                    title="Delete"
                  >
                    ×
                  </button>
                </div>
              ))}

              {/* Section Subtotal */}
              <div className="grid grid-cols-12 items-center gap-2 border-t border-blue-500/20 bg-blue-500/5 p-2 font-mono text-sm">
                <div className="col-span-3 text-xs font-bold text-blue-400 uppercase">
                  Subtotal
                </div>
                <div className="col-span-3 text-center text-blue-300">
                  {sectionWeight.toFixed(3)}
                </div>
                <div className="col-span-3"></div>
                <div className="col-span-3 text-right font-bold text-blue-300">
                  {sectionTotal.toLocaleString()}
                </div>
              </div>
            </div>
          );
        })}

        {/* Add Section Button */}
        <div className="p-4 text-center">
          <button
            onClick={addSection}
            className="text-sm text-gray-500 transition-colors hover:text-white"
          >
            + Add Another Group (Section)
          </button>
        </div>

        {/* Grand Totals Footer */}
        <div className="space-y-2 border-t-2 border-gray-700 bg-gray-800 p-4">
          <div className="flex justify-between text-sm text-gray-400">
            <span>Total Weight</span>
            <span>{totalWeight.toFixed(3)}</span>
          </div>
          <div className="flex items-end justify-between text-xl font-bold text-white">
            <span>Grand Total</span>
            <span className="text-2xl text-purple-400">
              {totalAmount.toLocaleString()}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-gray-700 pt-2 text-sm">
            <span
              className={profitLoss >= 0 ? "text-green-500" : "text-red-500"}
            >
              {profitLoss >= 0 ? "Profit" : "Loss"}
            </span>
            <span
              className={`text-lg font-bold ${profitLoss >= 0 ? "text-green-400" : "text-red-400"}`}
            >
              {Math.abs(profitLoss).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
