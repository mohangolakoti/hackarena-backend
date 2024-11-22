const mongoose = require('mongoose');

const energySchema = new mongoose.Schema({
    timestamp: {
        type: Date,
        required: true
    },
    // Meter 1
    Total_KW_meter_1: { type: Number, required: true, default: 0.0 },
    TotalNet_KWH_meter_1: { type: Number, required: true, default: 0.0 },
    Total_KVA_meter_1: { type: Number, required: true, default: 0.0 },
    Avg_PF_meter_1: { type: Number, required: true, default: 0.0 },
    TotalNet_KVAH_meter_1: { type: Number, required: true, default: 0.0 },
    energy_consumption_meter_1: { type: Number, required: true, default: 0.0 },

    // Meter 40
    Total_KW_meter_40: { type: Number, required: true, default: 0.0 },
    TotalNet_KWH_meter_40: { type: Number, required: true, default: 0.0 },
    Total_KVA_meter_40: { type: Number, required: true, default: 0.0 },
    Avg_PF_meter_40: { type: Number, required: true, default: 0.0 },
    TotalNet_KVAH_meter_40: { type: Number, required: true, default: 0.0 },
    energy_consumption_meter_40: { type: Number, required: true, default: 0.0 },

    // Meter 69
    Total_KW_meter_69: { type: Number, required: true, default: 0.0 },
    TotalNet_KWH_meter_69: { type: Number, required: true, default: 0.0 },
    Total_KVA_meter_69: { type: Number, required: true, default: 0.0 },
    Avg_PF_meter_69: { type: Number, required: true, default: 0.0 },
    TotalNet_KVAH_meter_69: { type: Number, required: true, default: 0.0 },
    energy_consumption_meter_69: { type: Number, required: true, default: 0.0 },

    // Meter 41
    Total_KW_meter_41: { type: Number, required: true, default: 0.0 },
    TotalNet_KWH_meter_41: { type: Number, required: true, default: 0.0 },
    Total_KVA_meter_41: { type: Number, required: true, default: 0.0 },
    Avg_PF_meter_41: { type: Number, required: true, default: 0.0 },
    TotalNet_KVAH_meter_41: { type: Number, required: true, default: 0.0 },
    energy_consumption_meter_41: { type: Number, required: true, default: 0.0 }
});

module.exports = mongoose.model('EnergyData', energySchema);
