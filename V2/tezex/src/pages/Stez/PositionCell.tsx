import React, { FC } from "react";

interface PositionCellProps {
  label: string;
  value: string;
  exactValue?: string;
  note: string;
  positive?: boolean;
  icon: React.ReactNode;
}

export const PositionCell: FC<PositionCellProps> = ({
  label,
  value,
  exactValue,
  note,
  positive,
  icon,
}) => (
  <div className="stez-position-cell">
    <div className="stez-position-cell__label">
      <span aria-hidden="true">{icon}</span>
      {label}
    </div>
    <strong className={positive ? "is-positive" : undefined}>{value}</strong>
    <div className="stez-position-cell__note">
      <small>{note}</small>
      {exactValue && (
        <details className="stez-position-cell__precision">
          <summary aria-label={`Exact amount for ${label.toLowerCase()}`}>
            Exact amount
          </summary>
          <span>{exactValue}</span>
        </details>
      )}
    </div>
  </div>
);
