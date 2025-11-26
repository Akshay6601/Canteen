// frontend/src/pages/CanteenPage.js
import React, { useState, useEffect } from "react";
import "../index.css";

const API = process.env.REACT_APP_API_BASE || "http://localhost:8000";

export default function CanteenPage() {
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Polling
  useEffect(() => {
    const fetchOrders = () => {
      setLoadingOrders(true);

      const url =
        statusFilter === "ALL"
          ? `${API}/orders`
          : `${API}/orders?status=${statusFilter}`;

      fetch(url)
        .then((r) => r.json())
        .then((data) => setOrders(data))
        .finally(() => setLoadingOrders(false));
    };

    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, [statusFilter]);

  async function updateOrderStatus(orderId, status) {
    try {
      const res = await fetch(`${API}/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error();

      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status } : o))
      );
    } catch {
      alert("Status update failed");
    }
  }

  return (
    <div>
      <header className="topbar">
        <div className="topbar-inner">
          <span className="logo">🍽️ Canteen</span>
          <nav className="tabs">
            <a href="/" className="tab">User View</a>
            <a href="/canteen" className="tab tab-active">Canteen View</a>
          </nav>
        </div>
      </header>

      <div className="page">
        <div className="page-header">
          <div>
            <h1 className="brand">Canteen Dashboard</h1>
            <p className="subtitle">Manage orders & call token numbers.</p>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2>Active Orders</h2>

            <div className="filters">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All</option>
                <option value="PENDING">Pending</option>
                <option value="ACCEPTED">Accepted</option>
                <option value="PREPARING">Preparing</option>
                <option value="READY">Ready</option>
              </select>

              {loadingOrders && <span className="pill">Refreshing...</span>}
            </div>
          </div>

          <div className="orders-table-wrapper">
            {orders.length === 0 ? (
              <div className="empty">No active orders.</div>
            ) : (
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Token</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>ETA</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td className="token-cell">#{o.tokenNumber}</td>
                      <td>{o.userName}</td>
                      <td>
                        {o.items.map((i) => `${i.name} × ${i.qty}`).join(", ")}
                      </td>
                      <td>₹{o.total}</td>
                      <td>{o.type}</td>

                      <td>
                        <span className={`status status-${o.status.toLowerCase()}`}>
                          {o.status}
                        </span>
                      </td>

                      <td>{o.estimatedWaitMinutes} min</td>

                      <td className="actions-cell">
                        {o.status === "PENDING" && (
                          <button
                            className="btn btn-secondary btn-xs"
                            onClick={() => updateOrderStatus(o.id, "ACCEPTED")}
                          >
                            Accept
                          </button>
                        )}

                        {["PENDING", "ACCEPTED"].includes(o.status) && (
                          <button
                            className="btn btn-secondary btn-xs"
                            onClick={() => updateOrderStatus(o.id, "PREPARING")}
                          >
                            Preparing
                          </button>
                        )}

                        {["PREPARING", "ACCEPTED"].includes(o.status) && (
                          <button
                            className="btn btn-primary btn-xs"
                            onClick={() => updateOrderStatus(o.id, "READY")}
                          >
                            Ready
                          </button>
                        )}

                        {o.status === "READY" && (
                          <button
                            className="btn btn-ghost btn-xs"
                            onClick={() => updateOrderStatus(o.id, "COMPLETED")}
                          >
                            Done
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
