// backend/server.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ---------- In-memory data ----------
let nextOrderId = 1;
let nextTokenNumber = 100; // tokens start from 100
let orders = [];

const menu = [
  { id: 1, name: 'French fries', price: 30, avg_prep: 4 },
  { id: 2, name: 'Pizza', price: 60, avg_prep: 8 },
  { id: 3, name: 'Special pizza', price: 100, avg_prep: 12 },
  { id: 4, name: 'Macroni', price: 30, avg_prep: 6 },
  { id: 5, name: 'Spring roll', price: 30, avg_prep: 5 },
  { id: 6, name: 'Tea', price: 10, avg_prep: 1 },
  { id: 7, name: 'Coffee', price: 20, avg_prep: 2 },
  { id: 8, name: 'Chow Mein', price: 30, avg_prep: 7 },
];

// ---------- Helpers ----------
function computeOrderTotal(items) {
  return items.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function computeEstimatedWaitMinutes(items) {
  // simple heuristic: sum(avg_prep * qty) + 2 minutes per active order
  const base = items.reduce((m, item) => {
    const menuItem = menu.find(m => m.id === item.id) || {};
    const avgPrep = menuItem.avg_prep || item.avg_prep || 5;
    return m + avgPrep * item.qty;
  }, 0);

  const activeCount = orders.filter(
    o => !['COMPLETED', 'CANCELLED'].includes(o.status)
  ).length;

  return Math.round(base + activeCount * 2);
}

// ---------- Routes: Menu ----------
app.get('/menu', (req, res) => {
  res.json(menu);
});

// ---------- Routes: Orders ----------
app.get('/orders/queue-length', (req, res) => {
  const count = orders.filter(
    o => !['COMPLETED', 'CANCELLED'].includes(o.status)
  ).length;
  res.json({ count });
});

// User places order
app.post('/orders', (req, res) => {
  try {
    const { userName, items, type } = req.body; // type: 'NOW' | 'PREBOOK'

    if (!userName || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Invalid order payload' });
    }

    const sanitizedItems = items.map(i => ({
      id: i.id,
      name: i.name,
      price: i.price,
      qty: i.qty,
    }));

    const total = computeOrderTotal(sanitizedItems);
    const estimatedWaitMinutes = computeEstimatedWaitMinutes(sanitizedItems);

    const order = {
      id: nextOrderId++,
      tokenNumber: nextTokenNumber++,
      userName,
      items: sanitizedItems,
      total,
      type: type === 'PREBOOK' ? 'PREBOOK' : 'NOW',
      status: 'PENDING', // PENDING -> ACCEPTED -> PREPARING -> READY -> COMPLETED
      createdAt: new Date().toISOString(),
      estimatedWaitMinutes,
    };

    orders.push(order);

    res.json({
      message: 'Order placed successfully',
      tokenNumber: order.tokenNumber,
      order,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to place order' });
  }
});

// Canteen / dashboard: get orders
// query params:
//   status=PENDING,READY,ALL  (optional)
app.get('/orders', (req, res) => {
  const { status } = req.query;

  let result = orders;

  if (status && status !== 'ALL') {
    result = orders.filter(o => o.status === status);
  }

  // By default show non-completed orders first, newest last
  result = result
    .filter(o => !['COMPLETED', 'CANCELLED'].includes(o.status))
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  res.json(result);
});
// Get single order by ID
app.get('/orders/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const order = orders.find(o => o.id === id);
  if (!order) return res.status(404).json({ error: "Order not found" });
  res.json(order);
});


// Update order status (canteen side)
app.patch('/orders/:id/status', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { status } = req.body;

  const validStatuses = [
    'PENDING',
    'ACCEPTED',
    'PREPARING',
    'READY',
    'COMPLETED',
    'CANCELLED',
  ];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const order = orders.find(o => o.id === id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  order.status = status;
  res.json({ message: 'Status updated', order });
});

// ---------- ML / prediction endpoints ----------

// Stub wait time prediction (you can replace with real ML later)
app.post('/predict/wait-time', (req, res) => {
  const { items } = req.body;
  const minutes = computeEstimatedWaitMinutes(items || []);
  res.json({ minutes });
});

// Real ML crowd prediction (already in your project)
app.get('/predict/crowd', async (req, res) => {
  try {
    const resp = await axios.get('http://localhost:5001/predict/crowd');
    res.json(resp.data);
  } catch (err) {
    console.error('ML service error, returning fallback data');
    res.json({
      hours: ['09:00', '10:00', '11:00', '12:00', '13:00'],
      counts: [20, 40, 70, 100, 60],
      warning: 'ML service offline (fallback data)',
    });
  }
});

// ---------- Start server ----------
app.listen(8000, () => console.log('Backend running on 8000'));
