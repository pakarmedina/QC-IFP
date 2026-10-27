"use client";

import { useState } from "react";
import { BarcodeScanner } from "@/components/ui/barcode-scanner";
import { Input } from "@/components/ui/input";

type Props = {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
};

/** Kolom nomor seri dengan tombol pindai barcode. */
export function SerialField({ name, label, value, onChange, error, required }: Props) {
  const [scanning, setScanning] = useState(false);
  return (
    <div>
      <Input
        name={name}
        label={label}
        value={value}
        required={required}
        autoComplete="off"
        autoCapitalize="characters"
        onChange={(e) => onChange(e.target.value)}
        error={error}
      />
      <button
        type="button"
        onClick={() => setScanning(true)}
        className="mt-2 inline-flex min-h-11 items-center rounded-lg bg-white px-4 text-sm font-semibold text-slate-800 ring-1 ring-slate-300 hover:bg-slate-100"
      >
        Pindai barcode
      </button>
      {scanning && (
        <BarcodeScanner
          title="Pindai nomor seri"
          onDetect={(v) => onChange(v.toUpperCase())}
          onClose={() => setScanning(false)}
        />
      )}
    </div>
  );
}
