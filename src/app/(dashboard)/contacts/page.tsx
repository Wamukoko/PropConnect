export default function ContactsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6" style={{ color: "var(--color-primary)" }}>
        Contacts
      </h1>
      <div className="bg-white rounded-lg border border-gray-100 p-6">
        <p className="text-gray-500 text-sm">
          Contact directory. Import contacts via CSV or VCF to get started.
        </p>
      </div>
    </div>
  );
}
