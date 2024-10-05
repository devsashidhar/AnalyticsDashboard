from flask import Flask, jsonify, request
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import pandas as pd
import yfinance as yf
from sklearn.linear_model import LinearRegression
import numpy as np
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes
socketio = SocketIO(app, cors_allowed_origins="http://localhost:3000")

# Fetch stock data for the specified symbol
def get_stock_data(symbol='AAPL'):
    stock = yf.Ticker(symbol)
    hist = stock.history(period="1mo")  # Get 1 month of data
    hist.reset_index(inplace=True)
    hist['Date'] = hist['Date'].astype(str)  # Convert Pandas Timestamp to string
    stock_data = hist[['Date', 'Close']].rename(columns={'Close': 'price'})
    print(f"Fetched stock data for {symbol}:", stock_data)  # Log fetched stock data
    return stock_data

# Predict stock prices for future dates
def predict_stock_trend(data):
    X = np.array(range(len(data))).reshape(-1, 1)  # Day index
    y = np.array(data['price']).reshape(-1, 1)

    model = LinearRegression().fit(X, y)
    future_days = 10
    future_X = np.array(range(len(data), len(data) + future_days)).reshape(-1, 1)
    predictions = model.predict(future_X)

    future_dates = [(datetime.now() + pd.Timedelta(days=i)).strftime('%Y-%m-%d') for i in range(future_days)]
    result = [{'date': future_dates[i], 'predicted_price': p[0]} for i, p in enumerate(predictions)]
    print("Predicted data:", result)  # Log predicted data
    return result

# API endpoint to serve stock data based on a query parameter
@app.route('/api/stocks', methods=['GET'])
def stocks():
    symbol = request.args.get('symbol', 'AAPL')  # Default to AAPL if no symbol is provided
    stock_data = get_stock_data(symbol)
    stock_data_json = stock_data.to_dict(orient='records')
    return jsonify(stock_data_json)

# Real-time data updates with sockets for dynamic symbols
@socketio.on('connect')
def handle_connect():
    symbol = request.args.get('symbol', 'AAPL')  # Get the symbol from the client (default to AAPL)
    stock_data = get_stock_data(symbol)
    predictions = predict_stock_trend(stock_data)
    
    emit('stock_update', stock_data.to_dict(orient='records'))  # Send stock data to client
    emit('predictions', predictions)  # Send predictions to client

if __name__ == '__main__':
    socketio.run(app, debug=True)
