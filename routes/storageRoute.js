const express = require("express");
const controller = require('../controllers/storageController');

const router = express.Router();

router.get('/sensordata', controller.sensorData);
router.get('/previousDayEnergy',controller.prevDayEnergy);
router.get('/energy-consumption', controller.energyConsumption);
router.get('/realtime-graph',controller.realTimeGraph)
router.get('/daywise-graph/:date',controller.dailyWiseGraph)
router.get('/highest-kva', controller.getHighestKva);
router.get('/sensordatabydate/:date', controller.sensorDataByDate);
router.get('/monthly-energy', controller.getMonthlyEnergyConsumption)

module.exports = router;