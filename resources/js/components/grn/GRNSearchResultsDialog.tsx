import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface GRNSearchResultsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grns: any[];
  onOpen?: (grn: any) => void;
  onPrint?: (grn: any) => void;
  onPrintAll?: (grns: any[]) => void;
}

export function GRNSearchResultsDialog({
  open,
  onOpenChange,
  grns,
  onOpen,
  onPrint,
  onPrintAll,
}: GRNSearchResultsDialogProps) {
  const [selectedGrnId, setSelectedGrnId] = useState<string | null>(null);

  const handleRowClick = (grnId: string) => {
    setSelectedGrnId(grnId);
  };

  const handleDoubleClick = (grn: any) => {
    onOpen?.(grn);
  };

  const selectedGrn = grns.find((grn) => grn.id === selectedGrnId);

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString();
  };

  const handlePrintAll = () => {
    if (grns.length === 0) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const generateGRNHtml = (grn: any) => {
      const acceptedItems = grn.grn_items?.filter(
        (item: any) => Number(item.accepted_quantity) > 0
      ) || [];

      const totalAmount = acceptedItems.reduce(
        (sum: number, item: any) => sum + (Number(item.accepted_quantity) * Number(item.unit_price)),
        0
      );

      return `
        <div class="grn-page">
          <div class="header">
            <h1>YOUR COMPANY NAME</h1>
            <h2>GOODS RECEIPT NOTE</h2>
          </div>
          
          <div class="info-grid">
            <div class="info-left">
              <div class="info-row">
                <span class="info-label">Vendor</span>
                <span class="info-value">${grn.vendor || ""}</span>
              </div>
              <div class="info-row">
                <span class="info-label">PO Number</span>
                <span class="info-value">${grn.po_number || ""}</span>
              </div>
            </div>
            <div class="info-right">
              <div class="info-row">
                <span class="info-label">GRN/Receipt No</span>
                <span class="info-value">${grn.grn_number || ""}</span>
              </div>
              <div class="info-row">
                <span class="info-label">GRN/Receipt Date</span>
                <span class="info-value">${grn.receipt_date ? format(new Date(grn.receipt_date), "dd-MMM-yy").toUpperCase() : ""}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Creation Date</span>
                <span class="info-value">${grn.created_at ? format(new Date(grn.created_at), "dd-MMM-yy").toUpperCase() : ""}</span>
              </div>
            </div>
          </div>
          
          <table class="items-table">
            <thead>
              <tr>
                <th>LPO No.</th>
                <th>Item Description</th>
                <th class="right">Qty</th>
                <th>Unit</th>
                <th class="right">Rate</th>
                <th class="right">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${acceptedItems.map((item: any) => `
                <tr>
                  <td>${grn.po_number || ""}</td>
                  <td>${item.item_code} - ${item.description || ""}</td>
                  <td class="right">${Number(item.accepted_quantity).toFixed(0)}</td>
                  <td>Each</td>
                  <td class="right">${Number(item.unit_price).toFixed(2)}</td>
                  <td class="right">${(Number(item.accepted_quantity) * Number(item.unit_price)).toFixed(2)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          
          <div class="total-row">
            <span class="total-label">Total GRN Amount</span>
            <span>${totalAmount.toFixed(2)}</span>
          </div>
          
          <div class="signature-section">
            <div class="signature-line">Approved by</div>
          </div>
        </div>
      `;
    };

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>GRN Receipts - All</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Courier New', monospace;
              padding: 20px;
              font-size: 12px;
              line-height: 1.4;
            }
            .grn-page {
              page-break-after: always;
              margin-bottom: 40px;
            }
            .grn-page:last-child {
              page-break-after: auto;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
            }
            .header h1 {
              font-size: 14px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .header h2 {
              font-size: 13px;
              font-weight: bold;
              margin-bottom: 15px;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 0;
              margin-bottom: 20px;
            }
            .info-left, .info-right {
              padding: 2px 0;
            }
            .info-row {
              display: flex;
              margin-bottom: 2px;
            }
            .info-label {
              min-width: 140px;
            }
            .info-value {
              font-weight: normal;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 15px;
            }
            .items-table th,
            .items-table td {
              border-top: 1px dashed #000;
              border-bottom: 1px dashed #000;
              padding: 5px 8px;
              text-align: left;
            }
            .items-table th {
              font-weight: bold;
              background: transparent;
            }
            .items-table td.right,
            .items-table th.right {
              text-align: right;
            }
            .total-row {
              border-top: 1px dashed #000;
              padding: 10px 8px;
              text-align: right;
              font-weight: bold;
            }
            .total-label {
              display: inline-block;
              min-width: 120px;
              text-align: right;
              margin-right: 20px;
            }
            .signature-section {
              margin-top: 60px;
              text-align: center;
            }
            .signature-line {
              border-top: 1px solid #000;
              width: 200px;
              margin: 0 auto;
              padding-top: 5px;
            }
            @media print {
              body {
                padding: 10px;
              }
            }
          </style>
        </head>
        <body>
          ${grns.map(grn => generateGRNHtml(grn)).join("")}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[900px] min-h-[500px] p-0 bg-[#d4d0c8] border border-[#808080] gap-0 shadow-[inset_1px_1px_0_#ffffff,inset_-1px_-1px_0_#404040]">
        {/* Windows Classic Style Header */}
        <DialogHeader className="bg-gradient-to-r from-[#000080] to-[#1084d0] px-2 py-1 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#d4d0c8] border border-[#808080] flex items-center justify-center">
              <span className="text-[10px]">📋</span>
            </div>
            <DialogTitle className="text-sm font-normal text-white">
              Goods Receipt Notes - Search Results
            </DialogTitle>
          </div>
          <div className="flex items-center gap-[2px]">
            <button className="w-[18px] h-[18px] bg-[#d4d0c8] border border-[#ffffff] border-r-[#404040] border-b-[#404040] flex items-center justify-center text-xs font-bold hover:bg-[#c0c0c0] active:border-[#404040] active:border-l-[#808080] active:border-t-[#808080]">
              _
            </button>
            <button className="w-[18px] h-[18px] bg-[#d4d0c8] border border-[#ffffff] border-r-[#404040] border-b-[#404040] flex items-center justify-center text-xs font-bold hover:bg-[#c0c0c0] active:border-[#404040] active:border-l-[#808080] active:border-t-[#808080]">
              □
            </button>
            <button 
              onClick={() => onOpenChange(false)}
              className="w-[18px] h-[18px] bg-[#d4d0c8] border border-[#ffffff] border-r-[#404040] border-b-[#404040] flex items-center justify-center text-xs font-bold hover:bg-[#c0c0c0] active:border-[#404040] active:border-l-[#808080] active:border-t-[#808080]"
            >
              ×
            </button>
          </div>
        </DialogHeader>

        <div className="p-2 bg-[#d4d0c8] flex-1">
          {/* Toolbar */}
          <div className="flex items-center gap-1 mb-2 pb-1 border-b border-[#808080]">
            <button className="w-6 h-6 bg-[#d4d0c8] border border-[#ffffff] border-r-[#404040] border-b-[#404040] flex items-center justify-center text-xs hover:bg-[#c0c0c0]">
              📋
            </button>
          </div>

          {/* Results Table */}
          <div className="border-2 border-[#808080] border-t-[#404040] border-l-[#404040] bg-white max-h-[350px] overflow-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-[#d4d0c8]">
                  <th className="w-6 px-1 py-1 text-left font-normal text-black border-r border-b border-[#808080]"></th>
                  <th className="w-32 px-2 py-1 text-left font-normal text-black border-r border-b border-[#808080]">GRN Number</th>
                  <th className="w-28 px-2 py-1 text-left font-normal text-black border-r border-b border-[#808080]">Receipt Date</th>
                  <th className="w-32 px-2 py-1 text-left font-normal text-black border-r border-b border-[#808080]">PO Number</th>
                  <th className="w-40 px-2 py-1 text-left font-normal text-black border-r border-b border-[#808080]">Vendor</th>
                  <th className="px-2 py-1 text-left font-normal text-black border-b border-[#808080]">QC Status</th>
                </tr>
              </thead>
              <tbody>
                {grns.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[#808080]">
                      No GRNs found matching your criteria
                    </td>
                  </tr>
                ) : (
                  grns.map((grn) => (
                    <tr
                      key={grn.id}
                      onClick={() => handleRowClick(grn.id)}
                      onDoubleClick={() => handleDoubleClick(grn)}
                      className={cn(
                        "cursor-pointer border-b border-[#d4d0c8]",
                        selectedGrnId === grn.id 
                          ? "bg-[#000080] text-white" 
                          : "hover:bg-[#d4d0c8]"
                      )}
                    >
                      <td className="w-6 px-1 py-1 border-r border-[#d4d0c8]">
                        {selectedGrnId === grn.id && (
                          <div className="w-0 h-0 border-t-4 border-t-transparent border-b-4 border-b-transparent border-l-6 border-l-current ml-1"></div>
                        )}
                      </td>
                      <td className="px-2 py-1 border-r border-[#d4d0c8] font-normal">{grn.grn_number || ""}</td>
                      <td className="px-2 py-1 border-r border-[#d4d0c8]">{formatDate(grn.receipt_date)}</td>
                      <td className="px-2 py-1 border-r border-[#d4d0c8]">{grn.po_number || ""}</td>
                      <td className="px-2 py-1 border-r border-[#d4d0c8]">{grn.vendor || ""}</td>
                      <td className="px-2 py-1">
                        <span className={cn(
                          selectedGrnId === grn.id ? "" : (
                            grn.qc_status === "Accepted" ? "text-green-600" :
                            grn.qc_status === "Rejected" ? "text-red-600" :
                            grn.qc_status === "Partially Accepted" ? "text-yellow-600" :
                            "text-gray-600"
                          )
                        )}>
                          {grn.qc_status || "Pending"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Horizontal scrollbar placeholder */}
          <div className="flex items-center mt-1">
            <div className="flex-1 h-4 bg-[#d4d0c8] border border-[#808080] border-t-[#404040] border-l-[#404040]">
              <div className="h-full w-24 bg-[#d4d0c8] border border-[#ffffff] border-r-[#404040] border-b-[#404040]"></div>
            </div>
          </div>

          {/* Results count */}
          <div className="mt-2 text-xs text-gray-600">
            {grns.length} record(s) found
          </div>
        </div>

        {/* Footer Buttons - Windows Classic Style */}
        <div className="flex justify-center gap-3 p-3 bg-[#d4d0c8] border-t border-[#ffffff]">
          <Button
            variant="outline"
            onClick={handlePrintAll}
            disabled={grns.length === 0}
            className="h-7 px-4 text-xs bg-[#d4d0c8] hover:bg-[#c0c0c0] border-2 border-[#ffffff] border-r-[#404040] border-b-[#404040] text-black rounded-none disabled:opacity-50 disabled:cursor-not-allowed active:border-[#404040] active:border-l-[#808080] active:border-t-[#808080]"
          >
            Print All
          </Button>
          <Button
            variant="outline"
            onClick={() => selectedGrn && onPrint?.(selectedGrn)}
            disabled={!selectedGrn}
            className="h-7 px-4 text-xs bg-[#d4d0c8] hover:bg-[#c0c0c0] border-2 border-[#ffffff] border-r-[#404040] border-b-[#404040] text-black rounded-none disabled:opacity-50 disabled:cursor-not-allowed active:border-[#404040] active:border-l-[#808080] active:border-t-[#808080]"
          >
            Print
          </Button>
          <Button
            onClick={() => selectedGrn && onOpen?.(selectedGrn)}
            disabled={!selectedGrn}
            className="h-7 px-6 text-xs bg-[#d4d0c8] hover:bg-[#c0c0c0] border-2 border-[#ffffff] border-r-[#404040] border-b-[#404040] text-black rounded-none disabled:opacity-50 disabled:cursor-not-allowed active:border-[#404040] active:border-l-[#808080] active:border-t-[#808080]"
          >
            Open
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-7 px-4 text-xs bg-[#d4d0c8] hover:bg-[#c0c0c0] border-2 border-[#ffffff] border-r-[#404040] border-b-[#404040] text-black rounded-none active:border-[#404040] active:border-l-[#808080] active:border-t-[#808080]"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
