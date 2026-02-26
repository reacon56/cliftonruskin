import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Officer { id: string; name: string }
interface Org { id: string; name: string }

interface Props {
  orgs: Org[];
  officers: Officer[];
  selectedOrg: string;
  selectedOfficer: string;
  selectedStatus: string;
  selectedPriority: string;
  onOrgChange: (v: string) => void;
  onOfficerChange: (v: string) => void;
  onStatusChange: (v: string) => void;
  onPriorityChange: (v: string) => void;
}

export default function WorkloadFilters({
  orgs, officers, selectedOrg, selectedOfficer,
  selectedStatus, selectedPriority,
  onOrgChange, onOfficerChange, onStatusChange, onPriorityChange,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={selectedOrg} onValueChange={onOrgChange}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="All Clients" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Clients</SelectItem>
          {orgs.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={selectedOfficer} onValueChange={onOfficerChange}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="All Officers" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Officers</SelectItem>
          {officers.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={selectedStatus} onValueChange={onStatusChange}>
        <SelectTrigger className="w-36">
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="todo">To Do</SelectItem>
          <SelectItem value="in_progress">In Progress</SelectItem>
          <SelectItem value="blocked">Blocked</SelectItem>
          <SelectItem value="done">Done</SelectItem>
        </SelectContent>
      </Select>

      <Select value={selectedPriority} onValueChange={onPriorityChange}>
        <SelectTrigger className="w-36">
          <SelectValue placeholder="All Priorities" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Priorities</SelectItem>
          <SelectItem value="urgent">Urgent</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="standard">Standard</SelectItem>
          <SelectItem value="low">Low</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
