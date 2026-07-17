import app from "./app";
import { envVars } from "./config/envVars";
import { initCronJobs } from "./services/cron.service";

const PORT = envVars.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    // Start background cron scheduler
    initCronJobs();
});