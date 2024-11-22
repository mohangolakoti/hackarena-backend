const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const dotEnv = require("dotenv");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { format } = require("date-fns");
const app = express();
const sensorDataRoutes = require("./routes/energydataRoute");
const storageRoutes = require("./routes/storageRoute");
const EnergyData = require("./models/energyData");

dotEnv.config();

app.use(cors());
app.use(bodyParser.json());

const port = process.env.PORT || 4000;

mongoose.set("strictQuery", false);
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("Error connecting to MongoDB:", err);
  });

app.use("/api", sensorDataRoutes);
app.use("/api1", storageRoutes);


let initialEnergyValue = null;
let firstStoredEnergyValue = null;
let isFirstDataStoredToday = false;

// Function to initialize the energy value from previous day's data
async function initializeInitialEnergyValue() {
  try {
    console.log("Initializing initial energy value...");

    const yesterday = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd');
    const today = format(new Date(), 'yyyy-MM-dd');

    // Fetch previous day's last data
    const previousDayData = await EnergyData.findOne({
      timestamp: {
        $gte: new Date(yesterday),
        $lt: new Date(today)
      }
    }).sort({ timestamp: -1 });

    if (previousDayData) {
      initialEnergyValue = {
        meter1: previousDayData.TotalNet_KWH_meter_1,
        meter40: previousDayData.TotalNet_KWH_meter_40,
        meter69: previousDayData.TotalNet_KWH_meter_69,
        meter41: previousDayData.TotalNet_KWH_meter_41,
      };
      console.log("Initial energy value stored from previous day:", initialEnergyValue);
    } else {
      console.log("No data found for the previous day. Fetching today's first record.");
      const todayFirstRecord = await EnergyData.findOne({
        timestamp: {
          $gte: new Date(today)
        }
      }).sort({ timestamp: 1 });

      if (todayFirstRecord) {
        initialEnergyValue = {
          meter1: todayFirstRecord.TotalNet_KWH_meter_1,
          meter40: todayFirstRecord.TotalNet_KWH_meter_40,
          meter69: todayFirstRecord.TotalNet_KWH_meter_69,
          meter41: todayFirstRecord.TotalNet_KWH_meter_41,
        };
        console.log("Initial energy value set to today's first record:", initialEnergyValue);
      } else {
        console.log("No data found for today yet.");
      }
    }
  } catch (error) {
    console.error("Error initializing initial energy value:", error);
  }
}

