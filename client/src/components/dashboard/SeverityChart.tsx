import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface SeverityChartProps {
  severityBreakdown: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export function SeverityChart({ severityBreakdown }: SeverityChartProps) {
  const data = [
    { name: "Critical", value: severityBreakdown?.critical || 0, color: "hsl(0, 84%, 60%)" },
    { name: "High", value: severityBreakdown?.high || 0, color: "hsl(15, 90%, 55%)" },
    { name: "Medium", value: severityBreakdown?.medium || 0, color: "hsl(38, 92%, 50%)" },
    { name: "Low", value: severityBreakdown?.low || 0, color: "hsl(142, 76%, 45%)" },
  ].filter((item) => item.value > 0); // Only show severities with vulnerabilities

  const total = data.reduce((sum, item) => sum + item.value, 0);

  // If no vulnerabilities, show empty state
  if (total === 0) {
    return (
      <div className="p-6 rounded-2xl glass">
        <h3 className="text-lg font-semibold mb-4">Severity Distribution</h3>
        <div className="h-64 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p>No vulnerabilities found</p>
            <p className="text-sm mt-2">Start scanning to see vulnerability distribution</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-2xl glass">
      <h3 className="text-lg font-semibold mb-4">Severity Distribution</h3>
      <div className="h-64 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={4}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(222, 47%, 8%)",
                border: "1px solid hsl(222, 30%, 18%)",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "hsl(210, 40%, 98%)" }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="text-3xl font-bold">{total}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-4">
        {data.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-sm text-muted-foreground">{item.name}</span>
            <span className="text-sm font-medium ml-auto">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
