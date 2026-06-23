/** Shared field styles aligned with the PayNexa UI kit. */
export const fieldLabel =
  "block text-sm font-medium text-gray-700 mb-2 tracking-tight";

export const fieldInput =
  "w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 " +
  "focus:ring-2 focus:ring-primaryColorBlack focus:border-transparent outline-none transition shadow-sm";

/** Chevron via `.field-select-chevron` in globals.css (avoids Tailwind arbitrary url() issues). */
export const fieldSelect = `${fieldInput} !pr-9 field-select-chevron appearance-none`;

export const cardPanel =
  "rounded-2xl border border-gray-100 bg-white/95 shadow-xl shadow-gray-200/40 backdrop-blur-sm";