// Function to fetch data from the API and store it in the database
async function fetchDataAndStore() {
  try {
    console.log("Fetching and storing sensor data...");
    const response = await axios.get("http://localhost:4000/api/sensordata");
    const newData = response.data[0];

    // If no initial energy value has been set, set it to the current values
    if (initialEnergyValue === null) {
      initialEnergyValue = {
        meter1: newData.TotalNet_KWH_meter_1,
        meter40: newData.TotalNet_KWH_meter_40,
        meter69: newData.TotalNet_KWH_meter_69,
        meter41: newData.TotalNet_KWH_meter_41,
      };
      console.log("Setting initial energy value to the current value:", initialEnergyValue);
    }

    const energyConsumption = {
      meter1: newData.TotalNet_KWH_meter_1 - initialEnergyValue.meter1,
      meter40: newData.TotalNet_KWH_meter_40 - initialEnergyValue.meter40,
      meter69: newData.TotalNet_KWH_meter_69 - initialEnergyValue.meter69,
      meter41: newData.TotalNet_KWH_meter_41 - initialEnergyValue.meter41,
    };

    // Create a new record for energy data
    const newEnergyData = new EnergyData({
      timestamp: new Date(),
      Total_KW_meter_1: newData.Total_KW_meter_1,
      TotalNet_KWH_meter_1: newData.TotalNet_KWH_meter_1,
      Total_KVA_meter_1: newData.Total_KVA_meter_1,
      Avg_PF_meter_1: newData.Avg_PF_meter_1,
      TotalNet_KVAH_meter_1: newData.TotalNet_KVAH_meter_1,

      Total_KW_meter_40: newData.Total_KW_meter_40,
      TotalNet_KWH_meter_40: newData.TotalNet_KWH_meter_40,
      Total_KVA_meter_40: newData.Total_KVA_meter_40,
      Avg_PF_meter_40: newData.Avg_PF_meter_40,
      TotalNet_KVAH_meter_40: newData.TotalNet_KVAH_meter_40,

      Total_KW_meter_69: newData.Total_KW_meter_69,
      TotalNet_KWH_meter_69: newData.TotalNet_KWH_meter_69,
      Total_KVA_meter_69: newData.Total_KVA_meter_69,
      Avg_PF_meter_69: newData.Avg_PF_meter_69,
      TotalNet_KVAH_meter_69: newData.TotalNet_KVAH_meter_69,

      Total_KW_meter_41: newData.Total_KW_meter_41,
      TotalNet_KWH_meter_41: newData.TotalNet_KWH_meter_41,
      Total_KVA_meter_41: newData.Total_KVA_meter_41,
      Avg_PF_meter_41: newData.Avg_PF_meter_41,
      TotalNet_KVAH_meter_41: newData.TotalNet_KVAH_meter_41,

      energy_consumption_meter_1: energyConsumption.meter1,
      energy_consumption_meter_40: energyConsumption.meter40,
      energy_consumption_meter_69: energyConsumption.meter69,
      energy_consumption_meter_41: energyConsumption.meter41
    });

    await newEnergyData.save();
    console.log("Sensor data stored successfully:", newEnergyData);

    // Store the first energy value for today
    if (!isFirstDataStoredToday) {
      firstStoredEnergyValue = {
        meter1: newData.TotalNet_KWH_meter_1,
        meter40: newData.TotalNet_KWH_meter_40,
        meter69: newData.TotalNet_KWH_meter_69,
        meter41: newData.TotalNet_KWH_meter_41,
      };
      isFirstDataStoredToday = true;
      console.log("First stored energy value for today:", firstStoredEnergyValue);
    }

    const currentDate = format(new Date(), 'yyyy-MM-dd');
    const fileName = `VITB_${currentDate}.txt`;
    const filePath = path.join(__dirname, "VIT-Data", fileName);

    appendDataToFile(newData, filePath);
  } catch (error) {
    console.error("Error fetching and storing sensor data:", error);
  }
}

// Function to append data to the file
async function appendDataToFile(data, filePath) {
  try {
    console.log("Appending data to file:", filePath);
    const fileContent = `${format(new Date(), 'yyyy-MM-dd HH:mm:ss')},${data.Total_KW_meter_1},${data.TotalNet_KWH_meter_1},${data.Total_KVA_meter_1},${data.Avg_PF_meter_1},${data.TotalNet_KVAH_meter_1},${data.Total_KW_meter_40},${data.TotalNet_KWH_meter_40},${data.Total_KVA_meter_40},${data.Avg_PF_meter_40},${data.TotalNet_KVAH_meter_40},${data.Total_KW_meter_69},${data.TotalNet_KWH_meter_69},${data.Total_KVA_meter_69},${data.Avg_PF_meter_69},${data.TotalNet_KVAH_meter_69},${data.Total_KW_meter_41},${data.TotalNet_KWH_meter_41},${data.Total_KVA_meter_41},${data.Avg_PF_meter_41},${data.TotalNet_KVAH_meter_41}\n`;
    fs.appendFile(filePath, fileContent, (error) => {
      if (error) {
        console.error("Error appending data to file:", error);
      } else {
        console.log("Data appended to file successfully:", filePath);
      }
    });
  } catch (error) {
    console.error("Error appending data to file:", error);
  }
}

// Set intervals to initialize and fetch data every 10 minutes
setInterval(initializeInitialEnergyValue, 10 * 60000);
setInterval(fetchDataAndStore, 10 * 60000);

app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
