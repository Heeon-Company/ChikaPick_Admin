"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent } from "react";
import { createPortal } from "react-dom";

export type AdminSelectOption<T extends string = string> = {
  label: string;
  value: T;
};

type AdminSelectProps<T extends string> = {
  className?: string;
  disabled?: boolean;
  label: string;
  onChange: (value: T) => void;
  options: readonly AdminSelectOption<T>[];
  renderOptionsInPortal?: boolean;
  required?: boolean;
  value: T;
};

export function AdminSelect<T extends string>({
  className,
  disabled = false,
  label,
  onChange,
  options,
  renderOptionsInPortal = false,
  required = false,
  value,
}: AdminSelectProps<T>) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listboxRef = useRef<HTMLDivElement | null>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [portalStyle, setPortalStyle] = useState<CSSProperties | null>(null);
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const selectedLabel = options[selectedIndex]?.label ?? "";

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (
        rootRef.current &&
        !rootRef.current.contains(target) &&
        !listboxRef.current?.contains(target)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) optionRefs.current[activeIndex]?.focus();
  }, [activeIndex, isOpen]);

  const updatePortalPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger || typeof window === "undefined") return;

    const viewportMargin = 8;
    const panelGap = 7;
    const triggerRect = trigger.getBoundingClientRect();
    const estimatedHeight = Math.min(240, options.length * 36 + 10);
    const availableBelow = Math.max(
      0,
      window.innerHeight - triggerRect.bottom - panelGap - viewportMargin,
    );
    const availableAbove = Math.max(
      0,
      triggerRect.top - panelGap - viewportMargin,
    );
    const openAbove =
      availableBelow < Math.min(estimatedHeight, 120) &&
      availableAbove > availableBelow;
    const availableHeight = openAbove ? availableAbove : availableBelow;
    const panelHeight = Math.min(estimatedHeight, Math.max(72, availableHeight));
    const width = Math.min(
      triggerRect.width,
      window.innerWidth - viewportMargin * 2,
    );
    const left = Math.min(
      Math.max(viewportMargin, triggerRect.left),
      Math.max(viewportMargin, window.innerWidth - width - viewportMargin),
    );

    setPortalStyle({
      top: openAbove
        ? Math.max(viewportMargin, triggerRect.top - panelGap - panelHeight)
        : triggerRect.bottom + panelGap,
      left,
      width,
      maxHeight: panelHeight,
    });
  }, [options.length]);

  useEffect(() => {
    if (!isOpen || !renderOptionsInPortal) return;

    window.addEventListener("resize", updatePortalPosition);
    window.addEventListener("scroll", updatePortalPosition, true);
    return () => {
      window.removeEventListener("resize", updatePortalPosition);
      window.removeEventListener("scroll", updatePortalPosition, true);
    };
  }, [isOpen, renderOptionsInPortal, updatePortalPosition]);

  function openAt(index: number) {
    if (disabled || options.length === 0) return;
    if (renderOptionsInPortal) updatePortalPosition();
    setActiveIndex(index);
    setIsOpen(true);
  }

  function closeAndFocusTrigger() {
    setIsOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      openAt(selectedIndex);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      openAt(selectedIndex);
    } else if (event.key === "Home") {
      event.preventDefault();
      openAt(0);
    } else if (event.key === "End") {
      event.preventDefault();
      openAt(options.length - 1);
    } else if (event.key === "Escape" && isOpen) {
      event.preventDefault();
      setIsOpen(false);
    }
  }

  function handleOptionKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index + 1) % options.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index - 1 + options.length) % options.length);
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(options.length - 1);
    } else if (event.key === "Escape") {
      event.preventDefault();
      closeAndFocusTrigger();
    } else if (event.key === "Tab") {
      setIsOpen(false);
    }
  }

  const optionsList = (
    <div
      aria-label={label}
      className={[
        "admin-select-options",
        renderOptionsInPortal ? "admin-select-options--floating" : null,
      ]
        .filter(Boolean)
        .join(" ")}
      id={listboxId}
      ref={listboxRef}
      role="listbox"
      style={renderOptionsInPortal ? (portalStyle ?? undefined) : undefined}
    >
      {options.map((option, index) => {
        const selected = option.value === value;

        return (
          <button
            aria-selected={selected}
            className={[
              "admin-select-option",
              selected ? "admin-select-option--selected" : null,
            ]
              .filter(Boolean)
              .join(" ")}
            key={`${option.value}:${option.label}`}
            onClick={() => {
              onChange(option.value);
              closeAndFocusTrigger();
            }}
            onKeyDown={(event) => handleOptionKeyDown(event, index)}
            ref={(element) => {
              optionRefs.current[index] = element;
            }}
            role="option"
            type="button"
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <div
      className={["admin-select", className].filter(Boolean).join(" ")}
      ref={rootRef}
    >
      <button
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={`${label}: ${selectedLabel}`}
        aria-required={required || undefined}
        className={[
          "admin-select-button",
          isOpen ? "admin-select-button--open" : null,
        ]
          .filter(Boolean)
          .join(" ")}
        disabled={disabled}
        onClick={() => {
          if (isOpen) {
            setIsOpen(false);
          } else {
            openAt(selectedIndex);
          }
        }}
        onKeyDown={handleTriggerKeyDown}
        ref={triggerRef}
        role="combobox"
        type="button"
      >
        <span>{selectedLabel}</span>
        <ChevronDownIcon />
      </button>
      {isOpen && !disabled
        ? renderOptionsInPortal
          ? portalStyle && typeof document !== "undefined"
            ? createPortal(optionsList, document.body)
            : null
          : optionsList
        : null}
    </div>
  );
}

function ChevronDownIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="m6 9 6 6 6-6"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}
