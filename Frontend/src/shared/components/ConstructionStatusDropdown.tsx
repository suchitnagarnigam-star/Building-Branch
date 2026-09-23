import { useState, useRef, useCallback, useEffect } from "react";
import type { ConstructionStatusType } from "../../types/construction";
import Icon from "./Icon";

type PartlyCompoundableType =
  | "full"
  | "compoundable"
  | "non_compoundable";

type ConstructionStatusDropdownProps = {
  selectedStatus: ConstructionStatusType;
  onStatusChange: (status: ConstructionStatusType) => void;

  selectedPartlyType: PartlyCompoundableType;
  onPartlyTypeChange: (type: PartlyCompoundableType) => void;

  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
};

function ConstructionStatusDropdown({
  selectedStatus,
  onStatusChange,
  selectedPartlyType,
  onPartlyTypeChange,
  isOpen: controlledIsOpen,
  onOpenChange,
}: ConstructionStatusDropdownProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [submenuOpen, setSubmenuOpen] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLDivElement>(null);
  const submenuRef = useRef<HTMLDivElement>(null);

  // Support both controlled and uncontrolled usage.
  const isOpen = controlledIsOpen ?? internalIsOpen;

  const setIsOpen = useCallback(
    (value: boolean) => {
      setInternalIsOpen(value);
      onOpenChange?.(value);
    },
    [onOpenChange],
  );

  // Close the dropdown when clicking outside the entire component.
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSubmenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [setIsOpen]);

  // Close submenu/dropdown using Escape.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      if (submenuOpen) {
        setSubmenuOpen(false);
      } else if (isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, submenuOpen, setIsOpen]);

  // Handle direct top-level status selection.
  const handleSelect = useCallback(
    (status: ConstructionStatusType) => {
      setIsOpen(false);
      setSubmenuOpen(false);
      onStatusChange(status);
    },
    [onStatusChange, setIsOpen],
  );

  // Secondary submenu for Partly Compoundable.
  const renderSubmenu = useCallback(() => {
    if (!isOpen || !submenuOpen) {
      return null;
    }

    const submenuOptions: {
      label: string;
      value: PartlyCompoundableType;
    }[] = [
      { label: "Full", value: "full" },
      { label: "Compoundable", value: "compoundable" },
      { label: "Non-Compoundable", value: "non_compoundable" },
    ];

    return (
      <div
        ref={submenuRef}
        className="status-dropdown-submenu"
        style={{
          position: "absolute",
          top: "-4px",
          left: "calc(100% + 6px)",
          display: "block",
          visibility: "visible",
          opacity: 1,
          zIndex: 9999,
          minWidth: "180px",
          background: "#fff",
        }}
        role="menu"
        aria-orientation="vertical"
        onClick={(e) => e.stopPropagation()}
      >
        {submenuOptions.map((option) => (
          <div
            key={option.value}
            className={`status-dropdown-submenu-option ${
              selectedStatus === "partly_compoundable" && selectedPartlyType === option.value
                ? "selected"
                : ""
            }`}
            role="menuitem"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();

              onStatusChange("partly_compoundable");
              onPartlyTypeChange(option.value);

              setSubmenuOpen(false);
              setIsOpen(false);
            }}
          >
            <span className="status-dropdown-submenu-option-label">
              {option.label}
            </span>
          </div>
        ))}
      </div>
    );
  }, [
    isOpen,
    submenuOpen,
    selectedStatus,
    selectedPartlyType,
    onStatusChange,
    onPartlyTypeChange,
    setIsOpen,
  ]);

  // Main dropdown toggle.
  const renderToggle = useCallback(() => {
    const partlyTypeLabel =
      selectedPartlyType === "full"
        ? "Full"
        : selectedPartlyType === "compoundable"
        ? "Compoundable"
        : "Non-Compoundable";

    const primaryLabel =
      selectedStatus === "compoundable"
        ? "Compoundable"
        : selectedStatus === "non_compoundable"
        ? "Non-Compoundable"
        : selectedStatus === "partly_compoundable"
        ? `Partly Compoundable — ${partlyTypeLabel}`
        : "Construction Status";

    return (
      <div
        ref={toggleRef}
        className={`status-dropdown-toggle ${
          isOpen ? "status-dropdown-toggle--open" : ""
        }`}
        onClick={(event) => {
          event.stopPropagation();

          if (submenuOpen) {
            setSubmenuOpen(false);
          } else if (isOpen) {
            setIsOpen(false);
            setSubmenuOpen(false);
          } else {
            setIsOpen(true);
          }
        }}
        role="button"
        tabIndex={0}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <span className="status-dropdown-label">
          {primaryLabel}
        </span>

        <span className="status-dropdown-chevron">
          <Icon
            name="arrow-right"
            className="status-dropdown-chevron-svg"
          />
        </span>
      </div>
    );
  }, [
    isOpen,
    submenuOpen,
    selectedStatus,
    selectedPartlyType,
    setIsOpen,
  ]);

  // Top-level options.
  const renderTopLevelOptions = useCallback(() => {
    const options = [
      {
        label: "Compoundable",
        value: "compoundable" as const,
      },
      {
        label: "Partly Compoundable",
        value: "partly_compoundable" as const,
        hasSubmenu: true,
      },
      {
        label: "Non-Compoundable",
        value: "non_compoundable" as const,
      },
    ];

    return options.map((option) => (
      <div
        key={option.value}
        className={`status-dropdown-option ${
          option.hasSubmenu ? "has-submenu" : ""
        } ${selectedStatus === option.value ? "selected" : ""}`}
        style={{ position: "relative" }}
        role="button"
        tabIndex={0}
        onClick={(event) => {
          event.stopPropagation();

          if (option.hasSubmenu) {
            setSubmenuOpen((prev) => !prev);
            setIsOpen(true);
          } else {
            handleSelect(option.value);
          }
        }}
      >
        <span className="status-dropdown-option-icon">
          {option.value === "compoundable" && (
            <Icon
              name="check"
              className="status-dropdown-option-icon-check"
            />
          )}

          {(option.value === "partly_compoundable" ||
            option.value === "non_compoundable") && (
            <Icon
              name="folder"
              className="status-dropdown-option-icon-folder"
            />
          )}
        </span>

        <span className="status-dropdown-option-label">
          {option.label}
        </span>

        {option.hasSubmenu && (
          <span className="status-dropdown-option-chevron">
            <Icon
              name="arrow-right"
              className="status-dropdown-option-chevron-svg"
            />
          </span>
        )}

        {option.hasSubmenu && submenuOpen && renderSubmenu()}
      </div>
    ));
  }, [selectedStatus, submenuOpen, handleSelect, renderSubmenu]);

  return (
    <div
      ref={wrapperRef}
      className="status-dropdown-wrapper"
      style={{ position: "relative", display: "inline-block" }}
    >
      {renderToggle()}

      {isOpen && (
        <div
          className="status-dropdown-top-level"
          role="listbox"
          aria-label="Construction Status options"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: "0",
            zIndex: 1000,
            overflow: "visible",
          }}
        >
          {renderTopLevelOptions()}
        </div>
      )}
    </div>
  );
}

export default ConstructionStatusDropdown;

export type {
  ConstructionStatusDropdownProps,
  PartlyCompoundableType,
};