type FormInputProps = {
  label: string;
  type?: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
};

export default function FormInput({ label, type = 'text', value, onChange, placeholder, required = false }: FormInputProps) {
  return (
    <label className="flex w-full flex-col gap-2 text-sm text-slate-200">
      <span className="font-medium text-slate-300">{label}</span>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="rounded-2xl border border-slate-700/80 bg-slate-900/80 px-4 py-3 text-slate-100 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
      />
    </label>
  );
}
