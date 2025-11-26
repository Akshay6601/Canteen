// frontend/src/pages/UserPage.js
import React, { useState, useEffect } from "react";
import { Line } from "react-chartjs-2";
import "chart.js/auto";
import "../index.css";

const API = process.env.REACT_APP_API_BASE || "http://localhost:8000";

const defaultMenu = [
  { id: 1, name: "French fries", price: 30, avg_prep: 4 },
  { id: 2, name: "Pizza", price: 60, avg_prep: 8 },
  { id: 3, name: "Special pizza", price: 100, avg_prep: 12 },
  { id: 4, name: "Macroni", price: 30, avg_prep: 6 },
  { id: 5, name: "Spring roll", price: 30, avg_prep: 5 },
  { id: 6, name: "Tea", price: 10, avg_prep: 1 },
  { id: 7, name: "Coffee", price: 20, avg_prep: 2 },
  { id: 8, name: "Chow Mein", price: 30, avg_prep: 7 },
];

export default function UserPage() {
  const [menu, setMenu] = useState(defaultMenu);
  const [cart, setCart] = useState([]);
  const [name, setName] = useState("");
  const [queueLength, setQueueLength] = useState(0);
  const [expectedWait, setExpectedWait] = useState(0);
  const [placing, setPlacing] = useState(false);
  const [lastToken, setLastToken] = useState(
    localStorage.getItem("lastToken") || null
  );
  const [lastOrderId, setLastOrderId] = useState(
    localStorage.getItem("lastOrderId") || null
  );
  const [crowdData, setCrowdData] = useState({ hours: [], counts: [] });

  const [notification, setNotification] = useState(null);

  // ---------- Initial Data Fetch ----------
  useEffect(() => {
    fetch(API + "/menu")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setMenu(data))
      .catch(() => setMenu(defaultMenu));

    fetch(API + "/orders/queue-length")
      .then((r) => r.json())
      .then((d) => setQueueLength(d.count))
      .catch(() => {});

    fetch(API + "/predict/crowd")
      .then((r) => r.json())
      .then((d) => setCrowdData({ hours: d.hours, counts: d.counts }))
      .catch(() =>
        setCrowdData({
          hours: ["9", "10", "11", "12", "13"],
          counts: [20, 35, 60, 80, 95],
        })
      );
  }, []);

  // ---------- Poll for READY notification ----------
  useEffect(() => {
    if (!lastOrderId) return;

    const interval = setInterval(() => {
      fetch(`${API}/orders/${lastOrderId}`)
        .then((r) => r.json())
        .then((order) => {
          if (order.status === "READY") {
            setNotification(`Your order #${order.tokenNumber} is READY!`);
            localStorage.removeItem("lastOrderId");
            localStorage.removeItem("lastToken");
            setLastOrderId(null);
            setLastToken(null);
          }
        });
    }, 8000);

    return () => clearInterval(interval);
  }, [lastOrderId]);

  // ---------- Cart Handling ----------
  function addToCart(item) {
    setCart((prev) => {
      const existing = prev.find((p) => p.id === item.id);
      if (existing) {
        return prev.map((p) =>
          p.id === item.id ? { ...p, qty: p.qty + 1 } : p
        );
      }
      return [...prev, { ...item, qty: 1 }];
    });
  }

  function removeFromCart(id) {
    setCart((prev) => prev.filter((p) => p.id !== id));
  }

  // ---------- Wait Time ----------
  useEffect(() => {
    if (cart.length === 0) return setExpectedWait(0);
    const base = cart.reduce((m, item) => m + item.avg_prep * item.qty, 0);
    setExpectedWait(Math.round(base + queueLength * 2));
  }, [cart, queueLength]);

  const cartTotal = cart.reduce((s, c) => s + c.price * c.qty, 0);

  // ---------- Place Order ----------
  async function placeOrder(immediate = true) {
    if (!name.trim()) return alert("Enter your name");
    if (cart.length === 0) return alert("Cart empty");

    setPlacing(true);

    try {
      const payload = {
        userName: name.trim(),
        items: cart.map((c) => ({
          id: c.id,
          name: c.name,
          price: c.price,
          qty: c.qty,
        })),
        type: immediate ? "NOW" : "PREBOOK",
      };

      const res = await fetch(API + "/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      setLastToken(data.order.tokenNumber);
      setLastOrderId(data.order.id);

      localStorage.setItem("lastToken", data.order.tokenNumber);
      localStorage.setItem("lastOrderId", data.order.id);

      setCart([]);

      fetch(API + "/orders/queue-length")
        .then((r) => r.json())
        .then((d) => setQueueLength(d.count));
    } catch (err) {
      alert("Order failed");
    }

    setPlacing(false);
  }

  // ---------- UI ----------
  const lineData =
    crowdData.hours.length > 0
      ? {
          labels: crowdData.hours,
          datasets: [
            {
              label: "Expected crowd",
              data: crowdData.counts,
              tension: 0.3,
            },
          ],
        }
      : null;

  return (
    <div>
      <header className="topbar">
        <div className="topbar-inner">
          <span className="logo">🍽️ Canteen</span>
          <nav className="tabs">
            <a href="/" className="tab tab-active">User View</a>
            <a href="/canteen" className="tab">Canteen View</a>
          </nav>
        </div>
      </header>

      <div className="page">
        {notification && (
          <div className="card" style={{ background: "#fef3c7", border: "1px solid #fcd34d" }}>
            <h3>🔔 {notification}</h3>
          </div>
        )}

        <div className="page-header">
          <div>
            <h1 className="brand">Campus Canteen</h1>
            <p className="subtitle">Order, grab your token & pick up easily.</p>
          </div>

          <div className="token-badge">
            {lastToken ? (
              <>
                <span>Your token</span>
                <strong>#{lastToken}</strong>
              </>
            ) : (
              <span>No active token</span>
            )}
          </div>
        </div>

        <div className="layout">
          {/* LEFT SIDE */}
          <div className="card card-left">
            <div className="card-header">
              <h2>Menu</h2>
              <span className="pill">Queue: {queueLength}</span>
            </div>

            <div className="menu-list">
              {menu.map((item) => (
                <div key={item.id} className="menu-item">
                  <div>
                    <div className="menu-name">{item.name}</div>
                    <div className="menu-meta">
                      ₹{item.price} • ~{item.avg_prep} min
                    </div>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={() => addToCart(item)}>
                    + Add
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT SIDE */}
          <div className="right-column">
            <div className="card">
              <div className="card-header">
                <h2>Your Order</h2>
              </div>

              <div className="form-row">
                <label>Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                />
              </div>

              <div className="cart-list">
                {cart.length === 0 ? (
                  <div className="empty">No items added yet.</div>
                ) : (
                  cart.map((c) => (
                    <div key={c.id} className="cart-item">
                      <div>
                        <div className="cart-name">{c.name}</div>
                        <div className="cart-meta">
                          ₹{c.price} × {c.qty}
                        </div>
                      </div>

                      <div className="cart-actions">
                        <span className="cart-total">₹{c.price * c.qty}</span>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => removeFromCart(c.id)}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="summary-row">
                <span>Total</span>
                <strong>₹{cartTotal}</strong>
              </div>
              <div className="summary-row">
                <span>Estimated wait</span>
                <strong>{expectedWait} min</strong>
              </div>

              <div className="actions-row">
                <button
                  className="btn btn-primary"
                  disabled={placing || cart.length === 0}
                  onClick={() => placeOrder(true)}
                >
                  {placing ? "Placing…" : "Place Now (Get Token)"}
                </button>
                <button
                  className="btn btn-secondary"
                  disabled={placing || cart.length === 0}
                  onClick={() => placeOrder(false)}
                >
                  Prebook
                </button>
              </div>

              {lastToken && (
                <div className="token-display">
                  Show this token at the counter:
                  <div className="big-token">#{lastToken}</div>
                </div>
              )}
            </div>

            <div className="card">
              <div className="card-header">
                <h2>Crowd Prediction</h2>
              </div>

              {lineData ? <Line data={lineData} /> : <div className="empty">No prediction data</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
