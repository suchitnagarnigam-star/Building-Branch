import { statusConfig } from "../constants/navigation";
import type { Status } from "../types";

type StatusBadgeProps = {
  status: Status;
};

function StatusBadge({ status }: StatusBadgeProps) {
  const { tone } = statusConfig[status];
  return <span className={`status-badge status-badge--${tone}`}>{status}</span>;
}

export default StatusBadge;
