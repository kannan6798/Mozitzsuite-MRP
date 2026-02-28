import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface FindJobsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFind: (filters: JobFilters) => void;
  onNew: () => void;
}

export interface JobFilters {
  jobFrom: string;
  jobTo: string;
  type: string;
  assembly: string;
  scheduleGroup: string;
  buildSeqFrom: string;
  buildSeqTo: string;
  class: string;
  startDateFrom: string;
  startDateTo: string;
  completionDateFrom: string;
  completionDateTo: string;
  statusUnreleased: boolean;
  statusReleased: boolean;
  statusComplete: boolean;
  statusOnHold: boolean;
  statusDropdown: string;
}

const initialFilters: JobFilters = {
  jobFrom: "",
  jobTo: "",
  type: "",
  assembly: "",
  scheduleGroup: "",
  buildSeqFrom: "",
  buildSeqTo: "",
  class: "",
  startDateFrom: "",
  startDateTo: "",
  completionDateFrom: "",
  completionDateTo: "",
  statusUnreleased: false,
  statusReleased: false,
  statusComplete: false,
  statusOnHold: false,
  statusDropdown: "Closed",
};

const ErpLabel = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <label className={cn("text-xs font-medium text-gray-700 whitespace-nowrap", className)}>
    {children}
  </label>
);

