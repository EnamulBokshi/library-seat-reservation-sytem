"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const envVars_1 = require("./config/envVars");
const cron_service_1 = require("./services/cron.service");
const PORT = envVars_1.envVars.PORT || 5000;
app_1.default.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    // Start background cron scheduler
    (0, cron_service_1.initCronJobs)();
});
