export default function SystemHealthPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6" style={{ color: "var(--color-primary)" }}>
        System Health
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <HealthCard title="Webhook" status="awaiting configuration" />
        <HealthCard title="Outbound Queue" status="awaiting configuration" />
        <HealthCard title="WhatsApp API" status="awaiting configuration" />
        <HealthCard title="Database" status="healthy" />
      </div>
    </div>
  );
}

function HealthCard({ title, status }: { title: string; status: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-100 p-6">
      <h3 className="font-semibold mb-2" style={{ color: "var(--color-primary)" }}>
        {title}
      </h3>
      <p className="text-sm text-gray-500">{status}</p>
    </div>
  );
}
