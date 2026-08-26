export default function MessagesPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6" style={{ color: "var(--color-primary)" }}>
        Messages
      </h1>
      <div className="bg-white rounded-lg border border-gray-100 p-6">
        <p className="text-gray-500 text-sm">
          WhatsApp message history. Messages appear here as conversations are processed.
        </p>
      </div>
    </div>
  );
}
