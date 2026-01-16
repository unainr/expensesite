"use client";
import { useState } from "react";
import { client, databases, APPWRITE_CONFIG } from "../lib/appwrite";
import { ID } from "appwrite";
import Script from "next/script";

const SECTIONS = ["(A+)", "(A)", "(B)", "2up/Tor"];
const TYPE_OPTIONS = ["3/16", "6/10", "10/20", "20/40", "40/60", "80/100"];

export default function DigitalReceipt() {
  const [form, setForm] = useState({
    section: "(A+)",
    itemDate: new Date().toISOString().split("T")[0],
    itemLabel: "",
    weight: "",
    rate: "",
    total: "",
  });

  const [items, setItems] = useState([]);
  const [purchaseAmount, setPurchaseAmount] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });
  const [html2pdfLoaded, setHtml2pdfLoaded] = useState(false);

  // --- LOGIC SAME AS BEFORE ---
  const handleFormChange = (field, value) => {
    const newForm = { ...form, [field]: value };
    const getNum = (val) =>
      val === "" || isNaN(parseFloat(val)) ? null : parseFloat(val);
    const isNumeric = (str) => !isNaN(str) && !isNaN(parseFloat(str));

    // Determine Mode
    const typeIsQty = isNumeric(form.itemLabel); // "4"
    const currentQty = typeIsQty ? parseFloat(form.itemLabel) : 0;

    // Auto-Link Weight -> Rate if in "Piece Mode"
    if (field === "weight" && typeIsQty && value !== "") {
      newForm.rate = value; // Mirror Weight input to Rate
    }

    // Recalculate based on updated form values
    const w = field === "weight" ? getNum(value) : getNum(newForm.weight); // Use newForm to get updated weight/rate sync
    const r = field === "rate" ? getNum(value) : getNum(newForm.rate);
    const t = field === "total" ? getNum(value) : getNum(form.total);

    // Forward Calc
    if (field === "weight" || field === "rate" || field === "itemLabel") {
      // Re-check Qty based on new itemLabel if that field changed
      const updatedTypeIsQty = isNumeric(newForm.itemLabel);
      const updatedQty = updatedTypeIsQty ? parseFloat(newForm.itemLabel) : 0;

      if (updatedTypeIsQty && updatedQty && newForm.rate) {
        // Piece Mode: Total = Pieces * Rate
        newForm.total = updatedQty * parseFloat(newForm.rate);
      } else if (w !== null && r !== null) {
        // Weight Mode: Total = Weight * Rate
        newForm.total = w * r;
      } else {
        newForm.total = "";
      }
    }

    // Reverse Calc
    if (field === "total") {
      const activeMultiplier = typeIsQty ? currentQty : w;
      if (t !== null && activeMultiplier) {
        newForm.rate = t / activeMultiplier;
        // If in piece mode, should we update weight (which acts as rate input)?
        if (typeIsQty) newForm.weight = newForm.rate;
      }
    }

    setForm(newForm);
  };

  const addItem = () => {
    const isNumeric = (str) => !isNaN(str) && !isNaN(parseFloat(str));
    const typeIsQty = isNumeric(form.itemLabel);

    // If Type is Qty (e.g. "4"), effective Weight for the *Record* is 0 (or we track pieces separately?).
    // Usually for receipts, you don't sum "4 pieces" into the "Weight" column total.
    const recordWeight = typeIsQty ? 0 : parseFloat(form.weight) || 0;

    const newItem = {
      id: Math.random().toString(36).substr(2, 9),
      section: form.section,
      itemDate: form.itemDate,
      commodityType: form.itemLabel,
      weight: recordWeight,
      rate: parseFloat(form.rate) || 0,
      total: parseFloat(form.total) || 0,
    };
    const newItems = [...items, newItem].sort((a, b) => {
      const idxA = SECTIONS.indexOf(a.section);
      const idxB = SECTIONS.indexOf(b.section);
      if (idxA === idxB) return 0;
      return idxA - idxB;
    });
    setItems(newItems);
    setForm({ ...form, itemLabel: "", weight: "", rate: "", total: "" });
  };

  const removeItem = (id) => {
    setItems(items.filter((i) => i.id !== id));
  };

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ ...toast, show: false }), 3000);
  };

  const handleSave = async () => {
    if (items.length === 0) return;
    setIsSaving(true);
    try {
      if (!client.config.project) {
        showToast("Appwrite Setup Missing", "error");
        setIsSaving(false);
        return;
      }
      const promises = items.map((item) =>
        databases.createDocument(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.collectionId,
          ID.unique(),
          {
            commodityType: `${item.itemDate} - ${item.commodityType}`,
            weight: item.weight,
            rate: item.rate,
            total: item.total,
            section: item.section,
            name: customerName || "Unknown",
          },
        ),
      );
      await Promise.all(promises);
      showToast("Records Saved Successfully!");
    } catch (e) {
      console.error(e);
      showToast("Error: " + e.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportExcel = () => {
    const headers = [
      "No",
      "Sizes",
      "Section",
      "Weight",
      "Rate",
      "Amount",
      "Customer Name",
    ];
    let counter = 1;
    const csv = items
      .map((item) => [
        counter++,
        item.commodityType,
        item.section,
        item.weight,
        item.rate,
        item.total,
        customerName,
      ])
      .map((e) => e.join(","))
      .join("\n");
    const blob = new Blob([[headers.join(","), csv].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Receipt_${customerName || "Export"}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Excel/CSV Downloaded!");
  };

  const handleDownloadPdf = async () => {
    if (!html2pdfLoaded) {
      showToast("PDF Library loading...", "error");
      return;
    }
    setIsGeneratingPdf(true);
    try {
      const element = document.getElementById("receipt-element");
      const opt = {
        margin: 10,
        filename: `Receipt_${customerName || "Export"}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      };
      await window.html2pdf().set(opt).from(element).save();
      showToast("PDF Downloaded!");
    } catch (e) {
      console.error(e);
      showToast("PDF Error: " + e.message, "error");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
  const totalAmount = items.reduce((sum, i) => sum + i.total, 0);
  const profitLoss = totalAmount - (parseFloat(purchaseAmount) || 0);
  const groupedItems = SECTIONS.map((sec) => ({
    title: sec,
    rows: items.filter((i) => i.section === sec),
  })).filter((g) => g.rows.length > 0);

  // Replaced formatDate with just a pass-through or unused
  // const formatDate = (dateStr) => ... (Removed/Unused)

  // INLINE STYLES FOR PDF SAFETY
  const styles = {
    container: {
      backgroundColor: "#ffffff",
      color: "#000000",
      fontFamily: "monospace",
      padding: "20px",
      minHeight: "800px",
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      borderBottom: "2px solid #000000",
      paddingBottom: "20px",
      marginBottom: "20px",
    },
    headerTitle: {
      fontSize: "24px",
      fontWeight: "bold",
      color: "#000000",
      margin: 0,
    },
    headerSub: { fontSize: "14px", color: "#555555", marginTop: "5px" },
    headerTotalLabel: {
      fontSize: "12px",
      textTransform: "uppercase",
      fontWeight: "bold",
      color: "#555555",
      textAlign: "right",
    },
    headerTotalValue: {
      fontSize: "32px",
      fontWeight: "bold",
      color: "#000000",
      textAlign: "right",
      lineHeight: 1,
    },

    tableHeader: {
      display: "flex",
      borderBottom: "2px solid #000000",
      paddingBottom: "5px",
      marginBottom: "10px",
      fontWeight: "bold",
      fontSize: "12px",
      textTransform: "uppercase",
    },
    row: {
      display: "flex",
      padding: "8px 0",
      borderBottom: "1px solid #eeeeee",
      alignItems: "center",
    },

    sectionTitle: {
      fontSize: "16px",
      fontWeight: "bold",
      borderBottom: "1px solid #cccccc",
      padding: "5px 0",
      marginTop: "15px",
      color: "#000000",
    },
    sectionSummary: {
      display: "flex",
      justifyContent: "space-between",
      borderTop: "2px solid #000000",
      marginTop: "5px",
      paddingTop: "5px",
      fontWeight: "bold",
    },

    grandTotal: {
      marginTop: "30px",
      borderTop: "4px solid #000000",
      paddingTop: "15px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-end",
    },
    profitSection: {
      marginTop: "20px",
      borderTop: "1px dotted #999999",
      paddingTop: "15px",
      display: "flex",
      justifyContent: "space-between",
    },
  };

  return (
    <div className="flex min-h-screen flex-col gap-8 bg-[#0f172a] p-4 text-white md:flex-row md:p-8">
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"
        onLoad={() => setHtml2pdfLoaded(true)}
      />
      {toast.show && (
        <div
          className={`fixed top-5 left-1/2 z-50 flex -translate-x-1/2 transform items-center gap-3 rounded-full px-6 py-3 shadow-2xl ${toast.type === "error" ? "bg-red-500" : "bg-green-600"}`}
        >
          <span className="font-bold">{toast.message}</span>
        </div>
      )}

      {/* FORM ENTRY */}
      <div className="no-print w-full space-y-6 md:w-1/3">
        {/* Settings */}
        <div className="glass-panel rounded-2xl p-6">
          <h2 className="mb-4 text-xl font-bold text-cyan-400">Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">
                Customer Name
              </label>
              <input
                type="text"
                className="glass-input w-full rounded-lg p-3 outline-none focus:border-cyan-500"
                placeholder="Name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>
          </div>
        </div>
        {/* Entry */}
        <div className="glass-panel rounded-2xl p-6">
          <h2 className="mb-4 text-xl font-bold text-cyan-400">New Entry</h2>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">
                Section
              </label>
              <select
                className="glass-input w-full rounded-lg p-3 outline-none focus:border-cyan-500"
                value={form.section}
                onChange={(e) => handleFormChange("section", e.target.value)}
              >
                {SECTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Removed Date Input from UI as per 'remove the create it data type' request */}

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">
               SIZES
              </label>
              <input
                list="type-options"
                type="text"
                className="glass-input w-full rounded-lg p-3 outline-none focus:border-cyan-500"
                placeholder="Select or Type..."
                value={form.itemLabel}
                onChange={(e) => handleFormChange("itemLabel", e.target.value)}
              />
              <datalist id="type-options">
                {TYPE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt} />
                ))}
              </datalist>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">
                  Weight
                </label>
                <input
                  type="number"
                  className="glass-input w-full rounded-lg p-3 outline-none focus:border-cyan-500"
                  placeholder="0"
                  value={form.weight}
                  onChange={(e) => handleFormChange("weight", e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">
                  Rate
                </label>
                <input
                  type="number"
                  className="glass-input w-full rounded-lg p-3 outline-none focus:border-cyan-500"
                  placeholder="0"
                  value={form.rate}
                  onChange={(e) => handleFormChange("rate", e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">
                Amount
              </label>
              <input
                type="number"
                className="glass-input w-full rounded-lg p-3 pr-4 text-right text-lg font-bold outline-none focus:border-purple-500"
                placeholder="0.00"
                value={form.total}
                onChange={(e) => handleFormChange("total", e.target.value)}
              />
            </div>
          </div>
          <button
            onClick={addItem}
            className="mt-4 w-full rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 py-3 font-bold text-white shadow-lg hover:from-cyan-500 hover:to-blue-500"
          >
            Add Row
          </button>
        </div>
        <div className="glass-panel rounded-2xl p-6">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">
              Purchase
            </label>
            <input
              type="number"
              className="w-full border-b border-slate-600 bg-transparent py-2 text-xl font-bold text-white outline-none focus:border-cyan-500"
              placeholder="0"
              value={purchaseAmount}
              onChange={(e) => setPurchaseAmount(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* RECEIPT VIEW */}
      <div className="print-container relative w-full overflow-hidden rounded-lg bg-white text-black md:w-2/3">
        {/* PRINTABLE AREA: Pure Inline Styles */}
        <div id="receipt-element" style={styles.container}>
          {/* Header */}
          <div style={styles.header}>
            <div>
              <h1 style={styles.headerTitle}>
                {customerName || "Customer Receipt"}
              </h1>
              <div style={styles.headerSub}>
                {new Date().toLocaleDateString("en-GB")}
              </div>
            </div>
            <div>
              <div style={styles.headerTotalLabel}>Total</div>
              <div style={styles.headerTotalValue}>
                {totalAmount.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Table Header */}
          <div style={styles.tableHeader}>
            <div style={{ width: "10%" }}>NO.</div>
            <div style={{ width: "30%" }}>SIZES</div>
            <div style={{ width: "20%", textAlign: "center" }}>WEIGHT</div>
            <div style={{ width: "20%", textAlign: "center" }}>RATE</div>
            <div style={{ width: "20%", textAlign: "right" }}>AMOUNT</div>
          </div>

          {/* Items */}
          {groupedItems.map((group) => {
            const groupWeight = group.rows.reduce((s, r) => s + r.weight, 0);
            const groupTotal = group.rows.reduce((s, r) => s + r.total, 0);
            return (
              <div key={group.title} style={{ marginBottom: "20px" }}>
                <div style={styles.sectionTitle}>{group.title}</div>
                {group.rows.map((item, idx) => (
                  <div key={item.id} style={styles.row}>
                    <div
                      style={{ width: "10%", fontSize: "12px", color: "#555" }}
                    >
                      {idx + 1}
                    </div>
                    <div style={{ width: "30%", fontWeight: "500" }}>
                      {item.commodityType}
                    </div>
                    <div style={{ width: "20%", textAlign: "center" }}>
                      {item.weight > 0 ? item.weight : "-"}
                    </div>
                    <div style={{ width: "20%", textAlign: "center" }}>
                      {item.rate || "-"}
                    </div>
                    <div
                      style={{
                        width: "20%",
                        textAlign: "right",
                        fontWeight: "bold",
                      }}
                    >
                      {item.total.toLocaleString()}
                    </div>
                  </div>
                ))}
                <div style={styles.sectionSummary}>
                  <div
                    style={{
                      width: "40%",
                      textAlign: "right",
                      paddingRight: "10px",
                    }}
                  >
                    TOTAL
                  </div>
                  <div style={{ width: "20%", textAlign: "center" }}>
                    {groupWeight > 0 ? groupWeight.toFixed(3) : ""}
                  </div>
                  <div style={{ width: "20%" }}></div>
                  <div
                    style={{
                      width: "20%",
                      textAlign: "right",
                      fontSize: "18px",
                    }}
                  >
                    {groupTotal.toLocaleString()}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Grand Total */}
          {items.length > 0 && (
            <div style={styles.grandTotal}>
              <div style={{ fontSize: "20px", fontWeight: "bold" }}>
                TOTAL SLIP
              </div>
              <div style={{ textAlign: "right" }}>
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: "bold",
                    color: "#555",
                    marginRight: "20px",
                  }}
                >
                  Wt: {totalWeight.toFixed(3)}
                </span>
                <span style={{ fontSize: "36px", fontWeight: "bold" }}>
                  {totalAmount.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {/* Profit Loss */}
          {purchaseAmount && (
            <div style={styles.profitSection}>
              <div>
                <div
                  style={{
                    fontSize: "10px",
                    textTransform: "uppercase",
                    color: "#555",
                  }}
                >
                  Purchase
                </div>
                <div style={{ fontSize: "20px", fontWeight: "bold" }}>
                  {parseFloat(purchaseAmount).toLocaleString()}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontSize: "10px",
                    textTransform: "uppercase",
                    color: "#555",
                  }}
                >
                  Profit / Loss
                </div>
                <div
                  style={{
                    fontSize: "28px",
                    fontWeight: "bold",
                    color: profitLoss >= 0 ? "green" : "red",
                  }}
                >
                  {profitLoss >= 0 ? "+" : ""}
                  {profitLoss.toLocaleString()}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="no-print flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 p-4">
          <div className="flex gap-2">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 rounded border border-green-200 px-3 py-2 text-sm font-bold text-green-700 hover:bg-green-50 hover:text-green-900"
            >
              Excel
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={!html2pdfLoaded || isGeneratingPdf}
              className={`flex items-center gap-2 rounded border border-red-200 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-50 hover:text-red-900 ${isGeneratingPdf ? "opacity-50" : ""}`}
            >
              {isGeneratingPdf ? "Wait..." : "PDF"}
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 rounded px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              Print
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || items.length === 0}
              className="rounded bg-slate-900 px-6 py-3 text-sm font-bold text-white hover:bg-slate-700"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