const ErpInput = ({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    className={cn(
      "h-7 px-2 text-sm bg-white text-gray-900 border border-gray-300 focus:outline-none focus:border-blue-500",
      className
    )}
    {...props}
  />
);

export function FindJobsDialog({ open, onOpenChange, onFind, onNew }: FindJobsDialogProps) {
  const [filters, setFilters] = useState<JobFilters>(initialFilters);

  const handleClear = () => {
    setFilters(initialFilters);
  };

  const handleFind = () => {
    onFind(filters);
    onOpenChange(false);
  };

  const updateFilter = (key: keyof JobFilters, value: string | boolean) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[500px] p-0 bg-gray-100 border border-gray-400 gap-0">
        <DialogHeader className="bg-gray-300 px-3 py-2 border-b border-gray-400">
          <DialogTitle className="text-sm font-medium text-gray-800">
            Find Lot Based Jobs (M4)
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 space-y-4 bg-gray-100">
          {/* Main Fields */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ErpLabel className="w-28 text-right">Jobs</ErpLabel>
              <ErpInput
                value={filters.jobFrom}
                onChange={(e) => updateFilter("jobFrom", e.target.value)}
                className="w-24"
              />
              <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-xs bg-gray-200 border-gray-400 text-gray-700">...</Button>
              <span className="text-xs text-gray-700">-</span>
              <ErpInput
                value={filters.jobTo}
                onChange={(e) => updateFilter("jobTo", e.target.value)}
                className="w-24"
              />
            </div>

            <div className="flex items-center gap-2">
              <ErpLabel className="w-28 text-right">Type</ErpLabel>
              <select
                value={filters.type}
                onChange={(e) => updateFilter("type", e.target.value)}
                className="h-7 px-2 text-sm bg-white text-gray-900 border border-gray-300 focus:outline-none w-48"
              >
                <option value="">All</option>
                <option value="Standard">Standard</option>
                <option value="Non-Standard">Non-Standard</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <ErpLabel className="w-28 text-right">Assembly</ErpLabel>
              <ErpInput
                value={filters.assembly}
                onChange={(e) => updateFilter("assembly", e.target.value)}
                className="w-48"
              />
            </div>

            <div className="flex items-center gap-2">
              <ErpLabel className="w-28 text-right">Schedule Group</ErpLabel>
              <ErpInput
                value={filters.scheduleGroup}
                onChange={(e) => updateFilter("scheduleGroup", e.target.value)}
                className="w-48"
              />
            </div>

            <div className="flex items-center gap-2">
              <ErpLabel className="w-28 text-right">Build Seqs</ErpLabel>
              <ErpInput
                value={filters.buildSeqFrom}
                onChange={(e) => updateFilter("buildSeqFrom", e.target.value)}
                className="w-16"
              />
              <span className="text-xs text-gray-700">-</span>
              <ErpInput
                value={filters.buildSeqTo}
                onChange={(e) => updateFilter("buildSeqTo", e.target.value)}
                className="w-16"
              />
            </div>

            <div className="flex items-center gap-2">
              <ErpLabel className="w-28 text-right">Class</ErpLabel>
              <ErpInput
                value={filters.class}
                onChange={(e) => updateFilter("class", e.target.value)}
                className="w-24"
              />
            </div>

            <div className="flex items-center gap-2">
              <ErpLabel className="w-28 text-right">Start Dates</ErpLabel>
              <ErpInput
                type="date"
                value={filters.startDateFrom}
                onChange={(e) => updateFilter("startDateFrom", e.target.value)}
                className="w-32"
              />
              <span className="text-xs text-gray-700">-</span>
              <ErpInput
                type="date"
                value={filters.startDateTo}
                onChange={(e) => updateFilter("startDateTo", e.target.value)}
                className="w-32"
              />
            </div>

            <div className="flex items-center gap-2">
              <ErpLabel className="w-28 text-right">Completion Dates</ErpLabel>
              <ErpInput
                type="date"
                value={filters.completionDateFrom}
                onChange={(e) => updateFilter("completionDateFrom", e.target.value)}
                className="w-32"
              />
              <span className="text-xs text-gray-700">-</span>
              <ErpInput
                type="date"
                value={filters.completionDateTo}
                onChange={(e) => updateFilter("completionDateTo", e.target.value)}
                className="w-32"
              />
            </div>
          </div>

          {/* Status Section */}
          <fieldset className="border border-gray-400 p-3 bg-gray-100">
            <legend className="text-xs font-medium text-gray-700 px-1">Status</legend>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="unreleased"
                  checked={filters.statusUnreleased}
                  onCheckedChange={(checked) => updateFilter("statusUnreleased", checked as boolean)}
                />
                <label htmlFor="unreleased" className="text-xs text-gray-600">Unreleased</label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="released"
                  checked={filters.statusReleased}
                  onCheckedChange={(checked) => updateFilter("statusReleased", checked as boolean)}
                />
                <label htmlFor="released" className="text-xs text-gray-600">Released</label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="complete"
                  checked={filters.statusComplete}
                  onCheckedChange={(checked) => updateFilter("statusComplete", checked as boolean)}
                />
                <label htmlFor="complete" className="text-xs text-gray-600">Complete</label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="onhold"
                  checked={filters.statusOnHold}
                  onCheckedChange={(checked) => updateFilter("statusOnHold", checked as boolean)}
                />
                <label htmlFor="onhold" className="text-xs text-gray-600">On Hold</label>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <Checkbox id="statusDropdownCheck" />
              <select
                value={filters.statusDropdown}
                onChange={(e) => updateFilter("statusDropdown", e.target.value)}
                className="h-7 px-2 text-sm bg-white text-gray-900 border border-gray-300 focus:outline-none flex-1"
              >
                <option value="Closed">Closed</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
          </fieldset>
        </div>

        {/* Footer Buttons */}
        <div className="flex justify-center gap-2 p-4 border-t border-gray-400 bg-gray-200">
          <Button
            variant="outline"
            onClick={handleClear}
            className="h-8 px-6 text-sm bg-gray-100 hover:bg-gray-200 border-gray-400 text-gray-700"
          >
            Clear
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              onNew();
              onOpenChange(false);
            }}
            className="h-8 px-6 text-sm bg-gray-100 hover:bg-gray-200 border-gray-400 text-gray-700"
          >
            New (A)
          </Button>
          <Button
            onClick={handleFind}
            className="h-8 px-6 text-sm bg-blue-600 hover:bg-blue-700 text-white"
          >
            Find
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
