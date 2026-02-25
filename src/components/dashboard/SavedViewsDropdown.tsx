import SavedViewsDropdown from "@/components/SavedViewsDropdown";
import type { FilterState } from "@/components/SavedViewsDropdown";
import { useNavigate } from "react-router-dom";

/** Dashboard-specific wrapper that translates saved view filters into navigation */
export default function DashboardSavedViewsDropdown() {
  const navigate = useNavigate();

  const handleApplyFilters = (filters: FilterState) => {
    const params = new URLSearchParams();
    if (filters.tier) params.set("tier", filters.tier);
    if (filters.status && filters.status !== "all") params.set("filter", filters.status);
    navigate(`/entities?${params.toString()}`);
  };

  return (
    <SavedViewsDropdown
      pageType="entities"
      currentFilters={{}}
      onApplyFilters={handleApplyFilters}
    />
  );
}
