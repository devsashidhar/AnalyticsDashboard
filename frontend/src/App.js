import React, { useEffect, useState } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const socket = io.connect('http://localhost:5000');  // Connect to backend

function App() {
  const [stockData, setStockData] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [symbol, setSymbol] = useState('AAPL');  // Default to AAPL (Apple)

  const fetchStockData = (ticker) => {
    axios.get(`http://localhost:5000/api/stocks?symbol=${ticker}`)
      .then(response => {
        setStockData(response.data);
        console.log("Fetched stock data:", response.data);
      })
      .catch(error => {
        console.error("Error fetching stock data:", error);
      });
  };

  useEffect(() => {
    fetchStockData(symbol);  // Fetch stock data for the default or input symbol

    socket.on('stock_update', data => {
      setStockData(data);
      console.log("Real-time stock update:", data);
    });

    socket.on('predictions', data => {
      setPredictions(data);
      console.log("Real-time predictions:", data);
    });
  }, [symbol]);

  // Helper function to generate future dates (using native JS)
  const generateFutureDates = (startDate, numDays) => {
    const futureDates = [];
    const currentDate = new Date(startDate);
    for (let i = 1; i <= numDays; i++) {
      const futureDate = new Date(currentDate);
      futureDate.setDate(futureDate.getDate() + i);
      futureDates.push(futureDate.toISOString().split('T')[0]);  // Format as YYYY-MM-DD
    }
    return futureDates;
  };

  const lastStockDate = stockData.length > 0 ? stockData[stockData.length - 1].Date : null;
  const futureDates = lastStockDate ? generateFutureDates(lastStockDate, predictions.length) : [];

  // Prepare labels and data for chart
  const historicalLabels = stockData.map(item => item.Date ? item.Date.split(' ')[0] : '');
  const allLabels = [...historicalLabels, ...futureDates];  // Combine historical and future labels

  const data = {
    labels: allLabels,  // Use combined labels
    datasets: [
      {
        label: 'Stock Price',
        data: stockData.map(item => item.price),  // Historical data points
        borderColor: 'rgba(75,192,192,1)',
        fill: false,
      },
      {
        label: 'Predicted Price',
        data: [...new Array(stockData.length).fill(null), ...predictions.map(item => item.predicted_price)],  // Null for past dates, actual data for future
        borderColor: 'rgba(255,99,132,1)',
        fill: false,
      },
    ],
  };

  const options = {
    scales: {
      x: {
        title: {
          display: true,
          text: 'Date',
        },
        ticks: {
          autoSkip: false,
          maxRotation: 45,
          minRotation: 0,
        },
      },
      y: {
        title: {
          display: true,
          text: 'Price (USD)',
        },
        ticks: {
          beginAtZero: false,
        },
      },
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
      },
    },
    responsive: true,
    maintainAspectRatio: false,
  };

  return (
    <div className="App">
      <h1>Stock Market Dashboard</h1>
      <input
        type="text"
        placeholder="Enter Stock Symbol"
        value={symbol}
        onChange={e => setSymbol(e.target.value.toUpperCase())}
      />
      <button onClick={() => fetchStockData(symbol)}>Search</button>
      
      <div style={{ height: "500px" }}>
        <Line data={data} options={options} />
      </div>
    </div>
  );
}

export default App;
