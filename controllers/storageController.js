const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const { format, subDays, startOfDay, endOfDay, addSeconds } = require('date-fns');
const dotEnv = require('dotenv');
dotEnv.config();
const app = express();
app.use(cors());
app.use(bodyParser.json());

const EnergyData = require('../models/energyData'); // Assuming EnergyData model is exported correctly

const sensorData = async (req, res) => {
    try {
        const latestData = await EnergyData.findOne().sort({ timestamp: -1 });
        res.json(latestData);
    } catch (error) {
        res.status(500).json({ error: "Error fetching latest sensor data" });
    }
};

const energyConsumption = async (req, res) => {
    try {
        const dates = Array.from({ length: 7 }, (_, i) =>
            subDays(new Date(), 6 - i)
        );

        // Array to store energy data for each day
        const energyData = await Promise.all(
            dates.map(async (date) => {
                const start = startOfDay(date);
                const end = endOfDay(date);

                // Find the most recent record for this day
                const record = await EnergyData.findOne({
                    timestamp: { $gte: start, $lte: end },
                })
                    .sort({ timestamp: -1 })
                    .select(
                        "TotalNet_KWH_meter_70 energy_consumption_meter_69 energy_consumption_meter_41 energy_consumption_meter_40 timestamp"
                    );

                if (record) {
                    return {
                        date: format(record.timestamp, "yyyy-MM-dd"),
                        energy:
                            (record.energy_consumption_meter_70 || 0) +
                            (record.energy_consumption_meter_69 || 0) +
                            (record.energy_consumption_meter_41 || 0) +
                            (record.energy_consumption_meter_40 || 0),
                    };
                } else {
                    // No record found for this date
                    return { date: format(date, "yyyy-MM-dd"), energy: 0 };
                }
            })
        );

        res.status(200).json(energyData);
    } catch (error) {
        console.error("Error fetching energy values:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};


const realTimeGraph = async (req, res) => {
    const today = new Date();
    const start = startOfDay(today);
    const end = today;

    try {
        const data = await EnergyData.find({
            timestamp: { $gte: start, $lte: end }
        }).sort({ timestamp: 1 });

        res.json(data);
    } catch (error) {
        console.error('Error fetching power data:', error);
        res.status(500).send('Error fetching power data');
    }
};

const dailyWiseGraph = async (req, res) => {
    const date = req.params.date;

    // Convert to IST by adding 5 hours 30 minutes
    const startUTC = startOfDay(new Date(date));
    const endUTC = endOfDay(new Date(date));

    const startIST = addSeconds(startUTC, 19800);
    const endIST = addSeconds(endUTC, 19800);

    try {
        const data = await EnergyData.find({
            timestamp: { $gte: startIST, $lte: endIST }
        }).sort({ timestamp: 1 });

        res.json(data);
    } catch (error) {
        console.error('Error fetching power data:', error);
        res.status(500).send('Error fetching power data');
    }
};

const prevDayEnergy = async (req, res) => {
    try {
        const yesterday = subDays(new Date(), 1);
        const today = new Date();

        const previousDayRecord = await EnergyData.findOne({
            timestamp: {
                $gte: startOfDay(yesterday),
                $lte: endOfDay(yesterday)
            }
        }).sort({ timestamp: -1 });

        const todayFirstRecord = await EnergyData.findOne({
            timestamp: { $gte: startOfDay(today) }
        }).sort({ timestamp: 1 });

        let initialEnergyValues = {
            meter_70: null,
            meter_40: null,
            meter_69: null,
            meter_41: null,
        };

        if (previousDayRecord) {
            initialEnergyValues = {
                meter_70: previousDayRecord.TotalNet_KWH_meter_70,
                meter_40: previousDayRecord.TotalNet_KWH_meter_40,
                meter_69: previousDayRecord.TotalNet_KWH_meter_69,
                meter_41: previousDayRecord.TotalNet_KWH_meter_41,
            };
        } else if (todayFirstRecord) {
            initialEnergyValues = {
                meter_70: todayFirstRecord.TotalNet_KWH_meter_70,
                meter_40: todayFirstRecord.TotalNet_KWH_meter_40,
                meter_69: todayFirstRecord.TotalNet_KWH_meter_69,
                meter_41: todayFirstRecord.TotalNet_KWH_meter_41,
            };
        }

        res.status(200).json({ initialEnergyValues });
    } catch (error) {
        console.error("Error fetching previous day's energy values:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const getHighestKva = async (req, res) => {
    try {
        const today = new Date();

        const highestKvaToday = await EnergyData.aggregate([
            {
                $match: {
                    timestamp: {
                        $gte: startOfDay(today),
                        $lte: today
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    highest_kva_today: { $max: { $add: ["$Total_KVA_meter_70", "$Total_KVA_meter_40", "$Total_KVA_meter_69"] } }
                }
            }
        ]);

        const highestKvaMonth = await EnergyData.aggregate([
            {
                $match: {
                    timestamp: {
                        $gte: startOfDay(new Date(today.getFullYear(), today.getMonth(), 1)),
                        $lte: today
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    highest_kva_month: { $max: { $add: ["$Total_KVA_meter_70", "$Total_KVA_meter_40", "$Total_KVA_meter_69"] } }
                }
            }
        ]);

        res.status(200).json({
            highestKvaToday: highestKvaToday[0]?.highest_kva_today || 0,
            highestKvaMonth: highestKvaMonth[0]?.highest_kva_month || 0,
        });
    } catch (error) {
        console.error('Error fetching highest KVA values:', error);
        res.status(500).json({ error: "Internal server error" });
    }
};

const sensorDataByDate = async (req, res) => {
    const { date } = req.params;

    try {
        const data = await EnergyData.find({
            timestamp: {
                $gte: startOfDay(new Date(date)),
                $lte: endOfDay(new Date(date))
            }
        });

        if (data.length === 0) {
            return res.status(404).json({ message: "No data found for the selected date." });
        }

        res.json(data);
    } catch (error) {
        console.error('Error fetching sensor data:', error);
        res.status(500).json({ error: "Error fetching sensor data" });
    }
};

const getMonthlyEnergyConsumption = async (req, res) => {
    try {
      // Get the current date
      const currentDate = new Date();
  
      // Calculate the first day of the current month
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  
      // Aggregate the total energy consumption for each meter in the current month
      const monthlyData = await EnergyData.aggregate([
        {
          $match: {
            timestamp: { $gte: startOfMonth }
          }
        },
        {
          $group: {
            _id: null,
            totalEnergyConsumptionMeter70: { $sum: "$energy_consumption_meter_70" },
            totalEnergyConsumptionMeter69: { $sum: "$energy_consumption_meter_69" },
            totalEnergyConsumptionMeter40: { $sum: "$energy_consumption_meter_40" }
          }
        }
      ]);
  
      if (monthlyData.length === 0) {
        return res.status(404).json({ error: "No data found for the current month" });
      }
  
      // Calculate the overall total energy consumption for the month
      const totalEnergyConsumption =
        monthlyData[0].totalEnergyConsumptionMeter70 +
        monthlyData[0].totalEnergyConsumptionMeter69 +
        monthlyData[0].totalEnergyConsumptionMeter40;
  
      // Respond with the total energy consumption for the current month
      const response = {
        totalEnergyConsumptionMeter70: monthlyData[0].totalEnergyConsumptionMeter70,
        totalEnergyConsumptionMeter69: monthlyData[0].totalEnergyConsumptionMeter69,
        totalEnergyConsumptionMeter40: monthlyData[0].totalEnergyConsumptionMeter40,
        totalEnergyConsumption
      };
  
      res.json(response);
    } catch (error) {
      res.status(500).json({ error: "Error fetching monthly energy consumption data" });
    }
  };
  

module.exports = { sensorData, realTimeGraph, dailyWiseGraph, prevDayEnergy, energyConsumption, getHighestKva, sensorDataByDate, getMonthlyEnergyConsumption };
