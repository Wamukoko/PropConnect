export default function LeadsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6" style={{ color: "var(--color-primary)" }}>
        Leads
      </h1>
      <div className="bg-white rounded-lg border border-gray-100 p-6">
        <p className="text-gray-500 text-sm">
          Lead management. Leads are created automatically from WhatsApp conversations.
        </p>
      </div>
    </div>
  );
}
