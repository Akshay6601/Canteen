from flask import Flask, jsonify, request
from datetime import datetime, timedelta
app = Flask(__name__)

@app.route('/predict/crowd')
def predict_crowd():
    now = datetime.now()
    hours = [(now + timedelta(hours=i)).strftime('%H:00') for i in range(1,8)]
    counts = [20,35,60,80,95,60,30]
    return jsonify({'hours': hours, 'counts': counts})

@app.route('/predict/prep-time', methods=['POST'])
def predict_prep():
    payload = request.json
    items = payload.get('items', [])
    avg_lookup = {str(i['id']): i.get('avg_prep',300) for i in payload.get('menu',[])}
    total = 0
    for it in items:
        aid = str(it.get('item_id'))
        qty = it.get('qty',1)
        total += avg_lookup.get(aid,300) * qty
    return jsonify({'pred_seconds': total})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)
