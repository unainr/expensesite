"use client";
import { useState } from "react";
import ExpenseSection from "./ExpenseSection";
import { client, databases, APPWRITE_CONFIG } from "../lib/appwrite";
import { ID } from "appwrite";

export default function Calculator() {
  const [sections, setSections] = useState({
    "Group A+": [],
    "Group A": [],
    "2up/Tor": [], // Based on image headers
  });

  const [purchaseAmount, setPurchaseAmount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // Helper to generate unique ID
  const uuid = () => Math.random().toString(36).substr(2, 9);

  const addRow = (sectionKey) => {
    setSections((prev) => ({
      ...prev,
      [sectionKey]: [
        ...prev[sectionKey],
        { id: uuid(), commodityType: "", weight: "", rate: "", total: 0 },
      ],
    }));
  };

  const updateRow = (sectionKey, rowId, newData) => {
    setSections((prev) => ({
      ...prev,
      [sectionKey]: prev[sectionKey].map((row) =>
        row.id === rowId ? newData : row,
      ),
    }));
  };

  const deleteRow = (sectionKey, rowId) => {
    setSections((prev) => ({
      ...prev,
      [sectionKey]: prev[sectionKey].filter((row) => row.id !== rowId),
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (!client.config.project) {
        alert("Appwrite Project ID not detected. Please check your .env file.");
        setIsSaving(false);
        return;
      }

      const allRows = [];
      Object.keys(sections).forEach((section) => {
        sections[section].forEach((row) => {
          allRows.push({
            ...row,
            section,
            weight: parseFloat(row.weight) || 0,
            rate: parseFloat(row.rate) || 0,
            total: parseFloat(row.total) || 0,
          });
        });
      });

      // Create all documents in parallel
      // Removing imageUrl from payload
      const promises = allRows.map((row) =>
        databases.createDocument(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.collectionId,
          ID.unique(),
          {
            commodityType: row.commodityType,
            weight: row.weight,
            rate: row.rate,
            total: row.total,
            section: row.section,
          },
        ),
      );

      await Promise.all(promises);
      alert("Successfully saved all records to Appwrite!");
    } catch (error) {
      console.error("Save failed", error);
      alert("Failed to save data: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Global Totals
  const grandTotal = Object.values(sections)
    .flat()
    .reduce((sum, row) => sum + (parseFloat(row.total) || 0), 0);
  const totalWeight = Object.values(sections)
    .flat()
    .reduce((sum, row) => sum + (parseFloat(row.weight) || 0), 0);
  const profitLoss = grandTotal - purchaseAmount;

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-32">
      {/* Header Stats */}
      <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="glass-panel relative overflow-hidden rounded-2xl p-6">
          <div className="relative z-10">
            <div className="mb-1 text-sm font-medium text-slate-400">
              Total Weight
            </div>
            <div className="text-3xl font-bold text-white">
              {totalWeight.toFixed(3)}{" "}
              <span className="text-lg opacity-50">units</span>
            </div>
          </div>
          <div className="absolute top-0 right-0 -mt-10 -mr-10 h-32 w-32 rounded-full bg-cyan-500/10 blur-3xl"></div>
        </div>

        <div className="glass-panel relative overflow-hidden rounded-2xl p-6">
          <div className="relative z-10">
            <div className="mb-1 text-sm font-medium text-slate-400">
              Purchase Amount
            </div>
            <input
              type="number"
              value={purchaseAmount}
              onChange={(e) =>
                setPurchaseAmount(parseFloat(e.target.value) || 0)
              }
              className="w-full border-b border-white/10 bg-transparent text-3xl font-bold text-white transition-all outline-none placeholder:text-white/20 focus:border-cyan-500"
              placeholder="0.00"
            />
          </div>
          <div className="absolute top-0 right-0 -mt-10 -mr-10 h-32 w-32 rounded-full bg-purple-500/10 blur-3xl"></div>
        </div>

        <div
          className={`glass-panel relative overflow-hidden rounded-2xl border-t-4 p-6 ${profitLoss >= 0 ? "border-t-green-500" : "border-t-red-500"}`}
        >
          <div className="relative z-10">
            <div className="mb-1 text-sm font-medium text-slate-400">
              Profit / Loss
            </div>
            <div
              className={`text-3xl font-bold ${profitLoss >= 0 ? "text-green-400" : "text-red-400"}`}
            >
              {profitLoss >= 0 ? "+" : ""}
              {profitLoss.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div
            className={`absolute top-0 right-0 -mt-10 -mr-10 h-32 w-32 rounded-full blur-3xl ${profitLoss >= 0 ? "bg-green-500/10" : "bg-red-500/10"}`}
          ></div>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-6">
        {Object.keys(sections).map((key) => (
          <ExpenseSection
            key={key}
            title={key}
            rows={sections[key]}
            onRowChange={updateRow}
            onRowDelete={deleteRow}
            onAddRow={addRow}
          />
        ))}
      </div>

      {/* Footer Totals & Save */}
      <div className="glass-panel fixed right-0 bottom-0 left-0 z-50 border-t border-white/10 bg-[#0f172a]/80 p-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="hidden text-right sm:block">
              <span className="block text-xs tracking-widest text-slate-400 uppercase">
                Net Payable
              </span>
              <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-2xl font-bold text-transparent">
                {grandTotal.toLocaleString("en-US", {
                  style: "currency",
                  currency: "USD",
                })}
              </span>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              disabled={isSaving}
              onClick={handleSave}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-8 py-3 font-bold text-white shadow-lg shadow-purple-500/25 transition-all hover:scale-105 hover:from-indigo-400 hover:to-purple-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <svg
                    className="h-5 w-5 animate-spin text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Saving...
                </>
              ) : (
                <>
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
                      d="M16.5 3.75V16.5L12 14.25 7.5 16.5V3.75m9 0H18A2.25 2.25 0 0 1 20.25 6v12A2.25 2.25 0 0 1 18 20.25H6A2.25 2.25 0 0 1 3.75 18V6A2.25 2.25 0 0 1 6 3.75h1.5m9 0h-9"
                    />
                  </svg>
                  Save Records
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
