"use client";

// A submit button that asks for confirmation before running its form's server
// action. Used for destructive actions (e.g. Delete a Journey).
export default function ConfirmSubmit({
  children, message, className,
}: { children: React.ReactNode; message: string; className?: string }) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => { if (!window.confirm(message)) e.preventDefault(); }}
    >
      {children}
    </button>
  );
}
